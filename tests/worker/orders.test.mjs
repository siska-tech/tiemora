// Sale / pre-orders (type: sale): the public config, pricing with options and add-ons, capacity
// per time slot / day / product stock, deadline, duplicate folding, the admin order flow and the
// read-only demo mode. Runs the Worker over the node:sqlite D1 shim.
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../worker/index.mjs';
import {resetCatalogCache} from '../../worker/catalog.mjs';
import {resetStoreCache} from '../../worker/store.mjs';
import {migratedDatabase} from '../d1-shim.mjs';
import {todayIn, shiftDate} from '../../core/booking/dates.mjs';

const ORIGIN = 'https://shop.test';
const today = todayIn('Asia/Ho_Chi_Minh');
const day = n => shiftDate(today, n);
const catalog = [
  {id: 'sale-1', type: 'sale', name: {vi: 'Sản phẩm mẫu', en: 'Sample Item'}, category: 'gifts', price: {sale: 349000}, currency: 'VND',
    options: {size: [{id: 'small'}, {id: 'medium'}, {id: 'large', price: 200000}], tone: [{id: 'pink'}, {id: 'pastel'}]}, addons: [{id: 'chocolate'}, {id: 'giftbag'}],
    fulfillment: {pickup: true, delivery: true}, ordering: {preorder: true, stock: 3, deadline: null}, images: [], videos: []},
  {id: 'sale-2', type: 'sale', name: {vi: 'Sản phẩm mẫu B'}, category: 'elegant', price: {sale: 499000}, currency: 'VND', fulfillment: {pickup: true, delivery: false}, ordering: {preorder: true, stock: null, deadline: null}, images: [], videos: []},
  {id: 'sale-3', type: 'sale', name: {vi: 'Sản phẩm mẫu C'}, category: 'elegant', price: {sale: 199000}, currency: 'VND', fulfillment: {pickup: true, delivery: true}, ordering: {preorder: true, stock: null, deadline: '2000-01-01T00:00:00Z'}, images: [], videos: []},
  {id: 'rental-1', type: 'rental', name: {vi: 'Sản phẩm cho thuê'}, category: 'rental', price: {rental: 300000}, sizes: ['M'], inventory: {managed: true}, images: [], videos: []}
];
const store = {
  store: {name: 'Sample Store'}, languages: ['vi', 'en'], defaultLanguage: 'vi', currency: 'VND',
  ordering: {
    fulfillment: {pickup: true, delivery: true, deliveryFee: 30000},
    dates: {from: day(1), to: day(3)}, deadline: null, dailyCapacity: 3,
    timeSlots: [{id: 'am', start: '09:00', end: '11:00', capacity: 2}, {id: 'pm', start: '13:00', end: '15:00', capacity: null}],
    options: {size: {label: {vi: 'Kích cỡ'}, choices: {small: {label: {vi: 'Nhỏ'}, price: -100000}, medium: {label: {vi: 'Vừa'}}, large: {label: {vi: 'Lớn'}, price: 150000}}}, tone: {label: 'Tone', choices: {pink: {label: 'Pink'}, pastel: {label: 'Pastel'}}}},
    addons: {chocolate: {label: 'Chocolate', price: 120000}, giftbag: {label: 'Gift bag', price: 30000}},
    messageCard: {maxLength: 100, templates: [{id: 'thanks', label: {vi: 'Cảm ơn'}, text: {vi: 'Cảm ơn bạn'}}]}
  }
};

async function harness(overrides = {}, storeOverride = store) {
  resetCatalogCache(); resetStoreCache();
  const env = {
    DB: await migratedDatabase(),
    ASSETS: {fetch: async request => { const p = new URL(request.url).pathname; return p === '/catalog.json' ? Response.json(catalog) : p === '/store.json' ? Response.json(storeOverride) : new Response('', {status: 404}); }},
    ADMIN_PASSWORD: 'pw', STORE_TIMEZONE: 'Asia/Ho_Chi_Minh', ...overrides
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
  let ipSeq = 0;
  const publicPost = (body, headers = {}) => call('POST', '/api/orders', {body, headers: {'x-requested-with': 'fetch', 'cf-connecting-ip': `203.0.113.${++ipSeq % 200}`, ...headers}});
  return {env, call, admin, publicPost};
}
const order = extra => ({product_id: 'sale-1', quantity: 1, options: {size: 'medium', tone: 'pink'}, addons: [], fulfillment_type: 'pickup', fulfillment_date: day(2), time_slot: 'am',
  customer_name: 'Tran Thu', customer_phone: '0900000010', preferred_contact_channel: 'zalo', message_card: 'Cảm ơn bạn', privacy_consent: true, ...extra});

test('public config lists the window, slots with remaining capacity, stock per sale product and the option labels', async () => {
  const {call} = await harness();
  const {status, data} = await call('GET', '/api/orders/config');
  assert.equal(status, 200);
  assert.deepEqual(data.dates.list, [day(1), day(2), day(3)]);
  assert.equal(data.dates.campaign, true);
  assert.equal(data.deadlinePassed, false);
  assert.deepEqual(data.capacity[day(1)].slots.am, {used: 0, capacity: 2, remaining: 2, open: true});
  assert.deepEqual(data.capacity[day(1)].slots.pm, {used: 0, capacity: null, remaining: null, open: true});
  assert.deepEqual(data.products['sale-1'], {stock: 3, sold: 0, remaining: 3, soldOut: false, soldOutByStaff: false, preorder: true, deadlinePassed: false});
  assert.equal(data.products['sale-2'].stock, null);
  assert.equal(data.products['sale-3'].deadlinePassed, true);
  assert.equal(data.products['rental-1'], undefined);
  assert.equal(data.options.size.choices.large.price, 150000);
  assert.equal(data.fulfillment.deliveryFee, 30000);
  assert.equal(data.messageCard.templates[0].id, 'thanks');
});

test('pricing: base + option deltas (product overrides config) + add-ons, times quantity, plus the delivery fee', async () => {
  const {publicPost} = await harness();
  const created = await publicPost(order({quantity: 2, options: {size: 'large', tone: 'pastel'}, addons: ['chocolate', 'giftbag', 'giftbag'], fulfillment_type: 'delivery', recipient_name: 'Lan', recipient_phone: '0900000011', delivery_address: 'Địa chỉ mẫu, Quận 1', delivery_note: 'Gọi trước'}));
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const o = created.data.order;
  assert.match(o.id, /^ord-\d{8}-[a-z0-9]{4}$/);
  assert.equal(o.status, 'pending');
  // large: the product's own +200000 beats the config's +150000; chocolate 120000 + giftbag 30000.
  assert.equal(o.items[0].unit_price, 349000 + 200000 + 120000 + 30000);
  assert.equal(o.items[0].line_total, 2 * 699000);
  assert.deepEqual(o.items[0].options, {size: 'large', tone: 'pastel'});
  assert.deepEqual(o.items[0].addons, ['chocolate', 'giftbag']);
  assert.equal(o.total, 2 * 699000 + 30000);
  assert.equal(o.fulfillment_type, 'delivery');
  // The customer's own data is not echoed back beyond what the confirmation screen shows.
  assert.equal(o.delivery_address, undefined);
  assert.equal(o.message_card, undefined);
});

test('multi-item orders recalculate every line on the server and reject one invalid line atomically', async () => {
  const {publicPost} = await harness();
  const created = await publicPost(order({items: [
    {product_id: 'sale-1', quantity: 2, options: {size: 'medium', tone: 'pink'}, addons: ['giftbag'], unit_price: 1, line_total: 1},
    {product_id: 'sale-2', quantity: 1, options: {}, addons: [], unit_price: 1, line_total: 1}
  ]}));
  assert.equal(created.status, 201, JSON.stringify(created.data));
  assert.equal(created.data.order.items.length, 2);
  assert.equal(created.data.order.items[0].unit_price, 349000 + 30000);
  assert.equal(created.data.order.items[0].line_total, 2 * 379000);
  assert.equal(created.data.order.items[1].unit_price, 499000);
  assert.equal(created.data.order.total, 2 * 379000 + 499000);

  const rejected = await publicPost(order({items: [
    {product_id: 'sale-1', quantity: 1, options: {size: 'medium'}, addons: []},
    {product_id: 'sale-1', quantity: 1, options: {size: 'not-an-option'}, addons: []}
  ], customer_phone: '0900000098'}));
  assert.equal(rejected.status, 400);
  assert.equal(rejected.data.fields['items.1.options.size'], 'invalid');

  const cumulative = await harness();
  const overStock = await cumulative.publicPost(order({items: [
    {product_id: 'sale-1', quantity: 2, options: {size: 'small'}, addons: []},
    {product_id: 'sale-1', quantity: 2, options: {size: 'large'}, addons: []}
  ], customer_phone: '0900000097'}));
  assert.equal(overStock.status, 409);
  assert.equal(overStock.data.error, 'sold_out');
});

test('validation: unknown product, rental product, bad option, bad add-on, quantity, window, slot, delivery fields, channel, consent', async () => {
  const {publicPost} = await harness();
  const bad = async (extra, field, code) => {
    const r = await publicPost(order(extra));
    assert.equal(r.status, 400, JSON.stringify(r.data));
    assert.equal(r.data.fields?.[field], code, `${field}: ${JSON.stringify(r.data)}`);
  };
  await bad({product_id: 'nope'}, 'product_id', 'unknown');
  await bad({product_id: 'rental-1'}, 'product_id', 'not_for_sale');
  await bad({options: {size: 'huge'}}, 'options.size', 'invalid');
  await bad({options: {colour: 'red'}}, 'options.colour', 'unknown');
  await bad({addons: ['teddy']}, 'addons', 'invalid');
  await bad({quantity: 0}, 'quantity', 'invalid');
  await bad({quantity: 99}, 'quantity', 'invalid');
  await bad({fulfillment_date: today}, 'fulfillment_date', 'too_early');
  await bad({fulfillment_date: day(9)}, 'fulfillment_date', 'too_late');
  await bad({fulfillment_date: '2026-02-30'}, 'fulfillment_date', 'invalid');
  await bad({time_slot: 'night'}, 'time_slot', 'invalid');
  await bad({time_slot: ''}, 'time_slot', 'required');
  await bad({fulfillment_type: 'delivery'}, 'recipient_name', 'required');
  await bad({fulfillment_type: 'delivery', recipient_name: 'A', recipient_phone: 'x', delivery_address: 'B'}, 'recipient_phone', 'invalid');
  await bad({product_id: 'sale-2', fulfillment_type: 'delivery', options: {}}, 'fulfillment_type', 'not_offered');
  await bad({preferred_contact_channel: 'other'}, 'preferred_contact_channel', 'required');
  await bad({privacy_consent: false}, 'privacy_consent', 'required');
  await bad({customer_phone: 'call me'}, 'customer_phone', 'invalid');
  await bad({message_card: 'x'.repeat(101)}, 'message_card', 'too_long');
  const closed = await publicPost(order({product_id: 'sale-3', options: {}}));
  assert.equal(closed.status, 409);
  assert.equal(closed.data.error, 'deadline_passed');
});

test('dine-in orders require a valid table number and accept the table flow', async () => {
  const {publicPost} = await harness({
    STORE_TIMEZONE: 'Asia/Ho_Chi_Minh',
  }, {
    ...store,
    ordering: {
      ...store.ordering,
      fulfillment: {...store.ordering.fulfillment, dine_in: true},
      tables: {min: 1, max: 24},
      timeSlots: [{id: 'lunch', start: '11:00', end: '13:00', capacity: 5}]
    }
  });

  const badTable = await publicPost(order({fulfillment_type: 'dine_in', time_slot: 'lunch', table_number: 'A12', options: {}}));
  assert.equal(badTable.status, 400);
  assert.equal(badTable.data.fields.table_number, 'invalid');

  // The QR code is a URL: a guest can type any number into it, so the configured range is the wall.
  const beyond = await publicPost(order({fulfillment_type: 'dine_in', time_slot: 'lunch', table_number: 25, options: {}}));
  assert.equal(beyond.status, 400);
  assert.equal(beyond.data.fields.table_number, 'out_of_range');
  const zero = await publicPost(order({fulfillment_type: 'dine_in', time_slot: 'lunch', table_number: 0, options: {}}));
  assert.equal(zero.data.fields.table_number, 'out_of_range');

  // A guest who is already sitting down needs no name and no phone number to be served.
  const anonymous = await publicPost(order({fulfillment_type: 'dine_in', time_slot: 'lunch', table_number: '007', options: {}, customer_name: '', customer_phone: '', preferred_contact_channel: ''}));
  assert.equal(anonymous.status, 201, JSON.stringify(anonymous.data));
  assert.equal(anonymous.data.order.table_number, '7', 'leading zeros are dropped so one table is one table');

  // Pickup still needs both: staff have to call the customer when the bag is ready.
  const namelessPickup = await publicPost(order({time_slot: 'lunch', customer_name: '', options: {}}));
  assert.equal(namelessPickup.status, 400);
  assert.equal(namelessPickup.data.fields.customer_name, 'required');

  const created = await publicPost(order({fulfillment_type: 'dine_in', time_slot: 'lunch', table_number: 12, options: {}}));
  assert.equal(created.status, 201, JSON.stringify(created.data));
  assert.equal(created.data.order.fulfillment_type, 'dine_in');
  assert.equal(created.data.order.table_number, '12');
});

test('skipped option groups take the first choice; the same order sent twice is folded', async () => {
  const {publicPost, call} = await harness();
  const first = await publicPost(order({options: {}}));
  assert.equal(first.status, 201);
  assert.deepEqual(first.data.order.items[0].options, {size: 'small', tone: 'pink'});
  assert.equal(first.data.order.items[0].unit_price, 349000 - 100000);
  const again = await publicPost(order({options: {}}));
  assert.equal(again.status, 200);
  assert.equal(again.data.duplicate, true);
  assert.equal(again.data.order.id, first.data.order.id);
  assert.equal((await call('GET', '/api/orders/config')).data.capacity[day(2)].slots.am.used, 1);
});

test('capacity: a full slot, a full day and a sold-out product answer 409 and the config reflects it', async () => {
  const {publicPost, call, admin} = await harness();
  // Slot "am" on day 2 holds 2 orders.
  assert.equal((await publicPost(order({customer_phone: '0900000001'}))).status, 201);
  assert.equal((await publicPost(order({customer_phone: '0900000002'}))).status, 201);
  let config = (await call('GET', '/api/orders/config')).data;
  assert.deepEqual(config.capacity[day(2)].slots.am, {used: 2, capacity: 2, remaining: 0, open: false});
  assert.equal(config.capacity[day(2)].open, true);
  const full = await publicPost(order({customer_phone: '0900000003'}));
  assert.equal(full.status, 409);
  assert.equal(full.data.error, 'capacity_full');
  // The day holds 3: one more in "pm" closes the whole day, even the unlimited slot.
  assert.equal((await publicPost(order({customer_phone: '0900000003', time_slot: 'pm', product_id: 'sale-2', options: {}}))).status, 201);
  config = (await call('GET', '/api/orders/config')).data;
  assert.equal(config.capacity[day(2)].open, false);
  assert.equal(config.capacity[day(2)].slots.pm.open, false);
  assert.equal(config.capacity[day(3)].open, true);
  assert.equal((await publicPost(order({customer_phone: '0900000004', time_slot: 'pm', product_id: 'sale-2', options: {}}))).data.error, 'capacity_full');
  // Stock: sale-1 sells 3 units in total; 2 are gone, a quantity of 2 is refused, 1 is fine, then sold out.
  assert.equal(config.products['sale-1'].remaining, 1);
  const tooMany = await publicPost(order({customer_phone: '0900000005', fulfillment_date: day(3), quantity: 2}));
  assert.equal(tooMany.status, 409);
  assert.equal(tooMany.data.error, 'sold_out');
  assert.equal(tooMany.data.remaining, 1);
  assert.equal((await publicPost(order({customer_phone: '0900000005', fulfillment_date: day(3)}))).status, 201);
  config = (await call('GET', '/api/orders/config')).data;
  assert.equal(config.products['sale-1'].soldOut, true);
  assert.equal((await publicPost(order({customer_phone: '0900000006', fulfillment_date: day(3)}))).data.error, 'sold_out');
  // Cancelling frees the stock and the slot again.
  const list = (await admin('GET', `/api/admin/orders?from=${day(2)}&to=${day(2)}&slot=am`)).data.orders;
  assert.equal(list.length, 2);
  assert.equal((await admin('DELETE', `/api/admin/orders/${list[0].id}`)).data.order.status, 'cancelled');
  config = (await call('GET', '/api/orders/config')).data;
  assert.equal(config.capacity[day(2)].slots.am.used, 1);
  assert.equal(config.products['sale-1'].soldOut, false);
});

test('the SQL guard refuses the third order for a slot of two even when the pre-check was stale', async () => {
  const {env} = await harness();
  const {createOrder} = await import('../../worker/orders-db.mjs');
  const line = {product_id: 'sale-1', quantity: 1, options: {}, addons: [], unit_price: 1, line_total: 1};
  const data = phone => ({customer_name: 'A', customer_phone: phone, fulfillment_type: 'pickup', fulfillment_date: day(2), time_slot: 'am', status: 'pending', source: 'public', items: [line]});
  const limits = {slotCapacity: 2, dailyCapacity: null, stock: {'sale-1': 3}};
  await createOrder(env.DB, data('1'), limits);
  await createOrder(env.DB, data('2'), limits);
  await assert.rejects(createOrder(env.DB, data('3'), limits), error => error.error === 'capacity_full');
  await assert.rejects(createOrder(env.DB, {...data('4'), time_slot: 'pm'}, {...limits, stock: {'sale-1': 2}}), error => error.error === 'sold_out');
  assert.equal(await env.DB.prepare('SELECT COUNT(*) AS n FROM orders').bind().first('n'), 2);
});

test('admin: list filters, detail with notification texts, status flow with transitions, edits, staff-created orders, schedule', async () => {
  const {admin, publicPost} = await harness();
  const created = (await publicPost(order({fulfillment_type: 'delivery', recipient_name: 'Chi Lan', recipient_phone: '0900000012', delivery_address: 'Địa chỉ mẫu 2, Quận 1', preferred_contact_channel: 'whatsapp'}))).data.order;
  const detail = await admin('GET', `/api/admin/orders/${created.id}`);
  assert.equal(detail.status, 200);
  const {order: o, notification, next} = detail.data;
  assert.equal(o.delivery_address, 'Địa chỉ mẫu 2, Quận 1');
  assert.equal(o.message_card, 'Cảm ơn bạn');
  assert.equal(o.customer_whatsapp, '0900000010');
  assert.equal(o.privacy_consent, 1);
  assert.deepEqual(next, ['confirmed', 'cancelled']);
  assert.equal(notification.preferred, 'whatsapp');
  assert.equal(notification.whatsapp.number, '84900000010');
  assert.match(notification.messages.vi, /Đơn hoa của bạn tại Sample Store đã được xác nhận/);
  assert.match(notification.messages.vi, /Sản phẩm mẫu \(Vừa · Pink\) ×1/);
  assert.match(notification.messages.vi, /Giao tận nơi: \d{2}\/\d{2}\/\d{4}, 09:00–11:00/);
  assert.match(notification.messages.vi, /Địa chỉ: Địa chỉ mẫu 2, Quận 1/);
  assert.match(notification.messages.vi, /“Cảm ơn bạn”/);
  assert.match(notification.messages.en, /Your order at Sample Store is confirmed/);
  assert.match(notification.summary, /Delivery/);
  // Status transitions: only the offered ones.
  const status = s => admin('POST', `/api/admin/orders/${created.id}/status`, {body: {status: s}});
  assert.equal((await status('ready')).status, 409);
  assert.equal((await status('confirmed')).data.order.status, 'confirmed');
  assert.equal((await status('preparing')).data.order.status, 'preparing');
  assert.deepEqual((await status('ready')).data.next, ['out_for_delivery', 'completed', 'cancelled']);
  assert.equal((await status('out_for_delivery')).data.order.status, 'out_for_delivery');
  assert.equal((await status('completed')).data.order.status, 'completed');
  assert.equal((await status('cancelled')).status, 409);
  // Notification record.
  const notified = await admin('POST', `/api/admin/orders/${created.id}/notification`, {body: {status: 'sent', channel: 'whatsapp', note: 'ok'}});
  assert.equal(notified.data.order.notification_status, 'sent');
  assert.equal(notified.data.order.notification_channel, 'whatsapp');
  // Edits: note, recipient, delivery fee recomputes the total.
  const edited = await admin('PATCH', `/api/admin/orders/${created.id}`, {body: {note: 'gift wrap: pink', recipient_name: 'Ms. Lan', delivery_fee: 0}});
  assert.equal(edited.data.order.note, 'gift wrap: pink');
  assert.equal(edited.data.order.recipient_name, 'Ms. Lan');
  assert.equal(edited.data.order.total, 349000);
  assert.equal((await admin('PATCH', `/api/admin/orders/${created.id}`, {body: {delivery_fee: -1}})).status, 400);
  assert.equal((await admin('PATCH', `/api/admin/orders/${created.id}`, {body: {}})).status, 400);
  assert.equal((await admin('GET', '/api/admin/orders/nope')).status, 404);
  // A staff-entered phone order: no consent, no channel, date outside the public window is fine.
  const staff = await admin('POST', '/api/admin/orders', {body: {product_id: 'sale-2', options: {}, fulfillment_type: 'pickup', fulfillment_date: day(10), time_slot: 'pm', customer_name: 'Phone Customer', customer_phone: '0900000020', quantity: 3}});
  assert.equal(staff.status, 201, JSON.stringify(staff.data));
  assert.equal(staff.data.order.status, 'confirmed');
  assert.equal(staff.data.order.source, 'admin');
  assert.equal(staff.data.order.total, 3 * 499000);
  // List filters.
  assert.equal((await admin('GET', '/api/admin/orders')).data.orders.length, 2);
  assert.equal((await admin('GET', '/api/admin/orders?fulfillment=delivery')).data.orders.length, 1);
  assert.equal((await admin('GET', '/api/admin/orders?status=confirmed,completed')).data.orders.length, 2);
  assert.equal((await admin('GET', '/api/admin/orders?q=Lan')).data.orders.length, 1);
  assert.equal((await admin('GET', '/api/admin/orders?notification=not_sent')).data.orders.length, 1);
  assert.equal((await admin('GET', '/api/admin/orders?status=lost')).status, 400);
  assert.equal((await admin('GET', '/api/admin/orders?from=2026-13-01')).status, 400);
  // The day's schedule groups by slot.
  const schedule = (await admin('GET', `/api/admin/orders/schedule?date=${day(2)}`)).data;
  assert.equal(schedule.slots[0].id, 'am');
  assert.equal(schedule.slots[0].orders.length, 1);
  assert.equal(schedule.slots[1].orders.length, 0);
  assert.equal(schedule.capacity.slots.am.used, 1);
  assert.equal((await admin('GET', '/api/admin/orders/schedule?date=soon')).status, 400);
  // Dashboard and the bell carry the order alerts alongside the rental ones.
  const dash = (await admin('GET', '/api/admin/dashboard')).data;
  assert.equal(dash.newOrders.length, 0);
  assert.equal(dash.orderNotifications.length, 1);
  assert.equal(dash.upcomingOrders, 1);
  assert.equal(dash.readOnly, false);
  assert.equal((await admin('GET', '/api/admin/notifications')).data.orderNotifications.length, 1);
});

test('without configured time slots the day is the unit; a rolling window applies without campaign dates', async () => {
  const rolling = {...store, ordering: {...store.ordering, timeSlots: [], dates: {minLeadDays: 2, maxDaysAhead: 5}, dailyCapacity: 1}};
  const {call, publicPost} = await harness({}, rolling);
  const config = (await call('GET', '/api/orders/config')).data;
  assert.deepEqual([config.dates.from, config.dates.to, config.dates.campaign], [day(2), day(5), false]);
  assert.equal(config.dates.list.length, 4);
  assert.equal((await publicPost(order({time_slot: 'am', fulfillment_date: day(3)}))).status, 201);
  const second = await publicPost(order({customer_phone: '0900000099', time_slot: '', fulfillment_date: day(3)}));
  assert.equal(second.data.error, 'capacity_full');
  assert.equal((await publicPost(order({customer_phone: '0900000099', time_slot: '', fulfillment_date: day(1)}))).data.fields.fulfillment_date, 'too_early');
});

test('public POST needs the same-origin headers; admin routes need a session; read-only mode refuses admin writes but not orders', async () => {
  const {call, admin, publicPost} = await harness({ADMIN_READ_ONLY: '1'});
  assert.equal((await call('POST', '/api/orders', {body: order()})).status, 403);
  assert.equal((await call('GET', '/api/admin/orders')).status, 401);
  const created = await publicPost(order());
  assert.equal(created.status, 201);
  assert.equal((await admin('GET', '/api/admin/session')).data.readOnly, true);
  assert.equal((await admin('GET', '/api/admin/orders')).data.orders.length, 1);
  const refused = await admin('POST', `/api/admin/orders/${created.data.order.id}/status`, {body: {status: 'confirmed'}});
  assert.equal(refused.status, 403);
  assert.equal(refused.data.error, 'read_only');
  assert.equal((await admin('POST', '/api/admin/inventory', {body: {id: 'rental-1-01', product_id: 'rental-1'}})).status, 403);
  assert.equal((await admin('POST', '/api/admin/logout', {body: {}})).status, 200);
});

test('staff can switch a product off and back on, and a sold-out product is refused while it is off', async () => {
  const {admin, publicPost, call} = await harness();

  // sale-2 has no stock count at all, so only the staff switch can take it off the menu.
  const before = await publicPost(order({product_id: 'sale-2', options: {}, customer_name: 'Khach Mot', customer_phone: '0900000101'}));
  assert.equal(before.status, 201, JSON.stringify(before.data));

  const off = await admin('PATCH', '/api/admin/products/sale-2', {body: {sold_out: true}});
  assert.equal(off.status, 200);
  assert.equal(off.data.products.find(p => p.product_id === 'sale-2').soldOutByStaff, true);
  assert.equal(off.data.products.find(p => p.product_id === 'sale-2').soldOut, true);
  // Products the staff never touched are reported as they always were.
  assert.equal(off.data.products.find(p => p.product_id === 'sale-1').soldOutByStaff, false);
  // Rental products have no switch to flip.
  assert.equal(off.data.products.some(p => p.product_id === 'rental-1'), false);

  // The customer sees it before they try, and the server refuses it if they try anyway.
  const config = await call('GET', '/api/orders/config');
  assert.equal(config.data.products['sale-2'].soldOut, true);
  const refused = await publicPost(order({product_id: 'sale-2', options: {}, customer_name: 'Khach Hai', customer_phone: '0900000102'}));
  assert.equal(refused.status, 409);
  assert.equal(refused.data.error, 'sold_out');

  // Back on the next morning.
  const on = await admin('PATCH', '/api/admin/products/sale-2', {body: {sold_out: false}});
  assert.equal(on.data.products.find(p => p.product_id === 'sale-2').soldOut, false);
  const after = await publicPost(order({product_id: 'sale-2', options: {}, customer_name: 'Khach Ba', customer_phone: '0900000103'}));
  assert.equal(after.status, 201, JSON.stringify(after.data));

  // Validation and auth.
  assert.equal((await admin('PATCH', '/api/admin/products/sale-2', {body: {sold_out: 'yes'}})).status, 400);
  assert.equal((await admin('PATCH', '/api/admin/products/nope', {body: {sold_out: true}})).status, 404);
  assert.equal((await admin('PATCH', '/api/admin/products/rental-1', {body: {sold_out: true}})).status, 400);
  assert.equal((await call('GET', '/api/admin/products')).status, 401);
  assert.equal((await call('PATCH', '/api/admin/products/sale-2', {body: {sold_out: true}, headers: {'x-requested-with': 'fetch'}})).status, 401);
});

test('read-only demo mode refuses the sold-out switch', async () => {
  const {admin} = await harness({ADMIN_READ_ONLY: '1'});
  const refused = await admin('PATCH', '/api/admin/products/sale-2', {body: {sold_out: true}});
  assert.equal(refused.status, 403);
  assert.equal(refused.data.error, 'read_only');
});
