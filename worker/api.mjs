// /api/* handlers. Public routes read availability and accept reservation requests; everything
// under /api/admin/* and the per-product inventory list need an authenticated admin (see auth.mjs).
import {json, HttpError, badRequest, notFound, isIsoDate, requireDateRange, requireId, requireText, optionalText, requireEnum, readJson} from './util.mjs';
import {authenticate, authMode, checkPassword, createSession, sessionCookie, csrfSafe} from './auth.mjs';
import {loadCatalog} from './catalog.mjs';
import {loadStore, bookingContext} from './store.mjs';
import * as db from './db.mjs';
import {PUBLIC_CONTACT_CHANNELS, NOTIFICATION_CHANNELS, NOTIFICATION_STATUSES, buildNotification} from '../core/notifications/index.mjs';
import {shiftDate} from '../core/booking/dates.mjs';
import {requestDatesError} from '../core/booking/rules.mjs';
import {localized} from '../core/i18n/localized.mjs';
import {publicRequestGuard, turnstileStatus} from './public-requests.mjs';
import {rentalPrice} from '../core/booking/pricing.mjs';
import {at, dateOf, dueAt, readyAt, dayTimeline, handoffWindows, withinHandoff, slotTimes, rentalDaysError, pickupError, isTimeOfDay, isFitting, PURPOSES, visitSpan} from '../core/booking/schedule.mjs';
import {itemSegments, daySummaries, productDays, nextAvailable, currentSegment} from '../core/inventory/timeline.mjs';
import {pushEnabled, pushStatus, notifyAdmins, newRequestPayload} from './push.mjs';
import {PHONE, optionalPhone, contactFields} from './customer.mjs';
import {orderRoutes} from './orders.mjs';
import * as ordersDb from './orders-db.mjs';

// Demo / read-only mode (ADMIN_READ_ONLY=1): the admin can look but not change anything. Public
// requests and orders still arrive (that is the demo), sign-in still works.
export const readOnly = env => ['1', 'true', 'yes'].includes(String(env.ADMIN_READ_ONLY || '').toLowerCase());
const READ_ONLY_EXEMPT = [/^\/api\/admin\/login$/, /^\/api\/admin\/logout$/];

// Today (in the store's zone) and the booking limits, from store.json with env overrides. `hold` is
// how long a rental that is overdue keeps its item: until it could be back and cared for from now.
const context = async (request, env) => {
  const limits = bookingContext(env, await loadStore(env, request));
  return {...limits, hold: db.holdUntil(limits)};
};

function periodFrom(url, today) {
  const from = url.searchParams.get('from'), to = url.searchParams.get('to');
  if (from == null && to == null) return {from: today, to: today, explicit: false};
  return {...requireDateRange(from ?? to, to ?? from), explicit: true};
}
function availabilityResponse(productId, period, summary) {
  const body = {productId};
  if (period.explicit) Object.assign(body, {from: period.from, to: period.to});
  return {...body, total: summary?.total ?? 0, available: summary?.available ?? 0, status: summary?.status ?? 'unavailable'};
}

// Rental pricing is per 24 hours. Pick-up and return fall in the same window of the day, so the
// period is exactly (to - from) x 24h. A same-day return is shorter than that and bills as one day.
function rentalQuote(product, from, to, purpose = 'rental') {
  // A fitting is an appointment, not a rental: there is nothing to charge for it.
  if (isFitting(purpose)) return null;
  const daily = product.price?.rental;
  if (typeof daily !== 'number' || !isIsoDate(from) || !isIsoDate(to) || from > to) return null;
  const days = Math.max(1, Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000));
  return rentalPrice(product, days);
}
// A month of anonymous availability, optionally for ranges starting on a selected date.
// Only booleans and prices leave the server: no customer or physical-item details.
async function publicCalendar(request, env, url, productId) {
  const limits = await context(request, env);
  const {today, buffer, maxRentalDays, maxDaysAhead, hold} = limits;
  const month = url.searchParams.get('month') || today.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month) || !isIsoDate(month + '-01')) throw badRequest('Invalid calendar month.');
  const minMonth = today.slice(0, 7), maxMonth = shiftDate(today, maxDaysAhead + maxRentalDays).slice(0, 7);
  if (month < minMonth || month > maxMonth) throw badRequest('Month outside booking window.');
  const anchor = url.searchParams.get('start') || '';
  if (anchor && (!isIsoDate(anchor) || anchor < today || anchor > shiftDate(today, maxDaysAhead))) throw badRequest('Invalid start date.');
  const first = month + '-01';
  const next = shiftDate(first, 32).slice(0, 7) + '-01';
  const last = shiftDate(next, -1);
  const product = (await loadCatalog(env, request)).byId.get(productId);
  if (!product) throw notFound('Unknown product.');
  if (product.inventory?.managed !== true) throw badRequest('Product is not bookable.');
  const size = optionalText(url.searchParams.get('size'), 'size', 20);
  const from = anchor && anchor < first ? anchor : first;
  const to = anchor && anchor > last ? anchor : last;
  const items = (await db.itemsForProduct(env.DB, productId, {from, to, buffer, today, hold})).filter(i => !size || i.size === size);
  const days = [];
  for (let date = first; date <= last; date = shiftDate(date, 1)) {
    const start = anchor || date;
    const invalid = requestDatesError({start_date: start, end_date: date}, limits);
    const available = !invalid && items.some(i => !db.BLOCKED_ITEM.includes(i.status)
      && !(start <= today && today <= date && ['reserved', 'rented'].includes(i.status))
      && !i.conflicts.some(r => r.start_date <= shiftDate(date, buffer) && (r.status === 'rented' && r.end_date < today ? today : r.end_date) >= shiftDate(start, -buffer)));
    days.push({date, available: Boolean(available)});
  }
  return json({month, today, minMonth, maxMonth, maxRentalDays, maxDaysAhead, days}, 200, {'cache-control': 'no-store'});
}
// --- Public ---------------------------------------------------------------------------------------
async function publicAvailability(request, env, url, productId) {
  const {today, buffer, hold} = await context(request, env);
  const period = periodFrom(url, today);
  const catalog = await loadCatalog(env, request);
  const summaries = await db.availabilityByProduct(env.DB, period.from, period.to, {buffer, today, hold});
  const managed = product => product.inventory?.managed === true;
  if (productId) {
    const product = catalog.byId.get(productId);
    if (!product) throw notFound(`Unknown product ${productId}.`);
    let summary = summaries.get(productId);
    // ?size=L narrows the answer to items of that size (the booking form asks per size).
    const size = optionalText(url.searchParams.get('size'), 'size', 20);
    if (size && managed(product)) {
      const items = (await db.itemsForProduct(env.DB, productId, {from: period.from, to: period.to, buffer, today, hold})).filter(i => i.size === size && i.status !== 'inactive');
      const available = items.filter(i => i.available).length;
      summary = {total: items.length, available, status: available > 0 ? (available < items.length && available <= 1 ? 'low' : 'available') : items.length ? 'rented' : 'unavailable'};
    }
    return json({...availabilityResponse(productId, period, summary), ...(size ? {size} : {}), managed: managed(product), ...(rentalQuote(product, period.from, period.to) ? {quote: rentalQuote(product, period.from, period.to)} : {})}, 200, {'cache-control': 'no-cache'});
  }
  const products = {};
  for (const product of catalog.products) products[product.id] = {...availabilityResponse(product.id, {explicit: false}, summaries.get(product.id)), managed: managed(product)};
  const body = period.explicit ? {from: period.from, to: period.to, products} : {products};
  return json(body, 200, {'cache-control': 'no-cache'});
}

// --- Admin: inventory -----------------------------------------------------------------------------
async function productInventory(request, env, url, productId) {
  const {today, buffer, hold} = await context(request, env);
  const from = url.searchParams.get('from'), to = url.searchParams.get('to');
  const period = from || to ? requireDateRange(from ?? to, to ?? from) : {};
  const exclude = url.searchParams.get('exclude') || '';
  const items = await db.itemsForProduct(env.DB, productId, {...period, buffer, exclude, today, hold});
  return json({productId, ...period, items});
}
async function inventoryList(request, env, url) {
  const status = url.searchParams.get('status') || '';
  if (status && !db.ITEM_STATUSES.includes(status)) throw badRequest('Unknown status filter.', {status: 'invalid'});
  const filters = {product_id: url.searchParams.get('product_id') || '', status};
  if (url.searchParams.get('overview') === '1') {
    const {today, now, buffer} = await context(request, env);
    return json(await db.inventoryOverview(env.DB, filters, today, buffer, at(today, now)));
  }
  return json({items: await db.listInventory(env.DB, filters)});
}
async function inventoryCreate(request, env) {
  const body = await readJson(request);
  const product_id = requireId(body.product_id, 'product_id');
  const id = requireId(body.id, 'id');
  if (!id.startsWith(product_id + '-') || id.length === product_id.length + 1) throw badRequest(`id must start with "${product_id}-" (for example ${product_id}-01).`, {id: 'prefix'});
  const catalog = await loadCatalog(env, request);
  if (!catalog.byId.has(product_id)) throw badRequest(`Unknown product ${product_id}. Add it to catalog/ and rebuild first.`, {product_id: 'unknown'});
  const item = await db.createItem(env.DB, {
    id, product_id,
    size: optionalText(body.size, 'size', 20),
    status: requireEnum(body.status, 'status', db.ITEM_STATUSES, 'available'),
    note: optionalText(body.note, 'note', 500)
  });
  return json({item}, 201);
}
async function inventoryUpdate(request, env, id) {
  const body = await readJson(request);
  const fields = {};
  if ('status' in body) fields.status = requireEnum(body.status, 'status', db.ITEM_STATUSES);
  if ('size' in body) fields.size = optionalText(body.size, 'size', 20);
  if ('note' in body) fields.note = optionalText(body.note, 'note', 500);
  if (!Object.keys(fields).length) throw badRequest('Nothing to update: send status, size or note.');
  if (!await db.getItem(env.DB, id)) throw notFound(`Unknown inventory item ${id}.`);
  return json({item: await db.updateItem(env.DB, id, fields)});
}
async function inventoryDelete(request, env, id) {
  if (!await db.deleteItem(env.DB, id)) throw notFound(`Unknown inventory item ${id}.`);
  return json({deleted: id});
}

// --- Admin: reservations --------------------------------------------------------------------------
function reservationFields(body, {partial = false} = {}) {
  const has = key => !partial || key in body;
  const data = {};
  if (has('customer_name')) data.customer_name = requireText(body.customer_name, 'customer_name', 100);
  if (has('customer_phone')) data.customer_phone = optionalPhone(body.customer_phone, 'customer_phone');
  if (has('customer_facebook')) data.customer_facebook = optionalText(body.customer_facebook, 'customer_facebook', 200);
  contactFields(body, data, has);
  if (has('start_date')) { if (!isIsoDate(body.start_date)) throw badRequest('start_date must be a date in YYYY-MM-DD format.', {start_date: 'invalid'}); data.start_date = body.start_date; }
  if (has('end_date')) { if (!isIsoDate(body.end_date)) throw badRequest('end_date must be a date in YYYY-MM-DD format.', {end_date: 'invalid'}); data.end_date = body.end_date; }
  if (has('status')) data.status = requireEnum(body.status, 'status', db.RESERVATION_STATUSES, partial ? undefined : 'pending');
  if (has('note')) data.note = optionalText(body.note, 'note', 1000);
  // What a request asked for. Staff may note a request down themselves (no item yet) or correct one.
  if (has('request_product_id')) data.request_product_id = body.request_product_id ? requireId(body.request_product_id, 'request_product_id') : '';
  if (has('request_size')) data.request_size = optionalText(body.request_size, 'request_size', 20);
  if (has('items')) {
    if (!Array.isArray(body.items)) throw badRequest('items must list inventory item ids.', {items: 'required'});
    if (body.items.length > 20) throw badRequest('A reservation can hold at most 20 items.', {items: 'too_many'});
    data.items = [...new Set(body.items.map(id => requireId(id, 'items')))];
  }
  return data;
}
async function requireCatalogProduct(env, request, productId) {
  const catalog = await loadCatalog(env, request);
  if (!catalog.byId.has(productId)) throw badRequest(`Unknown product ${productId}.`, {request_product_id: 'unknown'});
  return catalog;
}
async function reservationList(request, env, url) {
  const from = url.searchParams.get('from') || '', to = url.searchParams.get('to') || '';
  if (from && !isIsoDate(from)) throw badRequest('from must be a date in YYYY-MM-DD format.', {from: 'invalid'});
  if (to && !isIsoDate(to)) throw badRequest('to must be a date in YYYY-MM-DD format.', {to: 'invalid'});
  if (from && to && from > to) throw badRequest('from must not be after to.', {to: 'before_from'});
  const status = (url.searchParams.get('status') || '').split(',').map(s => s.trim()).filter(Boolean);
  for (const s of status) if (!db.RESERVATION_STATUSES.includes(s)) throw badRequest(`Unknown status filter "${s}".`, {status: 'invalid'});
  const notification = url.searchParams.get('notification') || '';
  if (notification && !NOTIFICATION_STATUSES.includes(notification)) throw badRequest('Unknown notification filter.', {notification: 'invalid'});
  const q = optionalText(url.searchParams.get('q'), 'q', 100);
  return json({reservations: await db.listReservations(env.DB, {from, to, status, notification, q})});
}
async function reservationCreate(request, env) {
  const data = reservationFields(await readJson(request));
  if (data.start_date > data.end_date) throw badRequest('start_date must not be after end_date.', {end_date: 'before_start'});
  if (data.request_product_id) await requireCatalogProduct(env, request, data.request_product_id);
  return json({reservation: await db.createReservation(env.DB, data, await context(request, env))}, 201);
}
// The detail response carries everything the notification panel needs (texts in four languages,
// normalised WhatsApp number, Messenger link) so the page never rebuilds them.
async function reservationDetail(env, request, reservation) {
  const [catalog, store] = await Promise.all([loadCatalog(env, request), loadStore(env, request)]);
  return json({reservation, notification: buildNotification(reservation, catalog.byId, store)});
}
async function reservationGet(request, env, id) {
  const reservation = await db.getReservation(env.DB, id);
  if (!reservation) throw notFound(`Unknown reservation ${id}.`);
  return reservationDetail(env, request, reservation);
}
async function reservationUpdate(request, env, id, patch) {
  const current = await db.getReservation(env.DB, id);
  if (!current) throw notFound(`Unknown reservation ${id}.`);
  const start = patch.start_date ?? current.start_date, end = patch.end_date ?? current.end_date;
  if (start > end) throw badRequest('start_date must not be after end_date.', {end_date: 'before_start'});
  if (patch.request_product_id) await requireCatalogProduct(env, request, patch.request_product_id);
  return reservationDetail(env, request, await db.updateReservation(env.DB, id, patch, await context(request, env)));
}
async function reservationConfirm(request, env, id) {
  const reservation = await db.confirmReservation(env.DB, id, await context(request, env));
  if (!reservation) throw notFound(`Unknown reservation ${id}.`);
  return reservationDetail(env, request, reservation);
}
// Staff record that they told the customer: {status: 'sent', channel, note} or {status: 'not_sent'}.
async function reservationNotification(request, env, id) {
  const body = await readJson(request);
  const status = requireEnum(body.status, 'status', NOTIFICATION_STATUSES);
  const channel = status === 'sent' ? requireEnum(body.channel, 'channel', NOTIFICATION_CHANNELS) : '';
  const note = optionalText(body.note, 'note', 500);
  if (!await db.getReservation(env.DB, id)) throw notFound(`Unknown reservation ${id}.`);
  return reservationDetail(env, request, await db.setNotification(env.DB, id, {status, channel, note}));
}

// The day a customer is looking at, hour by hour. Three separate things decide each row: whether a
// garment is free, whether it has come back and been cared for, and whether somebody is at the shop
// to hand it over. Only states and counts leave the Worker -- never a customer name or an item id.
async function publicTimeline(request, env, url, productId) {
  const limits = await context(request, env);
  const {today, now, buffer, maxRentalDays, maxDaysAhead, slotMinutes, handoff, turnaround, fitting} = limits;
  const date = url.searchParams.get('date') || today;
  if (!isIsoDate(date)) throw badRequest('date must be a date in YYYY-MM-DD format.', {date: 'invalid'});
  if (date < today || date > shiftDate(today, maxDaysAhead)) throw badRequest('Date outside the booking window.', {date: 'out_of_range'});
  const purpose = url.searchParams.get('purpose') || 'rental';
  if (!PURPOSES.includes(purpose)) throw badRequest('Unknown purpose.', {purpose: 'invalid'});
  if (isFitting(purpose) && !fitting.enabled) throw badRequest('This store does not take fitting visits.', {purpose: 'not_offered'});
  const days = isFitting(purpose) ? 1 : Number.parseInt(url.searchParams.get('days') || '1', 10);
  const lengthProblem = rentalDaysError(days, {maxRentalDays});
  if (lengthProblem) throw badRequest(`A rental runs for 1 to ${maxRentalDays} whole days.`, {[lengthProblem.field]: lengthProblem.code});
  const product = (await loadCatalog(env, request)).byId.get(productId);
  if (!product) throw notFound('Unknown product.');
  if (product.inventory?.managed !== true) throw badRequest('Product is not bookable.');
  const size = optionalText(url.searchParams.get('size'), 'size', 20);
  // Far enough ahead to catch a rental that starts on this day and the care window after it.
  const until = shiftDate(dateOf(readyAt(dueAt(at(date, '23:59'), days), turnaround)), buffer + 1);
  const [{items, intervals}, exceptions] = await Promise.all([
    db.productSchedule(env.DB, productId, {from: shiftDate(date, -buffer), until, size, turnaround, fitting, hold: limits.hold}),
    db.handoffExceptions(env.DB, {from: date, to: date})
  ]);
  const line = dayTimeline({date, days, items, intervals}, {
    slotMinutes, handoff, exceptions, turnaround, bufferDays: buffer, purpose, fitting,
    displayStart: limits.displayStart, displayEnd: limits.displayEnd, openingHours: limits.openingHours,
    now, today, blocked: db.BLOCKED_ITEM, outNow: db.OUT_NOW
  });
  const quote = rentalQuote(product, date, shiftDate(date, days), purpose);
  return json({...line, maxRentalDays, quote, fittingMinutes: isFitting(purpose) ? fitting.minutes : 0, closed: line.windows !== null && !line.windows.length}, 200, {'cache-control': 'no-store'});
}

// --- Admin: the handoff diary --------------------------------------------------------------------
// Single dates the owner works differently. Staff set them here; the customer timeline reads them.
async function handoffExceptionSave(request, env, date) {
  if (!isIsoDate(date)) throw badRequest('date must be a date in YYYY-MM-DD format.', {date: 'invalid'});
  const body = await readJson(request);
  const closed = body.closed === true;
  const windows = [];
  if (!closed) {
    if (!Array.isArray(body.windows) || !body.windows.length) throw badRequest('Give at least one window, or close the day.', {windows: 'required'});
    for (const window of body.windows) {
      const start = String(window?.start ?? ''), end = String(window?.end ?? '');
      if (!isTimeOfDay(start) || !(isTimeOfDay(end) || end === '24:00') || start >= end) throw badRequest('Each window needs start and end as HH:MM, with start before end.', {windows: 'invalid'});
      windows.push({start, end});
    }
    windows.sort((a, b) => a.start.localeCompare(b.start));
  }
  const note = optionalText(body.note, 'note', 200);
  return json({exception: await db.setHandoffException(env.DB, date, {closed, windows, note})});
}

// --- Admin: what the inventory is doing ------------------------------------------------------------
// The availability view that sits beside the booking ledger: per product and size, how many items
// exist, what each is doing, and when the next one comes free.
async function inventorySchedule(request, env, url) {
  const {today, now, buffer, turnaround, fitting} = await context(request, env);
  const productFilter = optionalText(url.searchParams.get('product_id'), 'product_id', 64);
  const items = await db.listInventory(env.DB, productFilter ? {product_id: productFilter} : {});
  const groups = new Map();

  for (const item of items) {
    const key = `${item.product_id}|${item.size || ''}`;
    if (!groups.has(key)) groups.set(key, {product_id: item.product_id, size: item.size || '', total: 0, available: 0, reserved: 0, rented: 0, cleaning: 0, maintenance: 0, inactive: 0, next_free: '', items: []});
    const group = groups.get(key);
    group.total++;
    group.items.push(item);
  }
  // One query for every item on screen, then the stretches are worked out in one place.
  const byProduct = new Map();
  for (const productId of new Set(items.map(item => item.product_id))) {
    byProduct.set(productId, await db.productSchedule(env.DB, productId, {from: today, until: shiftDate(today, 400), turnaround, fitting}));
  }
  const moment = at(today, now);
  const schedule = [...groups.values()].map(group => {
    const intervals = byProduct.get(group.product_id)?.intervals || new Map();
    let soonest = null;
    const detail = group.items.map(item => {
      const held = (intervals.get(item.id) || []).slice().sort((a, b) => a.start.localeCompare(b.start));
      const current = held.find(span => span.start <= moment && span.ready > moment) || null;
      // An item under maintenance has no date it comes back; anything else is free now, or once its
      // current rental has been returned and cared for.
      const free = db.BLOCKED_ITEM.includes(item.status) ? null : (current ? current.ready : moment);
      if (free && (!soonest || free < soonest)) soonest = free;
      // What staff need to see is what the garment is doing, which is not quite its stored status:
      // confirming a booking does not touch the item until it is handed over, so a piece held for
      // right now reads as reserved even though its row still says available.
      const state = db.BLOCKED_ITEM.includes(item.status) || ['rented', 'cleaning'].includes(item.status)
        ? item.status
        : (current ? 'reserved' : 'available');
      group[state] = (group[state] || 0) + 1;
      return {id: item.id, size: item.size, status: item.status, state, occupied: held, free_at: free || ''};
    });
    return {...group, items: detail, next_free: soonest || ''};
  });
  return json({today, buffer, schedule}, 200, {'cache-control': 'no-store'});
}

// The staff timeline: every garment as consecutive segments -- with a customer, held, being cared
// for, free -- over [from, from + days), each day summarised for the compact strip in the inventory
// list, and per product and size how many pieces are free each day. Customer names are in here, so
// it is admin only; the public timeline sends counts and nothing else.
const TIMELINE_MAX_DAYS = 31;
async function inventoryTimeline(request, env, url) {
  const {today, now, turnaround, fitting} = await context(request, env);
  const from = url.searchParams.get('from') || today;
  if (!isIsoDate(from)) throw badRequest('from must be a date in YYYY-MM-DD format.', {from: 'invalid'});
  const days = Number(url.searchParams.get('days') || 7);
  if (!Number.isInteger(days) || days < 1 || days > TIMELINE_MAX_DAYS) throw badRequest(`days must be a whole number from 1 to ${TIMELINE_MAX_DAYS}.`, {days: 'invalid'});
  const product_id = optionalText(url.searchParams.get('product_id'), 'product_id', 64);
  const item_id = optionalText(url.searchParams.get('item_id'), 'item_id', 64);
  const start = at(from, '00:00'), until = at(shiftDate(from, days), '00:00'), moment = at(today, now);
  const {items, bookings} = await db.inventoryTimeline(env.DB, {product_id, item_id, from: start, until});
  const detail = items.map(item => {
    const segments = itemSegments(item, bookings.get(item.id) || [], {from: start, until, now: moment, turnaround, fitting});
    return {
      id: item.id, product_id: item.product_id, size: item.size || '', status: item.status, note: item.note || '',
      now: currentSegment(segments, moment)?.kind || '', next_available: nextAvailable(segments, moment),
      segments, days: daySummaries(segments, {from, days})
    };
  });
  const groups = new Map();
  for (const item of detail) {
    const key = `${item.product_id}|${item.size}`;
    if (!groups.has(key)) groups.set(key, {product_id: item.product_id, size: item.size, items: []});
    groups.get(key).items.push(item);
  }
  const products = [...groups.values()].map(group => ({
    product_id: group.product_id, size: group.size, items: group.items.map(item => item.id),
    total: group.items.filter(item => item.status !== 'inactive').length, days: productDays(group.items)
  }));
  return json({today, now: moment, from, days, items: detail, products}, 200, {'cache-control': 'no-store'});
}

// --- Public: reservation requests ------------------------------------------------------------------
async function reservationRequestCreate(request, env, url, params, admin, ctx) {
  const body = await readJson(request);
  const context_ = await context(request, env);
  const {today, now, buffer, maxRentalDays, maxDaysAhead, timeSlots, slotMinutes, handoff, turnaround, fitting} = context_;
  const product_id = requireId(body.product_id, 'product_id');
  const catalog = await loadCatalog(env, request);
  const product = catalog.byId.get(product_id);
  if (!product) throw badRequest(`Unknown product ${product_id}.`, {product_id: 'unknown'});
  if (product.inventory?.managed !== true) throw badRequest('This item cannot be requested online; please message the store.', {product_id: 'not_bookable'});
  const size = optionalText(body.size, 'size', 20);
  if (size && Array.isArray(product.sizes) && product.sizes.length && !product.sizes.includes(size)) throw badRequest(`size must be one of: ${product.sizes.join(', ')}.`, {size: 'invalid'});
  /** @type {any} */
  const data = {
    customer_name: requireText(body.customer_name, 'customer_name', 100),
    customer_phone: requireText(body.customer_phone, 'customer_phone', 40),
    customer_facebook: '',
    note: optionalText(body.note, 'note', 500),
    status: 'pending', source: 'public', request_product_id: product_id, request_size: size, items: []
  };
  if (!PHONE.test(data.customer_phone)) throw badRequest('customer_phone must be a phone number.', {customer_phone: 'invalid'});
  contactFields(body, data, () => true);
  // The public form must say how to reach the customer (no "other" here), and the chosen channel needs
  // a number or link: Zalo / WhatsApp fall back to the main phone, Messenger's link stays optional.
  if (!PUBLIC_CONTACT_CHANNELS.includes(data.preferred_contact_channel)) throw badRequest(`preferred_contact_channel must be one of: ${PUBLIC_CONTACT_CHANNELS.join(', ')}.`, {preferred_contact_channel: 'required'});
  if (data.preferred_contact_channel === 'zalo' && !data.customer_zalo_phone) data.customer_zalo_phone = data.customer_phone;
  if (data.preferred_contact_channel === 'whatsapp' && !data.customer_whatsapp) data.customer_whatsapp = data.customer_phone;
  // Consent to the privacy policy (/privacy) is mandatory; the time is the server's, not the client's.
  if (body.privacy_consent !== true) throw badRequest('privacy_consent must be true: the customer has to accept the privacy policy.', {privacy_consent: 'required'});
  data.privacy_consent = 1;
  data.privacy_consent_at = new Date().toISOString();
  data.start_date = body.start_date;
  // Coming in to try something on is an appointment, not a rental: it holds the garment for the
  // length of the visit, ends the same day and is not charged for.
  data.purpose = optionalText(body.purpose, 'purpose', 20) || 'rental';
  if (!PURPOSES.includes(data.purpose)) throw badRequest(`purpose must be one of: ${PURPOSES.join(', ')}.`, {purpose: 'invalid'});
  if (isFitting(data.purpose) && !fitting.enabled) throw badRequest('This store does not take fitting visits.', {purpose: 'not_offered'});
  // A rental is a number of whole 24-hour days from the moment it is collected. A client that
  // still sends an end date instead is read the way it always was.
  const days = body.rental_days == null
    ? (isIsoDate(body.start_date) && isIsoDate(body.end_date) ? Math.max(1, Math.round((Date.parse(body.end_date + 'T00:00:00Z') - Date.parse(body.start_date + 'T00:00:00Z')) / 86400000)) : 1)
    : Number(body.rental_days);
  const lengthProblem = rentalDaysError(days, {maxRentalDays});
  if (lengthProblem) throw badRequest(`A rental runs for 1 to ${maxRentalDays} whole days.`, {[lengthProblem.field]: lengthProblem.code});
  data.start_time = optionalText(body.start_time, 'start_time', 5);
  // The times on offer are the owner's handoff windows at the store's own granularity. A store
  // still on the old fixed windows keeps them; one with neither takes no time of day at all.
  const exceptions = isIsoDate(data.start_date) ? await db.handoffExceptions(env.DB, {from: data.start_date, to: data.start_date}) : {};
  const windows = isIsoDate(data.start_date) ? handoffWindows(data.start_date, handoff, exceptions) : null;
  const opening = handoffWindows(data.start_date, {weekly: context_.openingHours}, exceptions);
  const offered = (windows === null ? timeSlots.map(slot => slot.start) : slotTimes(windows, {slotMinutes})).filter(time => withinHandoff(time, opening));
  if (offered.length) {
    if (!data.start_time) throw badRequest('start_time is required.', {start_time: 'required'});
    if (!offered.includes(data.start_time)) throw badRequest('That pick-up time is not on offer for this date.', {start_time: 'invalid'});
  } else if (data.start_time) throw badRequest('This store does not offer pick-up times on that date.', {start_time: 'not_allowed'});
  // Only a booking that names a time runs on the clock; without one it keeps the calendar-day rule.
  // A fitting is over the same day, so it counts no days at all.
  data.rental_days = isFitting(data.purpose) ? 0 : (data.start_time ? days : 0);
  data.end_date = isFitting(data.purpose) ? data.start_date
    : (data.start_time ? dateOf(dueAt(at(data.start_date, data.start_time), days)) : (body.end_date || shiftDate(data.start_date, Math.max(0, days - 1))));
  if (isFitting(data.purpose) && !data.start_time) throw badRequest('A fitting needs a time of day.', {start_time: 'required'});
  if (data.start_time) {
    const pickupProblem = pickupError(at(data.start_date, data.start_time), {today, now, maxDaysAhead});
    if (pickupProblem) throw badRequest('That pick-up time has passed or is outside the booking window.', {[pickupProblem.field]: pickupProblem.code});
  }
  const dateProblem = requestDatesError(data, {today, maxRentalDays, maxDaysAhead});
  if (dateProblem) {
    const messages = {invalid: `${dateProblem.field} must be a date in YYYY-MM-DD format.`, before_start: 'start_date must not be after end_date.', past: 'start_date must not be in the past.', too_far: `start_date must be within ${maxDaysAhead} days.`, too_long: `A rental can last at most ${maxRentalDays} days.`};
    throw badRequest(messages[dateProblem.code], {[dateProblem.field]: dateProblem.code});
  }
  // Spam checks (Turnstile when configured, then the per-IP throttle) run before anything is written.
  const guard = await publicRequestGuard(request, env, body);
  // The customer already saw "available", but the stock is checked again at the moment of writing.
  // Everything is checked again here, against the database, however the form looked a moment ago.
  const interval = db.requestedInterval(data, {buffer, turnaround, fitting});
  if (!await db.productFree(env.DB, product_id, {interval, from: data.start_date, to: data.end_date, size, buffer, today, hold: context_.hold})) {
    throw new HttpError(409, 'unavailable', 'This item is not available for the selected dates.', {product_id, size, from: data.start_date, to: data.end_date});
  }
  const existing = await db.findOpenRequest(env.DB, data);
  const reservation = existing || await db.createReservation(env.DB, data, {buffer, turnaround, fitting, today, now});
  if (!existing) {
    await guard.record();
    // Tell the store's phones. Delivery runs after the response; a push failure never fails the request.
    if (pushEnabled(env)) {
      const store = await loadStore(env, request);
      const delivery = notifyAdmins(env, newRequestPayload(reservation, localized(product.name, store.defaultLanguage) || product_id)).catch(error => console.error('Push failed:', error));
      if (ctx?.waitUntil) ctx.waitUntil(delivery); else await delivery;
    }
  }
  const {id, status, customer_name, start_date, end_date, start_time, rental_days, start_at, purpose, request_product_id, request_size, created_at, privacy_consent_at} = reservation;
  // When the garment is expected back: the end of the appointment, or the rental deadline.
  const due_at = !start_at ? ''
    : isFitting(purpose) ? visitSpan(start_at, {purpose, fitting}).ready
      : (rental_days > 0 ? dueAt(start_at, rental_days) : '');
  return json({request: {id, status, customer_name, start_date, end_date, start_time, rental_days, purpose, start_at, due_at, product_id: request_product_id, size: request_size, created_at, privacy_consent: true, privacy_consent_at, quote: rentalQuote(product, start_date, end_date, purpose)}, duplicate: Boolean(existing)}, existing ? 200 : 201);
}

// --- Admin: session -------------------------------------------------------------------------------
async function login(request, env) {
  const {password} = await readJson(request);
  if (!await checkPassword(env, password)) throw new HttpError(401, 'invalid_credentials', 'Wrong password.');
  return json({authenticated: true, mode: 'password'}, 200, {'set-cookie': sessionCookie(request, await createSession(env))});
}
const logout = request => json({authenticated: false}, 200, {'set-cookie': sessionCookie(request, '', 0)});

// --- Admin: Web Push subscriptions ----------------------------------------------------------------
// The browser posts PushSubscription.toJSON(); the Worker keeps endpoint + keys and nothing else.
async function pushSubscribe(request, env) {
  const body = await readJson(request);
  const endpoint = requireText(body.endpoint, 'endpoint', 2000);
  if (!/^https:\/\//.test(endpoint)) throw badRequest('endpoint must be an https URL.', {endpoint: 'invalid'});
  const keys = body.keys && typeof body.keys === 'object' ? body.keys : {};
  const p256dh = requireText(keys.p256dh, 'keys.p256dh', 200), auth = requireText(keys.auth, 'keys.auth', 100);
  if (!/^[A-Za-z0-9_-]+$/.test(p256dh) || !/^[A-Za-z0-9_-]+$/.test(auth)) throw badRequest('keys must be base64url.', {keys: 'invalid'});
  const subscription = await db.savePushSubscription(env.DB, {endpoint, p256dh, auth, label: optionalText(body.label, 'label', 100)});
  return json({subscription: {endpoint: subscription.endpoint, label: subscription.label, created_at: subscription.created_at}}, 201);
}
async function pushUnsubscribe(request, env) {
  const {endpoint} = await readJson(request);
  return json({deleted: await db.deletePushSubscription(env.DB, requireText(endpoint, 'endpoint', 2000))});
}
async function pushTest(request, env) {
  return json(await notifyAdmins(env, {type: 'test', title: 'Tiemora', body: 'Push notifications are working.', url: '/admin/#/', tag: 'tiemora-test'}));
}

// --- Router ---------------------------------------------------------------------------------------
// csrf: the same-origin fetch headers are demanded on every admin write and on the public POSTs
// (the store's own pages send them; a form on another site cannot).
const route = (method, pattern, handler, {auth = false, csrf = auth} = {}) => ({method, pattern, handler, auth, csrf});
const routes = [
  route('GET', /^\/api\/availability$/, (req, env, url) => publicAvailability(req, env, url, '')),
  route('GET', /^\/api\/products\/([^/]+)\/availability$/, (req, env, url, [id]) => publicAvailability(req, env, url, id)),
  route('GET', /^\/api\/products\/([^/]+)\/calendar$/, (req, env, url, [id]) => publicCalendar(req, env, url, id)),
  route('GET', /^\/api\/products\/([^/]+)\/timeline$/, (req, env, url, [id]) => publicTimeline(req, env, url, id)),
  route('GET', /^\/api\/products\/([^/]+)\/inventory$/, (req, env, url, [id]) => productInventory(req, env, url, id), {auth: true}),
  // Public reservation requests: always pending and never holding a item until staff confirm.
  // The site key for the widget, plus whether the pair is complete so the form can warn the shop owner.
  route('GET', /^\/api\/reservation-requests\/config$/, (req, env) => {
    const turnstile = turnstileStatus(env);
    return json({turnstileSiteKey: turnstile.enabled ? env.TURNSTILE_SITE_KEY : '', turnstile}, 200, {'cache-control': 'no-cache'});
  }),
  route('POST', /^\/api\/reservation-requests$/, reservationRequestCreate, {csrf: true}),
  route('POST', /^\/api\/admin\/login$/, login, {csrf: true}),
  // Web Push: the public key the page subscribes with, then subscribe / unsubscribe / test.
  route('GET', /^\/api\/admin\/push\/config$/, (req, env) => json({publicKey: pushEnabled(env) ? env.VAPID_PUBLIC_KEY : '', push: pushStatus(env)}), {auth: true}),
  route('GET', /^\/api\/admin\/push\/subscriptions$/, async (req, env) => json({subscriptions: (await db.listPushSubscriptions(env.DB)).map(({endpoint, label, created_at, last_sent_at, failures}) => ({endpoint, label, created_at, last_sent_at, failures}))}), {auth: true}),
  route('POST', /^\/api\/admin\/push\/subscriptions$/, pushSubscribe, {auth: true}),
  route('POST', /^\/api\/admin\/push\/unsubscribe$/, pushUnsubscribe, {auth: true}),
  route('POST', /^\/api\/admin\/push\/test$/, pushTest, {auth: true}),
  route('POST', /^\/api\/admin\/logout$/, logout),
  route('GET', /^\/api\/admin\/session$/, (req, env, url, m, admin) => json({authenticated: true, mode: admin.mode, user: admin.user, readOnly: readOnly(env)}), {auth: true}),
  route('GET', /^\/api\/admin\/dashboard$/, async (req, env) => {
    const [catalog, {today}] = await Promise.all([loadCatalog(env, req), context(req, env)]);
    const [rental, orders] = await Promise.all([db.dashboard(env.DB, today), ordersDb.orderAlerts(env.DB, today)]);
    return json({products: catalog.products.length, ...rental, ...orders, readOnly: readOnly(env)});
  }, {auth: true}),
  // The in-admin notification centre: today's pickups/returns, overdue rentals, new requests, customers still to notify.
  route('GET', /^\/api\/admin\/notifications$/, async (req, env) => {
    const {today} = await context(req, env);
    const [rental, orders] = await Promise.all([db.alerts(env.DB, today), ordersDb.orderAlerts(env.DB, today)]);
    return json({...rental, ...orders});
  }, {auth: true}),
  ...orderRoutes(route),
  route('GET', /^\/api\/admin\/inventory\/schedule$/, inventorySchedule, {auth: true}),
  route('GET', /^\/api\/admin\/inventory\/timeline$/, inventoryTimeline, {auth: true}),
  route('GET', /^\/api\/admin\/handoff-exceptions$/, async (req, env, url) => json({exceptions: Object.values(await db.handoffExceptions(env.DB, {from: url.searchParams.get('from') || '', to: url.searchParams.get('to') || ''}))}), {auth: true}),
  route('PUT', /^\/api\/admin\/handoff-exceptions\/(\d{4}-\d{2}-\d{2})$/, (req, env, url, [date]) => handoffExceptionSave(req, env, date), {auth: true}),
  route('DELETE', /^\/api\/admin\/handoff-exceptions\/(\d{4}-\d{2}-\d{2})$/, async (req, env, url, [date]) => {
    if (!await db.deleteHandoffException(env.DB, date)) throw notFound(`No handoff exception on ${date}.`);
    return json({deleted: date});
  }, {auth: true}),
  route('GET', /^\/api\/admin\/inventory$/, inventoryList, {auth: true}),
  route('POST', /^\/api\/admin\/inventory$/, inventoryCreate, {auth: true}),
  route('GET', /^\/api\/admin\/inventory\/([^/]+)$/, async (req, env, url, [id]) => {
    const item = await db.getItem(env.DB, id);
    if (!item) throw notFound(`Unknown inventory item ${id}.`);
    return json({item});
  }, {auth: true}),
  route('PATCH', /^\/api\/admin\/inventory\/([^/]+)$/, (req, env, url, [id]) => inventoryUpdate(req, env, id), {auth: true}),
  route('DELETE', /^\/api\/admin\/inventory\/([^/]+)$/, (req, env, url, [id]) => inventoryDelete(req, env, id), {auth: true}),
  route('GET', /^\/api\/admin\/reservations$/, reservationList, {auth: true}),
  route('POST', /^\/api\/admin\/reservations$/, reservationCreate, {auth: true}),
  route('GET', /^\/api\/admin\/reservations\/([^/]+)$/, (req, env, url, [id]) => reservationGet(req, env, id), {auth: true}),
  route('PATCH', /^\/api\/admin\/reservations\/([^/]+)$/, async (req, env, url, [id]) => {
    const patch = reservationFields(await readJson(req), {partial: true});
    if (!Object.keys(patch).length) throw badRequest('Nothing to update.');
    return reservationUpdate(req, env, id, patch);
  }, {auth: true}),
  // Confirm a pending booking; a request from the public site gets a free item assigned here.
  route('POST', /^\/api\/admin\/reservations\/([^/]+)\/confirm$/, (req, env, url, [id]) => reservationConfirm(req, env, id), {auth: true}),
  route('POST', /^\/api\/admin\/reservations\/([^/]+)\/notification$/, (req, env, url, [id]) => reservationNotification(req, env, id), {auth: true}),
  // Reservations are never erased: DELETE cancels, which also releases the items.
  route('DELETE', /^\/api\/admin\/reservations\/([^/]+)$/, (req, env, url, [id]) => reservationUpdate(req, env, id, {status: 'cancelled'}), {auth: true})
];

export async function handleApi(request, env, url, ctx) {
  try {
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const candidates = routes.filter(r => r.pattern.test(path));
    if (!candidates.length) throw notFound('No such API route.');
    const match = candidates.find(r => r.method === request.method);
    if (!match) return json({error: 'method_not_allowed', message: `Use ${[...new Set(candidates.map(r => r.method))].join(', ')}.`}, 405, {allow: candidates.map(r => r.method).join(', ')});
    let admin = null;
    if (match.auth) {
      admin = await authenticate(request, env);
      if (!admin) throw new HttpError(401, 'unauthorized', 'Admin authentication required.', {mode: authMode(env)});
    }
    if (match.csrf && admin?.mode !== 'token' && !csrfSafe(request)) {
      throw new HttpError(403, 'csrf_rejected', 'Cross-site request rejected. Send X-Requested-With: fetch from the store page.');
    }
    if (match.auth && !['GET', 'HEAD'].includes(request.method) && readOnly(env) && !READ_ONLY_EXEMPT.some(p => p.test(path))) {
      throw new HttpError(403, 'read_only', 'This demo admin is read-only: changes are not saved.');
    }
    const params = path.match(match.pattern).slice(1).map(decodeURIComponent);
    return await match.handler(request, env, url, params, admin, ctx);
  } catch (error) {
    if (error instanceof HttpError) return json({error: error.error, message: error.message, ...error.extra}, error.status);
    console.error('API failure:', error);
    return json({error: 'internal_error', message: 'Unexpected server error.'}, 500);
  }
}
