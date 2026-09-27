// Rentals on the clock, through the Worker: the pick-up times a customer is offered, what the
// server accepts, and what it refuses however the form looked a moment earlier.
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../worker/index.mjs';
import {resetCatalogCache} from '../../worker/catalog.mjs';
import {resetStoreCache} from '../../worker/store.mjs';
import {migratedDatabase} from '../d1-shim.mjs';
import {todayIn, shiftDate} from '../../core/booking/dates.mjs';

const catalog = [
  {id: 'ad-0005', price: {rental: 119000}, currency: 'VND', name: {vi: 'Sản phẩm năm'}, category: 'rental', sizes: ['M', 'L'], inventory: {managed: true}, images: [], videos: []}
];
const ORIGIN = 'https://store.test';
const today = todayIn('Asia/Ho_Chi_Minh');
const day = n => shiftDate(today, n);

// Every weekday, so the tests do not depend on which day they run on.
const everyDay = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map(n => [n, [{start: '07:00', end: '08:30'}, {start: '18:30', end: '21:00'}]]));
const storeWith = extra => ({
  timezone: 'Asia/Ho_Chi_Minh',
  booking: {slotMinutes: 30, handoff: {weekly: everyDay}, turnaround: {strategy: 'overnight', returnCutoff: '20:00', readyNextDayAt: '07:00'}, ...extra}
});

async function harness(store = storeWith({}), overrides = {}) {
  resetCatalogCache(); resetStoreCache();
  const env = {
    DB: await migratedDatabase(),
    ASSETS: {fetch: async request => {
      const path = new URL(request.url).pathname;
      if (path === '/catalog.json') return Response.json(catalog);
      if (path === '/store.json') return Response.json(store);
      return new Response('', {status: 404});
    }},
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
  const book = (body, headers = {}) => call('POST', '/api/reservation-requests', {body, headers: {'x-requested-with': 'fetch', 'cf-connecting-ip': '203.0.113.9', ...headers}});
  return {env, call, admin, book};
}
const request = extra => ({
  product_id: 'ad-0005', size: 'L', customer_name: 'Nguyễn Mai', customer_phone: '0901234567',
  preferred_contact_channel: 'zalo', start_date: day(3), start_time: '19:00', rental_days: 1,
  privacy_consent: true, ...extra
});
const timeline = (call, extra = '') => call('GET', `/api/products/ad-0005/timeline?date=${day(3)}&days=1${extra}`);
const slotAt = (data, time) => data.slots.find(slot => slot.time === time);


test('editing timed dates updates the stock hold and rejects conflicting extensions', async () => {
  const {admin, book} = await harness();
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  const first = await book(request());
  const url = `/api/admin/reservations/${first.data.request.id}`;
  assert.equal((await admin('POST', url + '/confirm')).status, 200);
  const edited = await admin('PATCH', url, {body: {end_date: day(6)}});
  assert.equal(edited.status, 200);
  assert.equal(edited.data.reservation.rental_days, 3);
  assert.equal(edited.data.reservation.ready_at, day(7) + 'T07:00');
  assert.equal((await book(request({start_date: day(5), customer_phone: '0901234568'}))).status, 409);
  assert.equal((await admin('PATCH', url, {body: {end_date: day(3)}})).status, 400);
  assert.equal((await admin('PATCH', url, {body: {end_date: day(4)}})).status, 200);
  const later = await book(request({start_date: day(5), customer_phone: '0901234568'}));
  assert.equal((await admin('POST', `/api/admin/reservations/${later.data.request.id}/confirm`)).status, 200);
  assert.equal((await admin('PATCH', url, {body: {end_date: day(6)}})).status, 409);
  assert.equal((await admin('GET', url)).data.reservation.end_date, day(4));
});

test('moving pickup updates rental length while leaving the chosen return date intact', async () => {
  const {admin, book} = await harness();
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  const first = await book(request({rental_days: 3}));
  const edited = await admin('PATCH', `/api/admin/reservations/${first.data.request.id}`, {body: {start_date: day(4)}});
  assert.equal(edited.status, 200);
  assert.equal(edited.data.reservation.rental_days, 2);
  assert.equal(edited.data.reservation.start_at, day(4) + 'T19:00');
  assert.equal(edited.data.reservation.end_date, day(6));
  assert.equal(edited.data.reservation.ready_at, day(7) + 'T07:00');
});

test('different fitting times are distinct requests, identical retries are deduplicated', async () => {
  const {admin, book} = await harness(storeWith({fitting: {enabled: true, minutes: 30, bufferMinutes: 0}}));
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  const first = await book(request({purpose: 'fitting', start_time: '07:00'}));
  const second = await book(request({purpose: 'fitting', start_time: '19:00'}));
  assert.equal(second.status, 201);
  assert.equal(second.data.request.start_time, '19:00');
  assert.notEqual(second.data.request.id, first.data.request.id);
  const retry = await book(request({purpose: 'fitting', start_time: '19:00'}));
  assert.equal(retry.status, 200);
  assert.equal(retry.data.duplicate, true);
  assert.equal(retry.data.request.id, second.data.request.id);
});

test('different sizes are distinct requests', async () => {
  const {admin, book} = await harness();
  for (const [n, size] of ['L', 'M'].entries()) await admin('POST', '/api/admin/inventory', {body: {id: `ad-0005-0${n + 1}`, product_id: 'ad-0005', size}});
  const first = await book(request({size: 'L'}));
  const second = await book(request({size: 'M'}));
  assert.equal(second.status, 201);
  assert.equal(second.data.request.size, 'M');
  assert.notEqual(second.data.request.id, first.data.request.id);
});

test('closed exceptions and empty weekly days reject requests with omitted times', async () => {
  const {admin, book} = await harness(storeWith({handoff: {weekly: {'0': [{start: '07:00', end: '08:00'}]}}}));
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  await admin('PUT', `/api/admin/handoff-exceptions/${day(3)}`, {body: {closed: true}});
  const result = await book(request({start_time: undefined}));
  assert.equal(result.status, 400);
  assert.equal(result.data.fields.start_time, 'not_allowed');
  const weekday = [4, 5, 6].map(day).find(date => new Date(date + 'T00:00:00Z').getUTCDay() !== 0);
  assert.equal((await book(request({start_date: weekday, start_time: undefined}))).status, 400);
});

test('offset handoff windows expose slots accepted by the request API, including date exceptions', async () => {
  const weekly = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map(n => [n, [{start: '07:15', end: '08:45'}]]));
  const {admin, call, book} = await harness(storeWith({handoff: {weekly}}));
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  const result = await timeline(call);
  assert.deepEqual(result.data.slots.filter(s => s.state === 'available').map(s => s.time), ['07:15', '07:45', '08:15']);
  assert.equal(slotAt(result.data, '07:30').state, 'handoff');
  assert.equal((await book(request({start_time: '07:15'}))).status, 201);
  await admin('PUT', `/api/admin/handoff-exceptions/${day(3)}`, {body: {windows: [{start: '18:15', end: '19:15'}]}});
  const exception = await timeline(call);
  assert.deepEqual(exception.data.slots.filter(s => s.state === 'available').map(s => s.time), ['18:15', '18:45']);
  assert.equal((await book(request({start_time: '18:15'}))).status, 201);
});

test('timed inventory candidates allow adjacent fittings and reject actual overlap', async () => {
  const {admin, book} = await harness(storeWith({fitting: {enabled: true, minutes: 30}}));
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  const visit = await book(request({purpose: 'fitting', start_time: '19:00'}));
  await admin('POST', `/api/admin/reservations/${visit.data.request.id}/confirm`);
  const url = `/api/products/ad-0005/inventory?from=${day(3)}&to=${day(3)}&purpose=fitting`;
  assert.equal((await admin('GET', url + '&start_time=19:30')).data.items[0].available, true);
  assert.equal((await admin('GET', url + '&start_time=19:15')).data.items[0].available, false);
  assert.equal((await admin('GET', url + '&start_time=bad')).status, 400);
});

test('fixed pickup slots agree between timeline and submission, with exceptions taking priority', async () => {
  const {admin, call, book} = await harness({booking: {timeSlots: [{id: 'evening', start: '19:15', end: '20:00'}]}});
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  const line = await timeline(call);
  assert.deepEqual(line.data.slots.filter(s => s.state === 'available').map(s => s.time), ['19:15']);
  assert.equal((await book(request({start_time: '19:15'}))).status, 201);
  assert.equal((await book(request({start_time: '19:30'}))).status, 400);
  await admin('PUT', `/api/admin/handoff-exceptions/${day(3)}`, {body: {closed: true}});
  assert.ok((await timeline(call)).data.slots.every(s => s.state !== 'available'));
  assert.equal((await book(request({start_time: '19:15'}))).status, 400);
});
