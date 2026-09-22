// Public reservation requests, the admin confirm step and the customer-notification record,
// exercised through the Worker over the node:sqlite D1 shim (like worker.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../worker/index.mjs';
import {resetCatalogCache} from '../../worker/catalog.mjs';
import {resetStoreCache} from '../../worker/store.mjs';
import {migratedDatabase} from '../d1-shim.mjs';
import {todayIn, shiftDate} from '../../core/booking/dates.mjs';

const catalog = [
  {id: 'ad-0005', name: {vi: 'Sản phẩm năm'}, category: 'rental', sizes: ['M', 'L'], inventory: {managed: true}, images: [], videos: []},
  {id: 'ad-0001', name: {vi: 'Sản phẩm một'}, category: 'rental', inventory: {managed: true}, images: [], videos: []},
  {id: 'km-0001', name: {vi: 'Phụ kiện'}, category: 'accessories', available: true, images: [], videos: []}
];
const ORIGIN = 'https://store.test';
const today = todayIn('Asia/Ho_Chi_Minh');
const day = n => shiftDate(today, n);

async function harness(overrides = {}) {
  resetCatalogCache();resetStoreCache();
  const env = {
    DB: await migratedDatabase(),
    ASSETS: {fetch: async request => new URL(request.url).pathname === '/catalog.json' ? Response.json(catalog) : new Response('', {status: 404})},
    ADMIN_PASSWORD: 'pw', RESERVATION_BUFFER_DAYS: '0', STORE_TIMEZONE: 'Asia/Ho_Chi_Minh', ...overrides
  };
  const call = async (method, path, {body, headers = {}} = {}) => {
    const init = {method, headers: {...headers}};
    if (body !== undefined) { init.body = JSON.stringify(body); init.headers['content-type'] ??= 'application/json'; }
    const response = await worker.fetch(new Request(ORIGIN + path, init), env);
    return {status: response.status, data: await response.json().catch(() => null)};
  };
  const login = await worker.fetch(new Request(ORIGIN + '/api/admin/login', {method: 'POST', headers: {'content-type': 'application/json', 'x-requested-with': 'fetch'}, body: JSON.stringify({password: 'pw'})}), env);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const admin = (method, path, options = {}) => call(method, path, {...options, headers: {cookie, 'x-requested-with': 'fetch', ...options.headers}});
  const publicPost = (body, headers = {}) => call('POST', '/api/reservation-requests', {body, headers: {'x-requested-with': 'fetch', 'cf-connecting-ip': '203.0.113.7', ...headers}});
  return {env, call, admin, publicPost};
}
const request = extra => ({product_id: 'ad-0005', size: 'L', customer_name: 'Nguyễn Mai', customer_phone: '0901234567', preferred_contact_channel: 'zalo', start_date: day(3), end_date: day(5), note: 'Chụp ảnh cưới', privacy_consent: true, ...extra});

test('a public request becomes a pending booking that holds no item; staff confirm it and an item is assigned', async () => {
  const {admin, publicPost} = await harness();
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  const created = await publicPost(request());
  assert.equal(created.status, 201, JSON.stringify(created.data));
  assert.match(created.data.request.id, /^rsv-\d{8}-[a-z0-9]{4}$/);
  assert.equal(created.data.request.status, 'pending');
  assert.equal(created.data.request.product_id, 'ad-0005');
  assert.equal(created.data.request.size, 'L');
  assert.equal(created.data.request.note, undefined);
  const id = created.data.request.id;
  // Nothing is held: the item is still free for those dates, and the request is not "inventory".
  const free = await admin('GET', `/api/products/ad-0005/inventory?from=${day(3)}&to=${day(5)}`);
  assert.equal(free.data.items[0].available, true);
  const detail = await admin('GET', `/api/admin/reservations/${id}`);
  assert.equal(detail.data.reservation.source, 'public');
  assert.equal(detail.data.reservation.request_product_id, 'ad-0005');
  assert.equal(detail.data.reservation.preferred_contact_channel, 'zalo');
  // Zalo was chosen without a separate number: the main phone is recorded as the Zalo number.
  assert.equal(detail.data.reservation.customer_zalo_phone, '0901234567');
  assert.equal(detail.data.reservation.privacy_consent, 1);
  assert.match(detail.data.reservation.privacy_consent_at, /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/);
  assert.equal(created.data.request.privacy_consent, true);
  assert.deepEqual(detail.data.reservation.items, []);
  assert.equal(detail.data.notification.zalo.phone, '0901234567');
  assert.equal(detail.data.notification.preferred, 'zalo');
  // It shows up for staff as a new reservation and is not yet a customer notification to do.
  const alerts = await admin('GET', '/api/admin/notifications');
  assert.deepEqual(alerts.data.newReservations.map(r => r.id), [id]);
  assert.deepEqual(alerts.data.pendingNotifications, []);
  // Confirming assigns the free item, re-checks the period and builds the message.
  const confirmed = await admin('POST', `/api/admin/reservations/${id}/confirm`, {body: {}});
  assert.equal(confirmed.status, 200, JSON.stringify(confirmed.data));
  assert.equal(confirmed.data.reservation.status, 'confirmed');
  assert.deepEqual(confirmed.data.reservation.items.map(i => i.inventory_item_id), ['ad-0005-01']);
  assert.match(confirmed.data.notification.messages.vi, /Sản phẩm: Sản phẩm năm\nSize: L\n/);
  assert.equal(confirmed.data.notification.whatsapp.number, '84901234567');
  assert.equal((await admin('GET', `/api/products/ad-0005/inventory?from=${day(3)}&to=${day(5)}`)).data.items[0].available, false);
  assert.equal((await admin('POST', `/api/admin/reservations/${id}/confirm`, {body: {}})).status, 409);
  // Now the customer is waiting to hear from the store.
  const after = await admin('GET', '/api/admin/notifications');
  assert.deepEqual(after.data.pendingNotifications.map(r => r.id), [id]);
  assert.deepEqual(after.data.newReservations, []);
  assert.equal((await admin('GET', '/api/admin/dashboard')).data.pendingNotifications.length, 1);
});

test('confirming fails clearly when the requested product (or size) is no longer free', async () => {
  const {admin, publicPost} = await harness();
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-02', product_id: 'ad-0005', size: 'M'}});
  const first = (await publicPost(request())).data.request;
  // Staff book the only L for someone else in the meantime.
  await admin('POST', '/api/admin/reservations', {body: {customer_name: 'Lan', start_date: day(4), end_date: day(6), status: 'confirmed', items: ['ad-0005-01']}});
  const clash = await admin('POST', `/api/admin/reservations/${first.id}/confirm`, {body: {}});
  assert.equal(clash.status, 409);
  assert.equal(clash.data.error, 'inventory_unavailable');
  assert.deepEqual(clash.data.otherSizes, ['M']);
  assert.equal((await admin('GET', `/api/admin/reservations/${first.id}`)).data.reservation.status, 'pending');
  // The status cannot be pushed past pending without an item either.
  assert.equal((await admin('PATCH', `/api/admin/reservations/${first.id}`, {body: {status: 'confirmed'}})).status, 400);
  // Staff may pick another item by hand (the form), which confirms the usual way.
  const manual = await admin('PATCH', `/api/admin/reservations/${first.id}`, {body: {status: 'confirmed', items: ['ad-0005-02']}});
  assert.equal(manual.status, 200, JSON.stringify(manual.data));
  assert.equal(manual.data.reservation.items[0].inventory_item_id, 'ad-0005-02');
  // A new request for the taken dates is refused at submission even though the size exists.
  const later = await publicPost(request({customer_phone: '0988000000'}));
  assert.equal(later.status, 409);
  assert.equal(later.data.error, 'unavailable');
});

test('public request validation: only pending, only catalog products with stock, sane dates, phone, size', async () => {
  const {admin, publicPost, call} = await harness();
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  const expect = async (body, status, error) => { const r = await publicPost(body); assert.equal(r.status, status, JSON.stringify([body, r.data])); if (error) assert.equal(r.data.error, error); return r; };
  await expect(request({product_id: 'zz-9999'}), 400);
  await expect(request({product_id: 'km-0001'}), 400);
  await expect(request({product_id: 'ad-0001'}), 409, 'unavailable');
  await expect(request({size: 'XL'}), 400);
  await expect(request({customer_name: ''}), 400);
  await expect(request({customer_phone: 'call me'}), 400);
  await expect(request({customer_phone: ''}), 400);
  await expect(request({start_date: day(-1), end_date: day(1)}), 400);
  await expect(request({start_date: day(5), end_date: day(3)}), 400);
  await expect(request({start_date: day(400), end_date: day(401)}), 400);
  await expect(request({start_date: day(1), end_date: day(90)}), 400);
  await expect(request({start_date: '2026-13-01'}), 400);
  await expect(request({preferred_contact_channel: 'pigeon'}), 400);
  await expect(request({preferred_contact_channel: 'other'}), 400);
  await expect(request({preferred_contact_channel: ''}), 400);
  await expect(request({privacy_consent: false}), 400, 'validation_error');
  await expect(request({privacy_consent: 'true'}), 400);
  await expect(request({privacy_consent: undefined}), 400);
  // WhatsApp with its own number keeps it; Messenger needs no link at all.
  const wa = await publicPost(request({preferred_contact_channel: 'whatsapp', customer_whatsapp: '+84 91 000 0000', customer_phone: '0977000001'}), {'cf-connecting-ip': '198.51.100.1'});
  assert.equal(wa.status, 201, JSON.stringify(wa.data));
  assert.equal((await admin('GET', `/api/admin/reservations/${wa.data.request.id}`)).data.reservation.customer_whatsapp, '+84 91 000 0000');
  assert.equal((await publicPost(request({preferred_contact_channel: 'messenger', customer_messenger_url: '', customer_phone: '0977000002'}), {'cf-connecting-ip': '198.51.100.2'})).status, 201);
  await expect(request({customer_messenger_url: 'javascript:alert(1)'}), 400);
  await expect(request({note: 'x'.repeat(501)}), 400);
  // A public request can never be created as anything but pending, whatever the body says.
  const sneaky = await expect(request({status: 'confirmed', items: ['ad-0005-01']}), 201);
  assert.equal(sneaky.data.request.status, 'pending');
  assert.deepEqual((await admin('GET', `/api/admin/reservations/${sneaky.data.request.id}`)).data.reservation.items, []);
  // The same customer re-sending the same request gets the first one back instead of a duplicate.
  const again = await expect(request(), 200);
  assert.equal(again.data.duplicate, true);
  assert.equal(again.data.request.id, sneaky.data.request.id);
  assert.equal((await admin('GET', '/api/admin/reservations?status=pending')).data.reservations.length, 3);
  // Cross-site posts and non-JSON bodies are refused.
  assert.equal((await call('POST', '/api/reservation-requests', {body: request()})).status, 403);
  assert.equal((await call('POST', '/api/reservation-requests', {body: request(), headers: {'x-requested-with': 'fetch', origin: 'https://evil.example'}})).status, 403);
  assert.deepEqual((await call('GET', '/api/reservation-requests/config')).data, {turnstileSiteKey: '', turnstile: {enabled: false, siteKeySet: false, secretSet: false}});
});

test('the per-IP throttle and Turnstile (when configured) stop a flood before anything is written', async () => {
  const {admin, publicPost} = await harness();
  for (let n = 1; n <= 4; n++) await admin('POST', '/api/admin/inventory', {body: {id: `ad-0005-0${n}`, product_id: 'ad-0005', size: 'L'}});
  for (let n = 0; n < 3; n++) assert.equal((await publicPost(request({customer_phone: `090000000${n}`}))).status, 201);
  const fourth = await publicPost(request({customer_phone: '0900000009'}));
  assert.equal(fourth.status, 429);
  assert.equal(fourth.data.error, 'too_many_requests');
  // Another connection is unaffected.
  assert.equal((await publicPost(request({customer_phone: '0900000009'}), {'cf-connecting-ip': '198.51.100.9'})).status, 201);
  // With a Turnstile secret configured the token is mandatory.
  const guarded = await harness({TURNSTILE_SECRET_KEY: 'secret', TURNSTILE_SITE_KEY: 'site'});
  await guarded.admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  const missing = await guarded.publicPost(request());
  assert.equal(missing.status, 400);
  assert.equal(missing.data.error, 'turnstile_required');
  assert.deepEqual((await guarded.call('GET', '/api/reservation-requests/config')).data, {turnstileSiteKey: 'site', turnstile: {enabled: true, siteKeySet: true, secretSet: true}});
  // Half a configuration (secret only) must not lock customers out: no check, and the page is told what is missing.
  const half = await harness({TURNSTILE_SECRET_KEY: 'secret'});
  await half.admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  assert.equal((await half.publicPost(request())).status, 201);
  assert.deepEqual((await half.call('GET', '/api/reservation-requests/config')).data, {turnstileSiteKey: '', turnstile: {enabled: false, siteKeySet: false, secretSet: true}});
  assert.equal((await guarded.admin('GET', '/api/admin/reservations')).data.reservations.length, 0);
});

test('contact details are saved with a booking and the notification record is kept by staff', async () => {
  const {admin} = await harness();
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  const body = {customer_name: 'Mai', customer_phone: '0901234567', preferred_contact_channel: 'whatsapp', customer_whatsapp: '+84 90 123 4567', customer_zalo_phone: '', customer_messenger_url: 'm.me/mai.nguyen', start_date: '2026-10-01', end_date: '2026-10-03', status: 'confirmed', items: ['ad-0005-01']};
  const created = await admin('POST', '/api/admin/reservations', {body});
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const r = created.data.reservation;
  assert.equal(r.preferred_contact_channel, 'whatsapp');
  assert.equal(r.customer_messenger_url, 'https://m.me/mai.nguyen');
  assert.equal(r.notification_status, 'not_sent');
  assert.equal(r.source, 'admin');
  assert.equal((await admin('POST', '/api/admin/reservations', {body: {...body, customer_messenger_url: 'javascript:x', items: []}})).status, 400);
  // The detail carries the ready-made texts and links.
  const detail = await admin('GET', `/api/admin/reservations/${r.id}`);
  assert.equal(detail.data.notification.whatsapp.number, '84901234567');
  assert.equal(detail.data.notification.messenger.url, 'https://m.me/mai.nguyen');
  assert.match(detail.data.notification.messages.vi, /Mã đặt chỗ: rsv-/);
  // Unnotified confirmed bookings are listed until staff mark them sent.
  assert.deepEqual((await admin('GET', '/api/admin/reservations?notification=not_sent')).data.reservations.map(x => x.id), [r.id]);
  assert.equal((await admin('POST', `/api/admin/reservations/${r.id}/notification`, {body: {status: 'sent'}})).status, 400);
  assert.equal((await admin('POST', `/api/admin/reservations/${r.id}/notification`, {body: {status: 'sent', channel: 'pigeon'}})).status, 400);
  const sent = await admin('POST', `/api/admin/reservations/${r.id}/notification`, {body: {status: 'sent', channel: 'whatsapp', note: 'sent from shop phone'}});
  assert.equal(sent.status, 200, JSON.stringify(sent.data));
  assert.equal(sent.data.reservation.notification_status, 'sent');
  assert.equal(sent.data.reservation.notification_channel, 'whatsapp');
  assert.match(sent.data.reservation.notification_sent_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(sent.data.reservation.notification_note, 'sent from shop phone');
  assert.deepEqual((await admin('GET', '/api/admin/reservations?notification=not_sent')).data.reservations, []);
  assert.deepEqual((await admin('GET', '/api/admin/notifications')).data.pendingNotifications, []);
  // Editing the booking afterwards keeps the record; resetting clears it.
  const edited = await admin('PATCH', `/api/admin/reservations/${r.id}`, {body: {note: 'deposit paid'}});
  assert.equal(edited.data.reservation.notification_status, 'sent');
  const reset = await admin('POST', `/api/admin/reservations/${r.id}/notification`, {body: {status: 'not_sent'}});
  assert.equal(reset.data.reservation.notification_status, 'not_sent');
  assert.equal(reset.data.reservation.notification_channel, '');
  assert.equal(reset.data.reservation.notification_sent_at, '');
  assert.equal((await admin('GET', '/api/admin/reservations?notification=maybe')).status, 400);
});
