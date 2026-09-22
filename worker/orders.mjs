// /api/orders* handlers: sale / pre-order products (pickup or delivery in a time slot). The public
// form reads /api/orders/config (dates, slots, capacity, stock) and posts to /api/orders; staff
// manage everything under /api/admin/orders. Domain rules live in core/orders/rules.mjs, SQL in
// orders-db.mjs. Contact validation is shared with rental bookings (customer.mjs).
import {json, HttpError, badRequest, notFound, isIsoDate, requireId, requireText, optionalText, requireEnum, readJson} from './util.mjs';
import {loadCatalog} from './catalog.mjs';
import {loadStore, bookingContext} from './store.mjs';
import * as ordersDb from './orders-db.mjs';
import {PHONE, contactFields, optionalPhone} from './customer.mjs';
import {PUBLIC_CONTACT_CHANNELS, NOTIFICATION_CHANNELS, NOTIFICATION_STATUSES} from '../core/notifications/index.mjs';
import {buildOrderNotification} from '../core/notifications/orders.mjs';
import {localized} from '../core/i18n/localized.mjs';
import {ORDER_STATUSES, FULFILLMENT_TYPES, priceOrderLine, orderTotals, orderDateWindow, orderDateError, deadlinePassed, findSlot, capacityByDate, stockSummary, nextOrderStatuses} from '../core/orders/rules.mjs';
import {publicRequestGuard, turnstileStatus} from './public-requests.mjs';
import {pushEnabled, notifyAdmins, newOrderPayload} from './push.mjs';
import {shiftDate} from '../core/booking/dates.mjs';

/** @type {(ordering: any, dates: string[], counts: any) => any} */
const capacityOf = capacityByDate;
const isSale = product => product?.type === 'sale' && product.ordering?.preorder !== false;
// Every calendar day of the window, so the form can show which days are still open.
function windowDates(window) {
  const dates = [];
  if (!window.open) return dates;
  for (let d = window.from; d <= window.to && dates.length < 62; d = shiftDate(d, 1)) dates.push(d);
  return dates;
}
// Capacity for the order window and stock for every sale product, computed the same way for the
// public config and for the create handler so the customer never sees a slot the server would refuse.
async function orderState(env, request) {
  const [store, catalog] = await Promise.all([loadStore(env, request), loadCatalog(env, request)]);
  const {today} = bookingContext(env, store);
  const window = orderDateWindow(store.ordering.dates, today);
  const dates = windowDates(window);
  const [counts, sold] = await Promise.all([dates.length ? ordersDb.countCapacity(env.DB, dates[0], dates.at(-1)) : {}, ordersDb.soldByProduct(env.DB)]);
  const products = {};
  for (const product of catalog.products) if (product.type === 'sale') products[product.id] = {...stockSummary(product, sold.get(product.id) || 0), preorder: product.ordering?.preorder !== false, deadlinePassed: deadlinePassed(product.ordering?.deadline)};
  return {store, catalog, today, window, dates, capacity: capacityOf(store.ordering, dates, counts), products, deadlinePassed: deadlinePassed(store.ordering.deadline)};
}

// --- Public --------------------------------------------------------------------------------------------
async function orderConfig(request, env) {
  const state = await orderState(env, request);
  const {ordering} = state.store;
  const turnstile = turnstileStatus(env);
  return json({
    fulfillment: ordering.fulfillment, dates: {...state.window, list: state.dates}, deadline: ordering.deadline, deadlinePassed: state.deadlinePassed,
    dailyCapacity: ordering.dailyCapacity, timeSlots: ordering.timeSlots, capacity: state.capacity, products: state.products,
    options: ordering.options, addons: ordering.addons, messageCard: ordering.messageCard, currency: state.store.currency,
    turnstileSiteKey: turnstile.enabled ? env.TURNSTILE_SITE_KEY : '', turnstile
  }, 200, {'cache-control': 'no-cache'});
}

// The fields a line and its fulfillment need, validated against catalog + config. Shared by the
// public form and the staff form; `strict` adds the public-only rules (consent, channel, window).
function orderFields(body, state, {strict}) {
  const {store, catalog} = state;
  const {ordering} = store;
  const product_id = requireId(body.product_id, 'product_id');
  const product = catalog.byId.get(product_id);
  if (!product) throw badRequest(`Unknown product ${product_id}.`, {product_id: 'unknown'});
  if (!isSale(product)) throw badRequest('This product cannot be ordered online; please message the store.', {product_id: 'not_for_sale'});
  const quantity = body.quantity == null ? 1 : body.quantity;
  const line = priceOrderLine(product, ordering, {options: body.options ?? {}, addons: body.addons ?? [], quantity});
  if (line.error) throw badRequest(`Invalid ${line.error.field}.`, {[line.error.field]: line.error.code});
  const fulfillment_type = requireEnum(body.fulfillment_type, 'fulfillment_type', FULFILLMENT_TYPES);
  if (!ordering.fulfillment[fulfillment_type] || product.fulfillment?.[fulfillment_type] === false) throw badRequest(`${fulfillment_type} is not offered for this product.`, {fulfillment_type: 'not_offered'});
  const fulfillment_date = body.fulfillment_date;
  if (strict) {
    const problem = orderDateError(fulfillment_date, state.window);
    if (problem) throw badRequest({invalid: 'fulfillment_date must be a date in YYYY-MM-DD format.', too_early: 'fulfillment_date is too soon or ordering is closed.', too_late: 'fulfillment_date is beyond the ordering window.'}[problem.code], {fulfillment_date: problem.code});
  } else if (!isIsoDate(fulfillment_date)) throw badRequest('fulfillment_date must be a date in YYYY-MM-DD format.', {fulfillment_date: 'invalid'});
  let time_slot = optionalText(body.time_slot, 'time_slot', 40);
  if (ordering.timeSlots.length) {
    if (!time_slot) throw badRequest('time_slot is required.', {time_slot: 'required'});
    if (!findSlot(ordering.timeSlots, time_slot)) throw badRequest('Unknown time_slot.', {time_slot: 'invalid'});
  } else time_slot = '';
  /** @type {any} */
  const data = {
    customer_name: requireText(body.customer_name, 'customer_name', 100),
    customer_phone: strict ? requireText(body.customer_phone, 'customer_phone', 40) : optionalPhone(body.customer_phone, 'customer_phone'),
    fulfillment_type, fulfillment_date, time_slot,
    recipient_name: '', recipient_phone: '', delivery_address: '', delivery_note: '',
    message_card: ordering.messageCard.enabled ? optionalText(body.message_card, 'message_card', ordering.messageCard.maxLength) : '',
    note: optionalText(body.note, 'note', 500),
    currency: product.currency || store.currency,
    items: [line]
  };
  if (strict && !PHONE.test(data.customer_phone)) throw badRequest('customer_phone must be a phone number.', {customer_phone: 'invalid'});
  if (fulfillment_type === 'delivery') {
    data.recipient_name = requireText(body.recipient_name, 'recipient_name', 100);
    data.recipient_phone = requireText(body.recipient_phone, 'recipient_phone', 40);
    if (!PHONE.test(data.recipient_phone)) throw badRequest('recipient_phone must be a phone number.', {recipient_phone: 'invalid'});
    data.delivery_address = requireText(body.delivery_address, 'delivery_address', 300);
    data.delivery_note = optionalText(body.delivery_note, 'delivery_note', 300);
  }
  contactFields(body, data, () => true);
  Object.assign(data, orderTotals(data.items, {fulfillmentType: fulfillment_type, deliveryFee: ordering.fulfillment.deliveryFee}));
  return {data, product};
}
// What the repository must guard while inserting.
function limitsFor(state, data) {
  const slot = findSlot(state.store.ordering.timeSlots, data.time_slot);
  /** @type {any} */
  const stock = {};
  for (const line of data.items) stock[line.product_id] = state.products[line.product_id]?.stock ?? null;
  return {slotCapacity: slot?.capacity ?? null, dailyCapacity: state.store.ordering.dailyCapacity, stock};
}
async function orderCreate(request, env, url, params, admin, ctx) {
  const body = await readJson(request);
  const state = await orderState(env, request);
  if (state.deadlinePassed) throw new HttpError(409, 'deadline_passed', 'Pre-orders are closed.', {deadline: state.store.ordering.deadline});
  const {data, product} = orderFields(body, state, {strict: true});
  if (state.products[product.id]?.deadlinePassed) throw new HttpError(409, 'deadline_passed', 'Pre-orders for this product are closed.', {product_id: product.id});
  if (!PUBLIC_CONTACT_CHANNELS.includes(data.preferred_contact_channel)) throw badRequest(`preferred_contact_channel must be one of: ${PUBLIC_CONTACT_CHANNELS.join(', ')}.`, {preferred_contact_channel: 'required'});
  if (data.preferred_contact_channel === 'zalo' && !data.customer_zalo_phone) data.customer_zalo_phone = data.customer_phone;
  if (data.preferred_contact_channel === 'whatsapp' && !data.customer_whatsapp) data.customer_whatsapp = data.customer_phone;
  if (body.privacy_consent !== true) throw badRequest('privacy_consent must be true: the customer has to accept the privacy policy.', {privacy_consent: 'required'});
  Object.assign(data, {status: 'pending', source: 'public', privacy_consent: 1, privacy_consent_at: new Date().toISOString()});
  // Spam checks first (Turnstile, per-IP throttle), then the capacity the customer already saw, re-checked at write time.
  const guard = await publicRequestGuard(request, env, body);
  const day = state.capacity[data.fulfillment_date];
  if (day && (!day.open || (data.time_slot && day.slots[data.time_slot] && !day.slots[data.time_slot].open))) throw new HttpError(409, 'capacity_full', 'This time slot is full. Please choose another one.', {fulfillment_date: data.fulfillment_date, time_slot: data.time_slot});
  const stock = state.products[product.id];
  if (stock?.stock !== null && stock.remaining < data.items[0].quantity) throw new HttpError(409, 'sold_out', stock.remaining ? `Only ${stock.remaining} left.` : 'This product is sold out.', {product_id: product.id, remaining: stock.remaining});
  const existing = await ordersDb.findOpenOrder(env.DB, data);
  const order = existing || await ordersDb.createOrder(env.DB, data, limitsFor(state, data));
  if (!existing) {
    await guard.record();
    if (pushEnabled(env)) {
      const delivery = notifyAdmins(env, newOrderPayload(order, localized(product.name, state.store.defaultLanguage) || product.id)).catch(error => console.error('Push failed:', error));
      if (ctx?.waitUntil) ctx.waitUntil(delivery); else await delivery;
    }
  }
  const {id, status, customer_name, fulfillment_type, fulfillment_date, time_slot, total, currency, created_at, privacy_consent_at} = order;
  return json({order: {id, status, customer_name, fulfillment_type, fulfillment_date, time_slot, total, currency, items: order.items, created_at, privacy_consent: true, privacy_consent_at}, duplicate: Boolean(existing)}, existing ? 200 : 201);
}

// --- Admin ---------------------------------------------------------------------------------------------
async function orderDetail(env, request, order) {
  const [catalog, store] = await Promise.all([loadCatalog(env, request), loadStore(env, request)]);
  return json({order, notification: buildOrderNotification(order, catalog.byId, store), next: nextOrderStatuses(order.status, order.fulfillment_type)});
}
async function orderList(request, env, url) {
  const from = url.searchParams.get('from') || '', to = url.searchParams.get('to') || '';
  for (const [key, value] of [['from', from], ['to', to]]) if (value && !isIsoDate(value)) throw badRequest(`${key} must be a date in YYYY-MM-DD format.`, {[key]: 'invalid'});
  if (from && to && from > to) throw badRequest('from must not be after to.', {to: 'before_from'});
  const status = (url.searchParams.get('status') || '').split(',').map(s => s.trim()).filter(Boolean);
  for (const s of status) if (!ORDER_STATUSES.includes(s)) throw badRequest(`Unknown status filter "${s}".`, {status: 'invalid'});
  const fulfillment = url.searchParams.get('fulfillment') || '';
  if (fulfillment && !FULFILLMENT_TYPES.includes(fulfillment)) throw badRequest('Unknown fulfillment filter.', {fulfillment: 'invalid'});
  const notification = url.searchParams.get('notification') || '';
  if (notification && !NOTIFICATION_STATUSES.includes(notification)) throw badRequest('Unknown notification filter.', {notification: 'invalid'});
  const orders = await ordersDb.listOrders(env.DB, {from, to, slot: optionalText(url.searchParams.get('slot'), 'slot', 40), fulfillment, status, notification, q: optionalText(url.searchParams.get('q'), 'q', 100)});
  return json({orders});
}
// One day's bench: every active order grouped by time slot, pickups and deliveries apart.
async function orderSchedule(request, env, url) {
  const store = await loadStore(env, request);
  const {today} = bookingContext(env, store);
  const date = url.searchParams.get('date') || today;
  if (!isIsoDate(date)) throw badRequest('date must be a date in YYYY-MM-DD format.', {date: 'invalid'});
  const orders = await ordersDb.listOrders(env.DB, {from: date, to: date, status: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed']});
  const counts = await ordersDb.countCapacity(env.DB, date, date);
  const slots = store.ordering.timeSlots.map(slot => ({...slot, orders: orders.filter(o => o.time_slot === slot.id)}));
  const unslotted = orders.filter(o => !store.ordering.timeSlots.some(s => s.id === o.time_slot));
  return json({date, today, slots, unslotted, capacity: capacityOf(store.ordering, [date], counts)[date]});
}
async function orderStaffCreate(request, env) {
  const body = await readJson(request);
  const state = await orderState(env, request);
  const {data} = orderFields(body, state, {strict: false});
  Object.assign(data, {status: requireEnum(body.status, 'status', ORDER_STATUSES, 'confirmed'), source: 'admin'});
  const order = await ordersDb.createOrder(env.DB, data, limitsFor(state, data));
  return orderDetail(env, request, order).then(async response => new Response(response.body, {status: 201, headers: response.headers}));
}
async function orderUpdate(request, env, id) {
  const body = await readJson(request);
  /** @type {any} */
  const patch = {};
  const has = key => key in body;
  if (has('customer_name')) patch.customer_name = requireText(body.customer_name, 'customer_name', 100);
  if (has('customer_phone')) patch.customer_phone = optionalPhone(body.customer_phone, 'customer_phone');
  contactFields(body, patch, has);
  if (has('fulfillment_type')) patch.fulfillment_type = requireEnum(body.fulfillment_type, 'fulfillment_type', FULFILLMENT_TYPES);
  if (has('fulfillment_date')) { if (!isIsoDate(body.fulfillment_date)) throw badRequest('fulfillment_date must be a date in YYYY-MM-DD format.', {fulfillment_date: 'invalid'}); patch.fulfillment_date = body.fulfillment_date; }
  if (has('time_slot')) patch.time_slot = optionalText(body.time_slot, 'time_slot', 40);
  /** @type {[string, number][]} */
  const texts = [['recipient_name', 100], ['delivery_address', 300], ['delivery_note', 300], ['message_card', 500], ['note', 1000]];
  for (const [key, max] of texts) if (has(key)) patch[key] = optionalText(body[key], key, max);
  if (has('recipient_phone')) patch.recipient_phone = optionalPhone(body.recipient_phone, 'recipient_phone');
  if (has('delivery_fee')) { if (!Number.isInteger(body.delivery_fee) || body.delivery_fee < 0) throw badRequest('delivery_fee must be a whole number >= 0.', {delivery_fee: 'invalid'}); patch.delivery_fee = Number(body.delivery_fee); }
  if (has('status')) patch.status = requireEnum(body.status, 'status', ORDER_STATUSES);
  if (!Object.keys(patch).length) throw badRequest('Nothing to update.');
  const order = await ordersDb.updateOrder(env.DB, id, patch);
  if (!order) throw notFound(`Unknown order ${id}.`);
  return orderDetail(env, request, order);
}
// The status buttons: only the transitions nextOrderStatuses() offers (PATCH accepts any status for corrections).
async function orderStatus(request, env, id) {
  const {status} = await readJson(request);
  const current = await ordersDb.getOrder(env.DB, id);
  if (!current) throw notFound(`Unknown order ${id}.`);
  const allowed = nextOrderStatuses(current.status, current.fulfillment_type);
  if (!allowed.includes(status)) throw new HttpError(409, 'invalid_transition', `An order that is ${current.status} can only become: ${allowed.join(', ') || 'nothing'}.`, {status: current.status, next: allowed});
  return orderDetail(env, request, await ordersDb.updateOrder(env.DB, id, {status}));
}
async function orderNotification(request, env, id) {
  const body = await readJson(request);
  const status = requireEnum(body.status, 'status', NOTIFICATION_STATUSES);
  const channel = status === 'sent' ? requireEnum(body.channel, 'channel', NOTIFICATION_CHANNELS) : '';
  const note = optionalText(body.note, 'note', 500);
  if (!await ordersDb.getOrder(env.DB, id)) throw notFound(`Unknown order ${id}.`);
  return orderDetail(env, request, await ordersDb.setOrderNotification(env.DB, id, {status, channel, note}));
}

export const orderRoutes = route => [
  route('GET', /^\/api\/orders\/config$/, orderConfig),
  route('POST', /^\/api\/orders$/, orderCreate, {csrf: true}),
  route('GET', /^\/api\/admin\/orders$/, orderList, {auth: true}),
  route('GET', /^\/api\/admin\/orders\/schedule$/, orderSchedule, {auth: true}),
  route('POST', /^\/api\/admin\/orders$/, orderStaffCreate, {auth: true}),
  route('GET', /^\/api\/admin\/orders\/([^/]+)$/, async (req, env, url, [id]) => {
    const order = await ordersDb.getOrder(env.DB, id);
    if (!order) throw notFound(`Unknown order ${id}.`);
    return orderDetail(env, req, order);
  }, {auth: true}),
  route('PATCH', /^\/api\/admin\/orders\/([^/]+)$/, (req, env, url, [id]) => orderUpdate(req, env, id), {auth: true}),
  route('POST', /^\/api\/admin\/orders\/([^/]+)\/status$/, (req, env, url, [id]) => orderStatus(req, env, id), {auth: true}),
  route('POST', /^\/api\/admin\/orders\/([^/]+)\/notification$/, (req, env, url, [id]) => orderNotification(req, env, id), {auth: true}),
  // Orders are never erased: DELETE cancels, which frees the slot and the stock.
  route('DELETE', /^\/api\/admin\/orders\/([^/]+)$/, async (req, env, url, [id]) => {
    const order = await ordersDb.updateOrder(env.DB, id, {status: 'cancelled'});
    if (!order) throw notFound(`Unknown order ${id}.`);
    return orderDetail(env, req, order);
  }, {auth: true})
];
