// Rentals on the clock, through the Worker: the pick-up times a customer is offered, what the
// server accepts, and what it refuses however the form looked a moment earlier.
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../worker/index.mjs';
import {resetCatalogCache} from '../../worker/catalog.mjs';
import {resetStoreCache} from '../../worker/store.mjs';
import {migratedDatabase} from '../d1-shim.mjs';
import {todayIn, shiftDate} from '../../core/booking/dates.mjs';
import {readyAt} from '../../core/booking/schedule.mjs';

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

test('24-hour rentals expose 48 slots, accept late pickup, and keep date exceptions', async () => {
  const weekly=Object.fromEntries([0,1,2,3,4,5,6].map(n=>[n,[{start:'00:00',end:'24:00'}]]));
  const {admin,call,book}=await harness(storeWith({openingHours:weekly,handoff:{weekly},displayStart:'00:00',displayEnd:'24:00'}));
  await admin('POST','/api/admin/inventory',{body:{id:'ad-0005-01',product_id:'ad-0005',size:'L'}});
  const {data}=await timeline(call);
  assert.equal(data.slots.length,48);
  assert.equal(data.slots[0].time,'00:00');
  assert.equal(data.slots.at(-1).time,'23:30');
  assert.ok(data.slots.every(slot=>slot.state==='available'));
  const late=await book(request({start_time:'23:30'}));
  assert.equal(late.status,201);
  assert.equal(late.data.request.end_date,day(4));
  assert.equal(late.data.request.start_time,'23:30');
  assert.equal((await book(request({start_time:'00:00',customer_phone:'0901234568'}))).status,201);
  assert.equal((await book(request({start_time:'24:00',customer_phone:'0901234569'}))).status,400);
  assert.equal((await admin('PUT',`/api/admin/handoff-exceptions/${day(3)}`,{body:{windows:[{start:'18:00',end:'24:00'}]}})).status,200);
  const evening=await timeline(call);
  assert.equal(slotAt(evening.data,'23:30').state,'available');
  assert.equal(slotAt(evening.data,'00:00').state,'closed');
  await admin('PUT',`/api/admin/handoff-exceptions/${day(3)}`,{body:{closed:true}});
  assert.ok((await timeline(call)).data.slots.every(slot=>slot.state==='handoff'));
});

test('opening hours are enforced by both the timeline and the public request', async () => {
  const openingHours = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map(n => [n, [{start: '08:00', end: '20:00'}]]));
  const {admin, call, book} = await harness(storeWith({openingHours, displayStart: '07:00', displayEnd: '21:00'}));
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  const {data} = await timeline(call);
  assert.equal(data.slots.length, 28);
  assert.equal(slotAt(data, '07:00').state, 'closed');
  assert.equal(slotAt(data, '12:00').state, 'handoff');
  assert.equal(slotAt(data, '19:00').state, 'available');
  assert.equal((await book(request({start_time: '07:00'}))).status, 400);
  assert.equal((await book(request({start_time: '19:00'}))).status, 201);
});

test('the timeline retains handoff gaps while allowing only staffed hours', async () => {
  const {admin, call} = await harness();
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  const {status, data} = await timeline(call);
  assert.equal(status, 200);
  assert.equal(data.total, 1);
  assert.equal(data.slots.length, 32);
  assert.equal(slotAt(data, '19:00').state, 'available');
  // The owner is away at midday; the gap remains visible with a reason.
  assert.equal(slotAt(data, '12:00').state, 'handoff');
  assert.equal(data.quote.days, 1);
  assert.equal(data.quote.total, 119000);
});

test('a time the owner cannot hand over at is refused even when the form sends it', async () => {
  const {admin, book} = await harness();
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  const midday = await book(request({start_time: '12:00'}));
  assert.equal(midday.status, 400);
  assert.equal(midday.data.fields.start_time, 'invalid');
  // 19:15 is inside the window but off the store's 30-minute grid.
  assert.equal((await book(request({start_time: '19:15'}))).data.fields.start_time, 'invalid');
  assert.equal((await book(request())).status, 201);
});

test('a rental day is 24 hours: the return falls due at the pick-up time, that many days on', async () => {
  const {admin, book} = await harness();
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  const one = await book(request({rental_days: 1}));
  assert.equal(one.status, 201);
  assert.equal(one.data.request.start_at, `${day(3)}T19:00`);
  assert.equal(one.data.request.due_at, `${day(4)}T19:00`);
  assert.equal(one.data.request.rental_days, 1);
  assert.equal(one.data.request.quote.days, 1);
  assert.equal(one.data.request.quote.total, 119000);

  const {admin: admin2, book: book2} = await harness();
  await admin2('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  const two = await book2(request({rental_days: 2, customer_phone: '0901234568'}));
  assert.equal(two.data.request.due_at, `${day(5)}T19:00`);
  assert.equal(two.data.request.quote.days, 2);
  assert.equal(two.data.request.quote.total, 238000);
});

test('an item already out is off the line, and back on it the morning after its care window', async () => {
  const {admin, call, book} = await harness();
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  // Collected on day 3 at 19:00 for one day: due back day 4 at 19:00, washed that night, out at 07:00 on day 5.
  // A public request holds nothing until staff confirm it, which is when a garment is assigned.
  const held = await book(request());
  assert.equal(held.status, 201);
  await admin(`POST`, `/api/admin/reservations/${held.data.request.id}/confirm`);
  const sameDay = await timeline(call);
  assert.equal(slotAt(sameDay.data, '19:00').state, 'none', 'the hour it was taken');
  const dueDay = await call('GET', `/api/products/ad-0005/timeline?date=${day(4)}&days=1`);
  assert.equal(slotAt(dueDay.data, '20:30').state, 'maintenance', 'still being washed that evening');
  const nextDay = await call('GET', `/api/products/ad-0005/timeline?date=${day(5)}&days=1`);
  assert.equal(slotAt(nextDay.data, '07:00').state, 'available', 'dry and out again at 07:00');
  assert.equal(slotAt(nextDay.data, '07:00').remaining, 1);
});

test('turnaround is refused server-side, not only hidden on the line', async () => {
  const {admin, book} = await harness();
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  const held = await book(request());
  assert.equal(held.status, 201);
  await admin(`POST`, `/api/admin/reservations/${held.data.request.id}/confirm`);
  // Due back day 4 at 19:00; 20:30 the same evening is inside the care window.
  const tooSoon = await book(request({start_date: day(4), start_time: '20:30', customer_phone: '0901234568'}));
  assert.equal(tooSoon.status, 409);
  assert.equal(tooSoon.data.error, 'unavailable');
  // 07:00 the next morning is the moment it becomes free.
  const afterCare = await book(request({start_date: day(5), start_time: '07:00', customer_phone: '0901234569'}));
  assert.equal(afterCare.status, 201);
});

test('with two garments the line counts what is left, and empties when both are out', async () => {
  const {admin, call, book} = await harness();
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-02', product_id: 'ad-0005', size: 'L'}});
  assert.equal(slotAt((await timeline(call)).data, '19:00').remaining, 2);
  const first = await book(request());
  assert.equal(first.status, 201);
  await admin('POST', `/api/admin/reservations/${first.data.request.id}/confirm`);
  const oneLeft = slotAt((await timeline(call)).data, '19:00');
  assert.equal(oneLeft.state, 'low');
  assert.equal(oneLeft.remaining, 1);
  const second = await book(request({customer_phone: '0901234568'}));
  assert.equal(second.status, 201);
  await admin('POST', `/api/admin/reservations/${second.data.request.id}/confirm`);
  assert.equal(slotAt((await timeline(call)).data, '19:00').state, 'none');
});

test('two customers reaching for the last garment: the second is refused by the server', async () => {
  const {admin, book} = await harness();
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  const first = await book(request());
  assert.equal(first.status, 201);
  await admin('POST', `/api/admin/reservations/${first.data.request.id}/confirm`);
  // The same hour, a different customer: the line may still have looked free a moment ago.
  const second = await book(request({customer_phone: '0901234568'}));
  assert.equal(second.status, 409);
  assert.equal(second.data.error, 'unavailable');
});

test('a day the owner works differently overrides the ordinary week', async () => {
  const {admin, call, book} = await harness();
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  // A day off: available all day instead of the usual two windows.
  const saved = await admin('PUT', `/api/admin/handoff-exceptions/${day(3)}`, {body: {windows: [{start: '09:00', end: '21:00'}], note: 'Nghỉ phép'}});
  assert.equal(saved.status, 200);
  assert.equal(saved.data.exception.closed, false);
  const open = await timeline(call);
  assert.equal(slotAt(open.data, '12:00').state, 'available', 'midday is offered on a day off');
  assert.equal(slotAt(open.data, '07:00').state, 'closed', 'the exception replaces the usual early window');
  assert.equal((await book(request({start_time: '12:00'}))).status, 201);

  // Away all day: nothing on offer, and the server refuses whatever the form sends.
  await admin('PUT', `/api/admin/handoff-exceptions/${day(4)}`, {body: {closed: true}});
  const shut = await call('GET', `/api/products/ad-0005/timeline?date=${day(4)}&days=1`);
  assert.ok(shut.data.slots.every(slot => slot.state === 'handoff'));
  assert.equal(shut.data.closed, true);
  const refused = await book(request({start_date: day(4), start_time: '19:00', customer_phone: '0901234568'}));
  assert.equal(refused.status, 400);
  assert.equal(refused.data.fields.start_time, 'not_allowed');

  // Removing the exception puts the ordinary week back.
  assert.equal((await admin('DELETE', `/api/admin/handoff-exceptions/${day(4)}`)).status, 200);
  const back = await call('GET', `/api/products/ad-0005/timeline?date=${day(4)}&days=1`);
  assert.equal(slotAt(back.data, '19:00').state, 'available');
});

test('a longer rental has to clear every night it covers', async () => {
  const {admin, call, book} = await harness();
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  const booked = await book(request({start_date: day(6), start_time: '19:00'}));
  assert.equal(booked.status, 201);
  await admin('POST', `/api/admin/reservations/${booked.data.request.id}/confirm`);
  // One day from day 3 is clear of it; four days runs straight into it.
  assert.equal(slotAt((await timeline(call)).data, '19:00').state, 'available');
  const longer = await call('GET', `/api/products/ad-0005/timeline?date=${day(3)}&days=4`);
  assert.equal(slotAt(longer.data, '19:00').state, 'none');
  assert.equal(longer.data.quote.days, 4);
});

test('the admin availability view counts each state and says when the next one is free', async () => {
  const {admin, book} = await harness();
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-02', product_id: 'ad-0005', size: 'L'}});
  await admin('PATCH', '/api/admin/inventory/ad-0005-02', {body: {status: 'cleaning'}});
  const booked = await book(request());
  await admin('POST', `/api/admin/reservations/${booked.data.request.id}/confirm`);
  const {status, data} = await admin('GET', '/api/admin/inventory/schedule');
  assert.equal(status, 200);
  const group = data.schedule.find(row => row.product_id === 'ad-0005' && row.size === 'L');
  assert.equal(group.total, 2);
  assert.equal(group.cleaning, 1);
  // The booking is three days out, so the garment is free today and its hold shows as an upcoming
  // stretch rather than a count against right now.
  assert.equal(group.reserved, 0);
  assert.equal(group.available, 1);
  const held = group.items.find(item => item.id === 'ad-0005-01');
  assert.equal(held.occupied.length, 1);
  assert.equal(held.occupied[0].start, `${day(3)}T19:00`);
  assert.equal(held.occupied[0].ready, `${day(5)}T07:00`, 'due back day 4 at 19:00, washed overnight');
  assert.ok(data.schedule.every(row => typeof row.next_free === 'string'));
});

test('a store that configured none of this keeps working exactly as it did', async () => {
  const {admin, call, book} = await harness({timezone: 'Asia/Ho_Chi_Minh'});
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  // No handoff hours and no fixed windows: a time of day is not accepted, and dates still are.
  const withTime = await book(request());
  assert.equal(withTime.status, 400);
  assert.equal(withTime.data.fields.start_time, 'not_allowed');
  const plain = await book(request({start_time: '', rental_days: undefined, end_date: day(5)}));
  assert.equal(plain.status, 201);
  assert.equal(plain.data.request.start_date, day(3));
  assert.equal(plain.data.request.end_date, day(5));
  assert.equal(plain.data.request.quote.days, 2, 'the calendar-day booking is priced as it always was');
  // The old day-level calendar still answers.
  const calendar = await call('GET', `/api/products/ad-0005/calendar?month=${day(3).slice(0, 7)}`);
  assert.equal(calendar.status, 200);
  assert.ok(Array.isArray(calendar.data.days));
});

// The read-only demo may look at everything and change nothing, the new screens included.
test('a read-only admin can read the diary and the availability view but not write to them', async () => {
  const {admin} = await harness(storeWith({}), {ADMIN_READ_ONLY: '1'});
  assert.equal((await admin('GET', '/api/admin/inventory/schedule')).status, 200);
  assert.equal((await admin('GET', '/api/admin/handoff-exceptions')).status, 200);
  const write = await admin('PUT', `/api/admin/handoff-exceptions/${day(3)}`, {body: {closed: true}});
  assert.equal(write.status, 403);
  assert.equal(write.data.error, 'read_only');
  assert.equal((await admin('DELETE', `/api/admin/handoff-exceptions/${day(3)}`)).status, 403);
});

// A fitting is not a rental: the customer comes at an agreed time, tries the garment on and hands it
// straight back. It holds one piece for the length of the visit and nothing is charged for it.
const withFitting = extra => storeWith({fitting: {enabled: true, minutes: 30, bufferMinutes: 0}, ...extra});
const fittingRequest = extra => request({purpose: 'fitting', rental_days: undefined, ...extra});

test('a store that does not take fittings refuses them, on the line and at the door', async () => {
  const {admin, call, book} = await harness();
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  const line = await call('GET', `/api/products/ad-0005/timeline?date=${day(3)}&purpose=fitting`);
  assert.equal(line.status, 400);
  assert.equal(line.data.fields.purpose, 'not_offered');
  const sent = await book(fittingRequest());
  assert.equal(sent.status, 400);
  assert.equal(sent.data.fields.purpose, 'not_offered');
  assert.equal((await book(request())).status, 201, 'rentals are unaffected');
});

test('a fitting is booked by the hour, ends the same day and is not charged for', async () => {
  const {admin, call, book} = await harness(withFitting());
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  const line = await call('GET', `/api/products/ad-0005/timeline?date=${day(3)}&purpose=fitting`);
  assert.equal(line.status, 200);
  assert.equal(line.data.purpose, 'fitting');
  assert.equal(line.data.fittingMinutes, 30);
  assert.equal(line.data.quote, null, 'nothing to charge for trying something on');
  assert.equal(slotAt(line.data, '19:00').state, 'available');

  const visit = await book(fittingRequest());
  assert.equal(visit.status, 201);
  assert.equal(visit.data.request.purpose, 'fitting');
  assert.equal(visit.data.request.rental_days, 0, 'a fitting counts no days');
  assert.equal(visit.data.request.start_date, day(3));
  assert.equal(visit.data.request.end_date, day(3), 'it is over the same day');
  assert.equal(visit.data.request.start_at, `${day(3)}T19:00`);
  assert.equal(visit.data.request.due_at, `${day(3)}T19:30`, 'the appointment is half an hour');
  assert.equal(visit.data.request.quote, null);
});

test('a fitting holds the garment only while it lasts', async () => {
  const {admin, call, book} = await harness(withFitting());
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  const visit = await book(fittingRequest());
  await admin('POST', `/api/admin/reservations/${visit.data.request.id}/confirm`);
  const line = await call('GET', `/api/products/ad-0005/timeline?date=${day(3)}&purpose=fitting`);
  assert.equal(slotAt(line.data, '19:00').state, 'none', 'the half hour it takes');
  assert.equal(slotAt(line.data, '19:30').state, 'available', 'and free again straight after');
  // 18:30 runs to 19:00 exactly, which is when the other begins: appointments may abut.
  assert.equal(slotAt(line.data, '18:30').state, 'available');
  // The server refuses a clash however the line looked.
  const clash = await book(fittingRequest({customer_phone: '0901234568'}));
  assert.equal(clash.status, 409);
  const after = await book(fittingRequest({start_time: '19:30', customer_phone: '0901234569'}));
  assert.equal(after.status, 201);
});

test('a fitting and a rental share one garment and one diary', async () => {
  const {admin, book} = await harness(withFitting());
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  // A rental collected on day 3 keeps the garment into day 5; a fitting cannot slip inside it.
  const rental = await book(request({rental_days: 1}));
  await admin('POST', `/api/admin/reservations/${rental.data.request.id}/confirm`);
  const blocked = await book(fittingRequest({start_date: day(4), start_time: '19:00', customer_phone: '0901234568'}));
  assert.equal(blocked.status, 409);
  const free = await book(fittingRequest({start_date: day(5), start_time: '07:00', customer_phone: '0901234569'}));
  assert.equal(free.status, 201, 'once it is back and cared for, a fitting fits');
  await admin('POST', `/api/admin/reservations/${free.data.request.id}/confirm`);
  // Staff see both in the same availability view.
  const {data} = await admin('GET', '/api/admin/inventory/schedule');
  const item = data.schedule[0].items[0];
  assert.equal(item.occupied.length, 2, 'the rental and the fitting');
});

test('a fitting still needs somebody at the shop to let the customer in', async () => {
  const {admin, book} = await harness(withFitting());
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  const midday = await book(fittingRequest({start_time: '12:00'}));
  assert.equal(midday.status, 400);
  assert.equal(midday.data.fields.start_time, 'invalid');
  await admin('PUT', `/api/admin/handoff-exceptions/${day(3)}`, {body: {closed: true}});
  const shut = await book(fittingRequest());
  assert.equal(shut.status, 400);
  assert.equal(shut.data.fields.start_time, 'not_allowed');
});

// Last season's garments go out cheaper after the first day. The rate is the product's own, and the
// Worker is the one that applies it: a total sent by the page is never trusted.
test('a product with a cheaper rate after day one is quoted and charged that way', async () => {
  const cheaper = [{...catalog[0], price: {rental: 119000, additionalDay: 30000}}];
  const {admin, call, book} = await harness(storeWith({}), {ASSETS: {fetch: async request => {
    const path = new URL(request.url).pathname;
    if (path === '/catalog.json') return Response.json(cheaper);
    if (path === '/store.json') return Response.json(storeWith({}));
    return new Response('', {status: 404});
  }}});
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  // One day is one day: nothing to discount.
  const one = await call('GET', `/api/products/ad-0005/timeline?date=${day(3)}&days=1`);
  assert.equal(one.data.quote.total, 119000);
  assert.equal(one.data.quote.additionalDays, 0);
  // Three days: the first at the daily rate, the other two at the flat rate.
  const three = await call('GET', `/api/products/ad-0005/timeline?date=${day(3)}&days=3`);
  assert.deepEqual(three.data.quote, {daily: 119000, additionalDay: 30000, additionalDays: 2, days: 3, total: 179000, discounted: true, currency: 'VND'});
  // And that is what the booking is quoted at, whatever the page claimed.
  const booked = await book(request({rental_days: 3, total: 1, quote: {total: 1}}));
  assert.equal(booked.status, 201);
  assert.equal(booked.data.request.quote.total, 179000);
  assert.equal(booked.data.request.quote.additionalDay, 30000);
});

// The staff timeline: who holds each garment and when, with the care after a rental as its own
// stretch, so "back but not yet ready" can be seen without doing the arithmetic.
test('the staff timeline shows a rental, then its care window, then free time, per garment and per product', async () => {
  const {admin, book, call} = await harness();
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-02', product_id: 'ad-0005', size: 'L'}});
  const booked = await book(request());
  await admin('POST', `/api/admin/reservations/${booked.data.request.id}/confirm`);
  const {status, data} = await admin('GET', `/api/admin/inventory/timeline?from=${day(3)}&days=3&product_id=ad-0005`);
  assert.equal(status, 200);
  assert.equal(data.from, day(3));
  const held = data.items.find(item => item.segments.some(segment => segment.reservation));
  const [rental, care, free] = held.segments.filter(segment => segment.start >= `${day(3)}T19:00`);
  assert.deepEqual([rental.kind, rental.start, rental.end], ['reserved', `${day(3)}T19:00`, `${day(4)}T19:00`]);
  assert.deepEqual([care.kind, care.start, care.end], ['cleaning', `${day(4)}T19:00`, `${day(5)}T07:00`]);
  assert.deepEqual([free.kind, free.start], ['available', `${day(5)}T07:00`]);
  assert.equal(rental.reservation.customer_name, 'Nguyễn Mai');
  assert.equal(rental.reservation.due, `${day(4)}T19:00`);
  assert.equal(held.days.length, 3);
  assert.equal(held.days[2].ready, `${day(5)}T07:00`);
  // Per product: on day 5 one piece is free all day and the other from 07:00.
  assert.deepEqual(data.products[0].days[2], {date: day(5), total: 2, free: 1, partial: 1});
  assert.deepEqual(data.products[0].items, ['ad-0005-01', 'ad-0005-02']);
  // Customer names are in here: staff only, and the period is bounded.
  assert.equal((await call('GET', '/api/admin/inventory/timeline')).status, 401);
  for (const query of ['days=0', 'days=32', 'days=1.5', 'from=2026-02-30']) assert.equal((await admin('GET', `/api/admin/inventory/timeline?${query}`)).status, 400, query);
  assert.equal((await admin('GET', '/api/admin/inventory/timeline?item_id=ad-0005-02')).data.items.length, 1);
});

test('a rental taken back in records when it came back, and its care runs from then', async () => {
  const {admin, env} = await harness();
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  // Collected two evenings ago for three days: still out, not yet due.
  await env.DB.prepare(`INSERT INTO reservations (id, customer_name, start_date, end_date, status, start_time, rental_days, start_at, ready_at)
    VALUES ('rsv-out', 'Lan', ?, ?, 'rented', '19:00', 3, ?, ?)`).bind(day(-2), day(1), `${day(-2)}T19:00`, `${day(2)}T07:00`).run();
  await env.DB.prepare("INSERT INTO reservation_items (reservation_id, inventory_item_id, product_id) VALUES ('rsv-out', 'ad-0005-01', 'ad-0005')").run();
  const before = await admin('GET', '/api/admin/inventory/timeline?days=2');
  assert.equal(before.data.items[0].now, 'rented');
  const {data} = await admin('PATCH', '/api/admin/reservations/rsv-out', {body: {status: 'returned'}});
  const returned = data.reservation.returned_at;
  assert.ok(returned.startsWith(`${today}T`) && /T\d{2}:\d{2}$/.test(returned), returned);
  assert.equal(data.reservation.ready_at, readyAt(returned, {strategy: 'overnight', returnCutoff: '20:00', readyNextDayAt: '07:00'}));
  const after = await admin('GET', '/api/admin/inventory/timeline?days=3');
  const item = after.data.items[0];
  const care = item.segments.find(segment => segment.kind === 'cleaning');
  assert.deepEqual([care.start, care.end], [returned, data.reservation.ready_at]);
  assert.equal(care.reservation.returned, returned);
  assert.equal(item.now, 'cleaning');
  assert.equal(item.next_available, data.reservation.ready_at);
  // Back is not ready: the care window cannot be booked, the moment after it can.
  const careDay = data.reservation.ready_at.slice(0, 10);
  const during = await admin('POST', '/api/admin/reservations', {body: {customer_name: 'Too soon', start_date: careDay, end_date: careDay, status: 'confirmed', items: ['ad-0005-01']}});
  assert.equal(during.status, 409);
  assert.equal(during.data.error, 'inventory_conflict');
  const overview = await admin('GET', '/api/admin/inventory?overview=1');
  assert.equal(overview.data.items[0].available_today, false, 'not offered today while it is being cared for');
  const later = await admin('POST', '/api/admin/reservations', {body: {customer_name: 'Next day', start_date: shiftDate(careDay, 1), end_date: shiftDate(careDay, 1), status: 'confirmed', items: ['ad-0005-01']}});
  assert.equal(later.status, 201);
});

test('a rental that is not back by its due time holds its item until it could be back and cared for', async () => {
  const {admin, call, env} = await harness();
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  // Collected three evenings ago for one day: due back the evening before last, still out.
  await env.DB.prepare(`INSERT INTO reservations (id, customer_name, start_date, end_date, status, start_time, rental_days, start_at, ready_at)
    VALUES ('rsv-late', 'Vũ An', ?, ?, 'rented', '19:00', 1, ?, ?)`).bind(day(-3), day(-2), `${day(-3)}T19:00`, `${day(-1)}T07:00`).run();
  await env.DB.prepare("INSERT INTO reservation_items (reservation_id, inventory_item_id, product_id) VALUES ('rsv-late', 'ad-0005-01', 'ad-0005')").run();
  // As planned it would be free since yesterday morning. It is not: today cannot be promised.
  const today_ = await admin('POST', '/api/admin/reservations', {body: {customer_name: 'Hopeful', start_date: day(0), end_date: day(0), status: 'confirmed', items: ['ad-0005-01']}});
  assert.equal(today_.status, 409);
  assert.equal(today_.data.conflicts[0].reservationId, 'rsv-late');
  const candidates = await admin('GET', `/api/products/ad-0005/inventory?from=${day(0)}&to=${day(0)}`);
  assert.equal(candidates.data.items[0].available, false);
  // The public calendar says the same for today.
  const calendar = await call('GET', `/api/products/ad-0005/calendar?month=${today.slice(0, 7)}&size=L`);
  assert.equal(calendar.data.days.find(d => d.date === today).available, false);
  // Once it could be back and washed overnight, the item may be promised again.
  const {data: timeline} = await admin('GET', '/api/admin/inventory/timeline?days=4');
  const free = timeline.items[0].next_available;
  const after = await admin('POST', '/api/admin/reservations', {body: {customer_name: 'Later', start_date: shiftDate(free.slice(0, 10), 1), end_date: shiftDate(free.slice(0, 10), 1), status: 'confirmed', items: ['ad-0005-01']}});
  assert.equal(after.status, 201);
});

test('a whole-day booking from before rentals had times still frees its item when it comes back', async () => {
  const {admin, env} = await harness();
  await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
  await env.DB.prepare("INSERT INTO reservations (id, customer_name, start_date, end_date, status) VALUES ('rsv-old', 'Hoa', ?, ?, 'returned')").bind(day(-1), day(2)).run();
  await env.DB.prepare("INSERT INTO reservation_items (reservation_id, inventory_item_id, product_id) VALUES ('rsv-old', 'ad-0005-01', 'ad-0005')").run();
  const booked = await admin('POST', '/api/admin/reservations', {body: {customer_name: 'Early return', start_date: day(1), end_date: day(1), status: 'confirmed', items: ['ad-0005-01']}});
  assert.equal(booked.status, 201);
});
