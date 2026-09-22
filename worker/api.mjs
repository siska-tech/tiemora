// /api/* handlers. Public routes read availability and accept reservation requests; everything
// under /api/admin/* and the per-product inventory list need an authenticated admin (see auth.mjs).
import {json, HttpError, badRequest, notFound, isIsoDate, requireDateRange, requireId, requireText, optionalText, requireEnum, readJson} from './util.mjs';
import {authenticate, authMode, checkPassword, createSession, sessionCookie, csrfSafe} from './auth.mjs';
import {loadCatalog} from './catalog.mjs';
import {loadStore, bookingContext} from './store.mjs';
import * as db from './db.mjs';
import {CONTACT_CHANNELS, PUBLIC_CONTACT_CHANNELS, NOTIFICATION_CHANNELS, NOTIFICATION_STATUSES, PHONE_PATTERN, normalizeMessengerUrl, buildNotification} from '../core/notifications/index.mjs';
import {requestDatesError} from '../core/booking/rules.mjs';
import {localized} from '../core/i18n/localized.mjs';
import {publicRequestGuard, turnstileStatus} from './public-requests.mjs';
import {pushEnabled, pushStatus, notifyAdmins, newRequestPayload} from './push.mjs';

// Today (in the store's zone) and the booking limits, from store.json with env overrides.
const context = async (request, env) => bookingContext(env, await loadStore(env, request));
const PHONE = PHONE_PATTERN;
function optionalPhone(value, field) {
  const text = optionalText(value, field, 40);
  if (text && !PHONE.test(text)) throw badRequest(`${field} must be a phone number.`, {[field]: 'invalid'});
  return text;
}
// Contact preferences shared by the admin form and the public request form.
function contactFields(body, data, has) {
  if (has('preferred_contact_channel')) data.preferred_contact_channel = requireEnum(body.preferred_contact_channel || null, 'preferred_contact_channel', CONTACT_CHANNELS, '');
  if (has('customer_whatsapp')) data.customer_whatsapp = optionalPhone(body.customer_whatsapp, 'customer_whatsapp');
  if (has('customer_zalo_phone')) data.customer_zalo_phone = optionalPhone(body.customer_zalo_phone, 'customer_zalo_phone');
  if (has('customer_messenger_url')) {
    const url = normalizeMessengerUrl(optionalText(body.customer_messenger_url, 'customer_messenger_url', 300));
    if (url === null) throw badRequest('customer_messenger_url must be a web address such as https://m.me/....', {customer_messenger_url: 'invalid'});
    data.customer_messenger_url = url;
  }
  return data;
}

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

// --- Public ---------------------------------------------------------------------------------------
async function publicAvailability(request, env, url, productId) {
  const {today, buffer} = await context(request, env);
  const period = periodFrom(url, today);
  const catalog = await loadCatalog(env, request);
  const summaries = await db.availabilityByProduct(env.DB, period.from, period.to, {buffer, today});
  const managed = product => product.inventory?.managed === true;
  if (productId) {
    const product = catalog.byId.get(productId);
    if (!product) throw notFound(`Unknown product ${productId}.`);
    let summary = summaries.get(productId);
    // ?size=L narrows the answer to items of that size (the booking form asks per size).
    const size = optionalText(url.searchParams.get('size'), 'size', 20);
    if (size && managed(product)) {
      const items = (await db.itemsForProduct(env.DB, productId, {from: period.from, to: period.to, buffer, today})).filter(i => i.size === size && i.status !== 'inactive');
      const available = items.filter(i => i.available).length;
      summary = {total: items.length, available, status: available > 0 ? (available < items.length && available <= 1 ? 'low' : 'available') : items.length ? 'rented' : 'unavailable'};
    }
    return json({...availabilityResponse(productId, period, summary), ...(size ? {size} : {}), managed: managed(product)}, 200, {'cache-control': 'no-cache'});
  }
  const products = {};
  for (const product of catalog.products) products[product.id] = {...availabilityResponse(product.id, {explicit: false}, summaries.get(product.id)), managed: managed(product)};
  const body = period.explicit ? {from: period.from, to: period.to, products} : {products};
  return json(body, 200, {'cache-control': 'no-cache'});
}

// --- Admin: inventory -----------------------------------------------------------------------------
async function productInventory(request, env, url, productId) {
  const {today, buffer} = await context(request, env);
  const from = url.searchParams.get('from'), to = url.searchParams.get('to');
  const period = from || to ? requireDateRange(from ?? to, to ?? from) : {};
  const exclude = url.searchParams.get('exclude') || '';
  const items = await db.itemsForProduct(env.DB, productId, {...period, buffer, exclude, today});
  return json({productId, ...period, items});
}
async function inventoryList(request, env, url) {
  const status = url.searchParams.get('status') || '';
  if (status && !db.ITEM_STATUSES.includes(status)) throw badRequest('Unknown status filter.', {status: 'invalid'});
  return json({items: await db.listInventory(env.DB, {product_id: url.searchParams.get('product_id') || '', status})});
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

// --- Public: reservation requests ------------------------------------------------------------------
async function reservationRequestCreate(request, env, url, params, admin, ctx) {
  const body = await readJson(request);
  const {today, buffer, maxRentalDays, maxDaysAhead} = await context(request, env);
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
  data.start_date = body.start_date; data.end_date = body.end_date;
  const dateProblem = requestDatesError(data, {today, maxRentalDays, maxDaysAhead});
  if (dateProblem) {
    const messages = {invalid: `${dateProblem.field} must be a date in YYYY-MM-DD format.`, before_start: 'start_date must not be after end_date.', past: 'start_date must not be in the past.', too_far: `start_date must be within ${maxDaysAhead} days.`, too_long: `A rental can last at most ${maxRentalDays} days.`};
    throw badRequest(messages[dateProblem.code], {[dateProblem.field]: dateProblem.code});
  }
  // Spam checks (Turnstile when configured, then the per-IP throttle) run before anything is written.
  const guard = await publicRequestGuard(request, env, body);
  // The customer already saw "available", but the stock is checked again at the moment of writing.
  if (!await db.productFree(env.DB, product_id, {from: data.start_date, to: data.end_date, size, buffer, today})) {
    throw new HttpError(409, 'unavailable', 'This item is not available for the selected dates.', {product_id, size, from: data.start_date, to: data.end_date});
  }
  const existing = await db.findOpenRequest(env.DB, data);
  const reservation = existing || await db.createReservation(env.DB, data, {buffer});
  if (!existing) {
    await guard.record();
    // Tell the store's phones. Delivery runs after the response; a push failure never fails the request.
    if (pushEnabled(env)) {
      const store = await loadStore(env, request);
      const delivery = notifyAdmins(env, newRequestPayload(reservation, localized(product.name, store.defaultLanguage) || product_id)).catch(error => console.error('Push failed:', error));
      if (ctx?.waitUntil) ctx.waitUntil(delivery); else await delivery;
    }
  }
  const {id, status, customer_name, start_date, end_date, request_product_id, request_size, created_at, privacy_consent_at} = reservation;
  return json({request: {id, status, customer_name, start_date, end_date, product_id: request_product_id, size: request_size, created_at, privacy_consent: true, privacy_consent_at}, duplicate: Boolean(existing)}, existing ? 200 : 201);
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
  route('GET', /^\/api\/admin\/session$/, (req, env, url, m, admin) => json({authenticated: true, mode: admin.mode, user: admin.user}), {auth: true}),
  route('GET', /^\/api\/admin\/dashboard$/, async (req, env) => {
    const [catalog, {today}] = await Promise.all([loadCatalog(env, req), context(req, env)]);
    return json({products: catalog.products.length, ...await db.dashboard(env.DB, today)});
  }, {auth: true}),
  // The in-admin notification centre: today's pickups/returns, overdue rentals, new requests, customers still to notify.
  route('GET', /^\/api\/admin\/notifications$/, async (req, env) => json(await db.alerts(env.DB, (await context(req, env)).today)), {auth: true}),
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
    const params = path.match(match.pattern).slice(1).map(decodeURIComponent);
    return await match.handler(request, env, url, params, admin, ctx);
  } catch (error) {
    if (error instanceof HttpError) return json({error: error.error, message: error.message, ...error.extra}, error.status);
    console.error('API failure:', error);
    return json({error: 'internal_error', message: 'Unexpected server error.'}, 500);
  }
}
