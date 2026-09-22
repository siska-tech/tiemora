// core/orders/rules.mjs, the ordering section of core/config/store.mjs, the sale fields of
// core/catalog/collect.mjs and the order notification texts: pure functions, no database.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {collectCatalog} from '../../core/catalog/collect.mjs';
import {normalizeStoreConfig} from '../../core/config/store.mjs';
import {priceOrderLine, orderTotals, orderDateWindow, orderDateError, openingHoursError, tableNumberError, normalizeTableNumber, deadlinePassed, capacityByDate, stockSummary, stockPeriodOf, dailyStockSummary, nextOrderStatuses, MAX_QUANTITY} from '../../core/orders/rules.mjs';
import {buildOrderConfirmationMessage, buildOrderSummary, buildOrderNotification, describeOrderItems} from '../../core/notifications/orders.mjs';

const ordering = normalizeStoreConfig({ordering: {
  fulfillment: {deliveryFee: 30000},
  timeSlots: [{id: 'am', start: '09:00', end: '11:00', capacity: 2}, {start: '13:00', end: '15:00'}],
  dailyCapacity: 3,
  options: {size: {label: {vi: 'Cỡ'}, choices: {small: {label: {vi: 'Nhỏ'}, price: -80000}, medium: {label: {vi: 'Vừa'}}, large: {label: {vi: 'Lớn'}, price: 120000}}}, tone: {label: 'Tone', choices: {pink: {label: {vi: 'Hồng', en: 'Pink'}}, red: {label: 'Red'}}}},
  addons: {chocolate: {label: 'Chocolate', price: 120000}, giftbag: {label: {vi: 'Túi quà'}, price: 30000}}
}}, {warn: () => {}}).config.ordering;
const product = {id: 'sample-item-1', type: 'sale', name: {vi: 'Sản phẩm mẫu', en: 'Sample Item'}, price: {sale: 349000}, options: {size: [{id: 'small'}, {id: 'medium'}, {id: 'large', price: 200000}], tone: [{id: 'pink'}, {id: 'red'}]}, addons: [{id: 'chocolate'}, {id: 'giftbag', price: 25000}], ordering: {preorder: true, stock: 10, deadline: null}};

test('catalog: sale products carry type, price.sale, options, add-ons, fulfillment, ordering and category lists; rentals are untouched', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'tiemora-sale-'));
  const add = async (folder, yaml) => { await mkdir(path.join(root, folder), {recursive: true}); await writeFile(path.join(root, folder, 'product.yaml'), yaml); };
  await add('a', 'id: a\ntype: sale\ncategory: [gifts, seasonal]\nprice:\n  sale: 349000\n  original: 400000\noptions:\n  size: [small, {id: large, price: 150000}, {id: "BAD id"}, 7]\n  tone: [pink]\n  bad: pink\naddons: [chocolate, {id: teddy, price: x}]\nfulfillment:\n  delivery: false\nordering:\n  stock: 20\n  deadline: 2026-10-19T20:00:00+07:00\n');
  await add('b', 'id: b\nprice:\n  sale: 100000\n');
  await add('c', 'id: c\nprice:\n  rental: 100000\nfulfillment:\n  pickup: true\n');
  await add('d', 'id: d\ntype: workshop\nprice:\n  sale: 5\nordering:\n  stock: -1\n');
  const warnings = [];
  const {products} = await collectCatalog(root, {warn: m => warnings.push(m)});
  const [a, b, c, d] = products;
  assert.equal(a.type, 'sale');
  assert.deepEqual(a.price, {sale: 349000, original: 400000});
  assert.equal(a.category, 'gifts');
  assert.deepEqual(a.categories, ['gifts', 'seasonal']);
  assert.deepEqual(a.options, {size: [{id: 'small'}, {id: 'large', price: 150000}], tone: [{id: 'pink'}]});
  assert.deepEqual(a.addons, [{id: 'chocolate'}, {id: 'teddy'}]);
  assert.deepEqual(a.fulfillment, {pickup: true, delivery: false, dine_in: false});
  assert.deepEqual(a.ordering, {preorder: true, stock: 20, stockPeriod: 'total', deadline: '2026-10-19T20:00:00+07:00'});
  // type is inferred from the price key; a rental never gets sale-only fields.
  assert.equal(b.type, 'sale'); assert.equal(b.ordering.stock, null); assert.deepEqual(b.fulfillment, {pickup: true, delivery: true, dine_in: false});
  assert.equal(c.type, 'rental'); assert.equal(c.fulfillment, undefined); assert.equal(c.categories, undefined);
  assert.equal(d.type, 'sale'); assert.equal(d.ordering.stock, null);
  for (const text of ['BAD id', 'options.bad must be a list', 'price of "teddy"', 'fulfillment / ordering only apply to type: sale', 'type must be one of', 'ordering.stock must be']) assert(warnings.some(m => m.includes(text)), text);
  t.diagnostic(`${warnings.length} warnings`);
});

test('config: the ordering section is validated with defaults, generated slot ids and dropped bad entries', () => {
  const warnings = [];
  const {config} = normalizeStoreConfig({ordering: {
    fulfillment: {pickup: false, delivery: false, deliveryFee: -5},
    dates: {from: '2026-10-20', to: '2026-10-18', minLeadDays: 0},
    deadline: 'yesterday', dailyCapacity: 0,
    timeSlots: [{id: 'am', start: '09:00', end: '11:00', capacity: 2}, {start: '25:00', end: '26:00'}, {id: 'am', start: '13:00', end: '15:00'}, 'x', {start: '15:00', end: '17:00', capacity: null, label: {vi: 'Chiều'}}],
    options: {size: {label: 'Size', choices: {small: {price: 'cheap'}, 'Bad Id': {}}}, tone: 'pink'},
    addons: {giftbag: 'Gift bag'},
    messageCard: {maxLength: 5, templates: [{id: 'thanks', text: {vi: 'Cảm ơn bạn'}}, {id: 'nope'}, {text: 'x'}]},
    extra: 1
  }}, {warn: m => warnings.push(m)});
  const o = config.ordering;
  assert.deepEqual(o.fulfillment, {pickup: true, delivery: false, dine_in: false, deliveryFee: 0, deliveryNote: null});
  assert.deepEqual(o.dates, {from: null, to: null, minLeadDays: 0, maxDaysAhead: 14});
  assert.equal(o.deadline, null);
  assert.equal(o.dailyCapacity, null);
  assert.deepEqual(o.timeSlots.map(s => [s.id, s.capacity]), [['am', 2], ['1500-1700', null]]);
  assert.deepEqual(o.timeSlots[1].label, {vi: 'Chiều'});
  assert.deepEqual(o.options.size, {label: 'Size', choices: {small: {label: 'small', price: 0}}});
  assert.deepEqual(o.options.tone, {label: 'tone', choices: {}});
  assert.deepEqual(o.addons, {giftbag: {label: 'Gift bag', price: 0}});
  assert.equal(o.messageCard.maxLength, 200);
  assert.deepEqual(o.messageCard.templates, [{id: 'thanks', label: 'thanks', text: {vi: 'Cảm ơn bạn'}}]);
  for (const text of ['at least one fulfillment type', 'from is after to', 'ordering.deadline', 'dailyCapacity', 'timeSlots[1]', 'duplicate id "am"', 'Bad Id', 'ordering.extra', 'templates[1]', 'templates[2]']) assert(warnings.some(m => m.includes(text)), text);
  // Untouched defaults when the section is absent, and a valid one round-trips.
  assert.deepEqual(normalizeStoreConfig({}, {warn: () => {}}).config.ordering.timeSlots, []);
  assert.equal(ordering.timeSlots[1].id, '1300-1500');
  assert.equal(ordering.options.size.choices.small.price, -80000);
});

test('config: the dine-in table range falls back to the defaults when it is missing or inverted', () => {
  const warnings = [];
  const read = raw => normalizeStoreConfig({ordering: raw}, {warn: m => warnings.push(m)}).config.ordering.tables;
  assert.deepEqual(read({tables: {min: 1, max: 24}}), {min: 1, max: 24});
  assert.deepEqual(read({}), {min: 1, max: 99}, 'a shop that never set a range still gets one');
  // A range that counts backwards is a typo, not a shop with no tables: fall back rather than
  // refuse every table number the guests can see painted on their table.
  assert.deepEqual(read({tables: {min: 30, max: 10}}), {min: 1, max: 99});
  assert.deepEqual(read({tables: {min: 0, max: 12}}), {min: 1, max: 12});
  assert.deepEqual(read({tables: 'twelve'}), {min: 1, max: 99});
  for (const text of ['ordering.tables: max', 'ordering.tables.min', 'ordering.tables: must be a mapping']) assert(warnings.some(m => m.includes(text)), text);
});

test('pricing: base + size delta (product override wins) + add-ons, defaults for skipped groups, and every invalid choice', () => {
  const line = priceOrderLine(product, ordering, {options: {size: 'large', tone: 'red'}, addons: ['chocolate', 'giftbag'], quantity: 2});
  assert.deepEqual(line, {product_id: 'sample-item-1', quantity: 2, options: {size: 'large', tone: 'red'}, addons: ['chocolate', 'giftbag'], unit_price: 349000 + 200000 + 120000 + 25000, line_total: 2 * 694000});
  assert.deepEqual(priceOrderLine(product, ordering, {}).options, {size: 'small', tone: 'pink'});
  assert.equal(priceOrderLine(product, ordering, {}).unit_price, 349000 - 80000);
  assert.equal(priceOrderLine(product, ordering, {options: {size: 'medium', tone: ''}}).unit_price, 349000);
  const errors = [
    [{options: {size: 'xl'}}, 'options.size', 'invalid'], [{options: {colour: 'red'}}, 'options.colour', 'unknown'], [{options: []}, 'options', 'invalid'],
    [{addons: ['teddy']}, 'addons', 'invalid'], [{addons: 'chocolate'}, 'addons', 'invalid'],
    [{quantity: 0}, 'quantity', 'invalid'], [{quantity: MAX_QUANTITY + 1}, 'quantity', 'invalid'], [{quantity: 1.5}, 'quantity', 'invalid']
  ];
  for (const [choice, field, code] of errors) assert.deepEqual(priceOrderLine(product, ordering, choice).error, {field, code}, field);
  assert.deepEqual(priceOrderLine({...product, type: 'rental'}, ordering, {}).error, {field: 'product_id', code: 'not_for_sale'});
  assert.deepEqual(priceOrderLine({...product, price: {}}, ordering, {}).error, {field: 'product_id', code: 'no_price'});
  // A negative delta can never make a line cheaper than free.
  assert.equal(priceOrderLine({...product, price: {sale: 10000}}, ordering, {options: {size: 'small'}}).unit_price, 0);
  assert.deepEqual(orderTotals([line], {fulfillmentType: 'delivery', deliveryFee: 30000}), {subtotal: 1388000, delivery_fee: 30000, total: 1418000});
  assert.deepEqual(orderTotals([line], {fulfillmentType: 'pickup', deliveryFee: 30000}), {subtotal: 1388000, delivery_fee: 0, total: 1388000});
});

test('dates: a campaign window is clipped to tomorrow onwards, a rolling window follows today, and the deadline is absolute', () => {
  const today = '2026-10-10';
  assert.deepEqual(orderDateWindow({from: '2026-10-18', to: '2026-10-20', minLeadDays: 1}, today), {from: '2026-10-18', to: '2026-10-20', campaign: true, open: true});
  assert.deepEqual(orderDateWindow({from: '2026-10-05', to: '2026-10-12', minLeadDays: 1}, today), {from: '2026-10-11', to: '2026-10-12', campaign: true, open: true});
  assert.equal(orderDateWindow({from: '2026-10-01', to: '2026-10-09', minLeadDays: 1}, today).open, false);
  assert.deepEqual(orderDateWindow({minLeadDays: 2, maxDaysAhead: 5}, today), {from: '2026-10-12', to: '2026-10-15', campaign: false, open: true});
  const window = orderDateWindow({from: '2026-10-18', to: '2026-10-20'}, today);
  assert.equal(orderDateError('2026-10-19', window), null);
  assert.deepEqual(orderDateError('2026-10-17', window), {field: 'fulfillment_date', code: 'too_early'});
  assert.deepEqual(orderDateError('2026-10-21', window), {field: 'fulfillment_date', code: 'too_late'});
  assert.deepEqual(orderDateError('2026-02-30', window), {field: 'fulfillment_date', code: 'invalid'});
  assert.deepEqual(orderDateError('2026-10-19', {...window, open: false}), {field: 'fulfillment_date', code: 'too_early'});
  assert.equal(deadlinePassed(null), false);
  assert.equal(deadlinePassed('2026-10-19T20:00:00+07:00', new Date('2026-10-19T12:59:59Z')), false);
  assert.equal(deadlinePassed('2026-10-19T20:00:00+07:00', new Date('2026-10-19T13:00:00Z')), true);
});

test('opening hours reject closed weekdays and slots outside the configured intervals', () => {
  const hours = {1: [{start: '10:00', end: '13:00'}], 2: [{start: '10:00', end: '13:00'}]};
  assert.deepEqual(openingHoursError('2026-10-19', {start: '10:30', end: '11:00'}, hours), null);
  assert.deepEqual(openingHoursError('2026-10-20', {start: '09:00', end: '10:30'}, hours), {field: 'time_slot', code: 'closed_hours'});
  assert.deepEqual(openingHoursError('2026-10-18', {start: '10:30', end: '11:00'}, hours), {field: 'fulfillment_date', code: 'closed_day'});
  assert.equal(openingHoursError('2026-10-19', null, {}), null);
});

test("a table number has to be a whole number inside the range the shop configured", () => {
  const tables = {min: 1, max: 24};
  assert.equal(tableNumberError(12, tables), null);
  assert.equal(tableNumberError('24', tables), null);
  // A QR link carries the number as text, and text is whatever the guest edits it into.
  assert.deepEqual(tableNumberError('A12', tables), {field: 'table_number', code: 'invalid'});
  assert.deepEqual(tableNumberError('', tables), {field: 'table_number', code: 'invalid'});
  assert.deepEqual(tableNumberError(null, tables), {field: 'table_number', code: 'invalid'});
  assert.deepEqual(tableNumberError('1.5', tables), {field: 'table_number', code: 'invalid'});
  assert.deepEqual(tableNumberError('-3', tables), {field: 'table_number', code: 'invalid'});
  assert.deepEqual(tableNumberError(25, tables), {field: 'table_number', code: 'out_of_range'});
  assert.deepEqual(tableNumberError(0, tables), {field: 'table_number', code: 'out_of_range'});
  // Without a configured range the default 1-99 applies, so a shop that never set one is still guarded.
  assert.equal(tableNumberError(99), null);
  assert.deepEqual(tableNumberError(100), {field: 'table_number', code: 'out_of_range'});
  assert.equal(normalizeTableNumber('007'), '7', 'one table, one stored number');
});

test('capacity: slots close on their own limit or the day limit; unlimited slots stay open; stock counts units', () => {
  const dates = ['2026-10-19', '2026-10-20'];
  const counts = {'2026-10-20': {total: 3, slots: {am: 1, '1300-1500': 2}}, '2026-10-19': {total: 1, slots: {am: 1}}};
  const capacity = capacityByDate(ordering, dates, counts);
  assert.deepEqual(capacity['2026-10-19'], {used: 1, capacity: 3, remaining: 2, open: true, slots: {am: {used: 1, capacity: 2, remaining: 1, open: true}, '1300-1500': {used: 0, capacity: null, remaining: null, open: true}}});
  // Day 20 is at its daily limit: every slot is closed, whatever its own room.
  assert.equal(capacity['2026-10-20'].open, false);
  assert.deepEqual(Object.values(capacity['2026-10-20'].slots).map(s => s.open), [false, false]);
  // No slots configured: the day is the unit; no limits configured: always open with null capacities.
  assert.deepEqual(capacityByDate({timeSlots: [], dailyCapacity: 1}, ['2026-10-19'], {'2026-10-19': {total: 1, slots: {}}})['2026-10-19'].open, false);
  const free = capacityByDate({timeSlots: [{id: 'x'}]}, ['2026-10-19'], {})['2026-10-19'];
  assert.deepEqual([free.capacity, free.open, free.slots.x], [null, true, {used: 0, capacity: null, remaining: null, open: true}]);
  assert.deepEqual(stockSummary(product, 9), {stock: 10, stockPeriod: 'total', sold: 9, remaining: 1, soldOut: false});
  assert.deepEqual(stockSummary(product, 12), {stock: 10, stockPeriod: 'total', sold: 12, remaining: 0, soldOut: true});
  assert.deepEqual(stockSummary({ordering: {stock: null}}, 500), {stock: null, stockPeriod: 'total', sold: 500, remaining: null, soldOut: false});
});

test('status flow: pickup and delivery differ only at "ready"; terminal states offer nothing', () => {
  assert.deepEqual(nextOrderStatuses('pending'), ['confirmed', 'cancelled']);
  assert.deepEqual(nextOrderStatuses('ready', 'pickup'), ['completed', 'cancelled']);
  assert.deepEqual(nextOrderStatuses('ready', 'delivery'), ['out_for_delivery', 'completed', 'cancelled']);
  assert.deepEqual(nextOrderStatuses('out_for_delivery'), ['completed', 'cancelled']);
  assert.deepEqual(nextOrderStatuses('completed'), []);
  assert.deepEqual(nextOrderStatuses('cancelled'), []);
  assert.deepEqual(nextOrderStatuses('nonsense'), []);
});

test('notification texts: localized product, option and slot labels, delivery block, card, total and id in four languages', () => {
  const store = {store: {name: 'Sample Store'}, defaultLanguage: 'vi', currency: 'VND', phoneCountryCode: '84', ordering, contact: {messenger: 'https://m.me/shop'}};
  const order = {id: 'ord-20261018-ab12', customer_name: 'Thu', customer_phone: '0900000010', preferred_contact_channel: 'zalo', fulfillment_type: 'delivery', fulfillment_date: '2026-10-20', time_slot: 'am',
    recipient_name: 'Lan', recipient_phone: '0900000011', delivery_address: 'Địa chỉ mẫu, Quận 1', message_card: 'Cảm ơn bạn nhiều', total: 679000, currency: 'VND',
    items: [{product_id: 'sample-item-1', quantity: 1, options: {size: 'large', tone: 'pink'}, addons: ['giftbag'], line_total: 679000}]};
  const vi = buildOrderConfirmationMessage(order, [product], 'vi', {store});
  assert.match(vi, /^Xin chào Thu/);
  assert.match(vi, /Đơn hoa của bạn tại Sample Store đã được xác nhận\./);
  assert.match(vi, /Sản phẩm: Sản phẩm mẫu \(Lớn · Hồng\) \+ Túi quà ×1/);
  assert.match(vi, /Giao tận nơi: 20\/10\/2026, 09:00–11:00/);
  assert.match(vi, /Người nhận: Lan · 0900000011/);
  assert.match(vi, /Địa chỉ: Địa chỉ mẫu, Quận 1/);
  assert.match(vi, /Lời nhắn trên thiệp: “Cảm ơn bạn nhiều”/);
  assert.match(vi, /Tổng: 679\.000/);
  assert.match(vi, /Mã đơn: ord-20261018-ab12/);
  const en = buildOrderConfirmationMessage(order, [product], 'en', {store, note: 'Payment on pickup.'});
  // Labels without an English translation fall back to Vietnamese (the store default), by design.
  assert.match(en, /Sample Item \(Lớn · Pink\) \+ Túi quà ×1/);
  assert.match(en, /Delivery: 20\/10\/2026, 09:00–11:00/);
  assert.match(en, /Payment on pickup\./);
  assert.match(buildOrderConfirmationMessage(order, [product], 'ja', {store}), /配送: 2026\/10\/20, 09:00–11:00/);
  assert.match(buildOrderConfirmationMessage(order, [product], 'zh', {store}), /配送: 2026\/10\/20/);
  // Pickup orders skip the delivery block; the item description parses JSON columns as the database returns them.
  const pickup = {...order, fulfillment_type: 'pickup', items: [{product_id: 'sample-item-1', quantity: 2, options: '{"size":"small"}', addons: '[]', line_total: 1}]};
  const text = buildOrderConfirmationMessage(pickup, new Map([[product.id, product]]), 'vi', {store});
  assert.match(text, /Nhận tại cửa hàng: 20\/10\/2026, 09:00–11:00/);
  assert.doesNotMatch(text, /Địa chỉ:/);
  assert.deepEqual(describeOrderItems(pickup, [product], store, 'vi')[0], {name: 'Sản phẩm mẫu', options: ['Nhỏ'], addons: [], quantity: 2, line_total: 1});
  assert.equal(buildOrderSummary(order, [product], store, 'vi'), 'ord-20261018-ab12\nThu\n0900000010\nSản phẩm mẫu (Lớn · Hồng) + Túi quà ×1\nDelivery · 20/10/2026 · 09:00–11:00\nĐịa chỉ mẫu, Quận 1\n“Cảm ơn bạn nhiều”');
  const n = buildOrderNotification(order, [product], store);
  assert.equal(n.preferred, 'zalo');
  assert.equal(n.zalo.number, '84900000010');
  assert.equal(n.messenger.url, 'https://m.me/shop');
  assert.deepEqual(Object.keys(n.messages), ['vi', 'en', 'ja', 'zh']);
});

test('daily stock is counted per service day, total stock is counted once and never refills', () => {
  const campaign = {id: 'bouquet', ordering: {stock: 3}};
  const bowl = {id: 'pho', ordering: {stock: 2, stockPeriod: 'daily'}};
  assert.equal(stockPeriodOf(campaign), 'total', 'a product that says nothing keeps the v0.2 meaning');
  assert.equal(stockPeriodOf(bowl), 'daily');

  // Total: every active order ever counts against the same three.
  assert.deepEqual(stockSummary(campaign, 3), {stock: 3, stockPeriod: 'total', sold: 3, remaining: 0, soldOut: true});

  // Daily: two bowls sold for Monday leave Monday sold out and Tuesday untouched.
  const dates = ['2026-10-19', '2026-10-20'];
  const summary = dailyStockSummary(bowl, dates, {'2026-10-19': {pho: 2}});
  assert.equal(summary.byDate['2026-10-19'].soldOut, true);
  assert.equal(summary.byDate['2026-10-19'].remaining, 0);
  assert.equal(summary.byDate['2026-10-20'].soldOut, false, 'tomorrow starts full again');
  assert.equal(summary.byDate['2026-10-20'].remaining, 2);
  // The card speaks before a date is picked, so it reports the first day that still has bowls.
  assert.equal(summary.soldOut, false);
  assert.equal(summary.remaining, 2);

  // Only when every day in the window is gone does the product read as sold out.
  const gone = dailyStockSummary(bowl, dates, {'2026-10-19': {pho: 2}, '2026-10-20': {pho: 5}});
  assert.equal(gone.soldOut, true);
  assert.equal(gone.remaining, 0);
});
