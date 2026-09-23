// The sale / pre-order flow end to end in jsdom: the storefront (all five page scripts) talks to the
// real Worker over the node:sqlite shim, then the admin page manages the order it created.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM, VirtualConsole} from 'jsdom';
import worker from '../../worker/index.mjs';
import {resetCatalogCache} from '../../worker/catalog.mjs';
import {resetStoreCache} from '../../worker/store.mjs';
import {migratedDatabase} from '../d1-shim.mjs';
import {todayIn, shiftDate} from '../../core/booking/dates.mjs';

const ORIGIN = 'https://shop.example';

test('generic cart state merges identical selections, separates variants, persists and clears', async () => {
  const source = await readFile(new URL('../../storefront/cart.js', import.meta.url), 'utf8');
  const local = new Map();
  const storage = {getItem: key => local.get(key) || null, setItem: (key, value) => local.set(key, value), removeItem: key => local.delete(key)};
  const context = {window: {localStorage: storage}, localStorage: storage, JSON, Object, Number, Math, Set, console};
  vm.runInNewContext(source, context);
  const cart = context.window.TiemoraCart;
  cart.add({productId: 'pho-bo-tai', options: {size: 'regular'}, addons: [], unitPrice: 45000, lineTotal: 45000, quantity: 1});
  cart.add({productId: 'pho-bo-tai', options: {size: 'regular'}, addons: [], unitPrice: 45000, lineTotal: 45000, quantity: 1});
  cart.add({productId: 'pho-bo-tai', options: {size: 'large'}, addons: [], unitPrice: 60000, lineTotal: 60000, quantity: 1});
  assert.equal(cart.snapshot().length, 2);
  assert.equal(cart.snapshot()[0].quantity, 2);
  assert.equal(cart.totals().subtotal, 150000);
  assert.equal(cart.totals().delivery_fee, 0);
  assert.equal(cart.totals().total, 150000);
  cart.update(0, 1);
  cart.remove(1);
  assert.equal(cart.snapshot().length, 1);
  cart.clear();
  assert.deepEqual(cart.snapshot(), []);
  // A subscriber is handed the cart it is joining, not just the changes after it. cart.js restores
  // before the page scripts that listen exist, so without this a reload shows an empty cart bar.
  cart.add({productId: "pho-ga", options: {}, addons: [], unitPrice: 45000, lineTotal: 45000, quantity: 1});
  const seen = [];
  const stop = cart.subscribe(items => seen.push(items.length));
  assert.deepEqual(seen, [1], "subscribing reports the current cart at once");
  cart.add({productId: "quay", options: {}, addons: [], unitPrice: 10000, lineTotal: 10000, quantity: 1});
  assert.deepEqual(seen, [1, 2]);
  stop();
  cart.clear();
  assert.deepEqual(seen, [1, 2], "unsubscribing stops the updates");
  local.set(cart.STORAGE_KEY, '{broken');
  assert.deepEqual(cart.restore(), []);
});
const today = todayIn('Asia/Ho_Chi_Minh');
const day = n => shiftDate(today, n);
const catalog = [
  {id: 'sale-1', type: 'sale', name: {vi: 'Sản phẩm mẫu', en: 'Sample Item'}, description: {vi: 'Sản phẩm mẫu để demo'}, category: 'gifts', categories: ['gifts', 'featured'], price: {sale: 349000}, currency: 'VND',
    options: {size: [{id: 'small'}, {id: 'medium'}, {id: 'large'}], tone: [{id: 'pink'}, {id: 'white'}]}, addons: [{id: 'giftbag'}], fulfillment: {pickup: true, delivery: true}, ordering: {preorder: true, stock: 5, deadline: null},
    featured: true, cover: '/catalog/a/cover.webp', images: ['/catalog/a/cover.webp'], videos: []},
  {id: 'sale-2', type: 'sale', name: {vi: 'Sản phẩm mẫu B'}, category: 'elegant', price: {sale: 599000}, currency: 'VND', fulfillment: {pickup: true, delivery: false}, ordering: {preorder: true, stock: null, deadline: null}, cover: null, images: [], videos: []}
];
const store = {
  store: {name: 'Sample Store', tagline: {vi: 'Cửa hàng mẫu.'}, description: {vi: 'Cửa hàng mẫu'}, logo: null, logoStyle: 'mark', hero: {eyebrow: {vi: 'SAMPLE COLLECTION'}, title: {vi: 'Chọn một món quà'}, subtitle: {vi: 'Bộ sưu tập mẫu'}, image: null, fit: 'pan', focus: null}, announcement: null, values: [], text: {bookCta: {vi: 'Đặt hàng', en: 'Order now'}, count: {vi: 'mẫu'}}},
  languages: ['vi', 'en'], defaultLanguage: 'vi', currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', phoneCountryCode: '84',
  contact: {facebook: null, messenger: 'https://m.me/sampleshop', zalo: null, whatsapp: null, phone: null, email: null, address: null, mapUrl: null},
  categories: {gifts: {vi: 'Quà tặng'}, featured: {vi: 'Nổi bật'}, elegant: {vi: 'Thanh lịch'}},
  theme: {}, booking: {maxRentalDays: 60, maxDaysAhead: 365, bufferDays: 0},
  ordering: {
    fulfillment: {pickup: true, delivery: true, deliveryFee: 30000, deliveryNote: {vi: 'Nội thành'}},
    dates: {from: day(1), to: day(3), minLeadDays: 1, maxDaysAhead: 14}, deadline: null, dailyCapacity: null,
    timeSlots: [{id: 'am', start: '09:00', end: '11:00', capacity: 1, label: null}, {id: 'pm', start: '13:00', end: '15:00', capacity: null, label: null}],
    options: {size: {label: {vi: 'Kích cỡ'}, choices: {small: {label: {vi: 'Nhỏ'}, price: -80000}, medium: {label: {vi: 'Vừa'}, price: 0}, large: {label: {vi: 'Lớn'}, price: 120000}}}, tone: {label: {vi: 'Tông màu'}, choices: {pink: {label: {vi: 'Hồng'}, price: 0}, white: {label: {vi: 'Trắng'}, price: 0}}}},
    addons: {giftbag: {label: {vi: 'Túi quà'}, price: 30000}},
    messageCard: {enabled: true, maxLength: 120, title: {vi: 'Ghi chú cho quán'}, placeholder: {vi: 'Viết lời nhắn của bạn'}, templates: [{id: 'thanks', label: {vi: 'Cảm ơn'}, text: {vi: 'Cảm ơn bạn'}}]}
  },
  admin: {defaultLanguage: 'vi'}
};
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, label, timeout = 3000) { const started = Date.now(); while (Date.now() - started < timeout) { const v = check(); if (v) return v; await wait(5); } throw new Error('Timed out: ' + label); }
const text = el => el.textContent.replace(/\s+/g, ' ').trim();

async function backend(extraEnv = {}, shop = store) {
  resetCatalogCache(); resetStoreCache();
  const env = {
    DB: await migratedDatabase(),
    ASSETS: {fetch: async request => { const p = new URL(request.url).pathname; return p === '/catalog.json' ? Response.json(catalog) : p === '/store.json' ? Response.json(shop) : new Response('', {status: 404}); }},
    ADMIN_PASSWORD: 'pw', STORE_TIMEZONE: 'Asia/Ho_Chi_Minh', ...extraEnv
  };
  const login = await worker.fetch(new Request(ORIGIN + '/api/admin/login', {method: 'POST', headers: {'content-type': 'application/json', 'x-requested-with': 'fetch'}, body: JSON.stringify({password: 'pw'})}), env);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const api = async (method, path, body) => {
    const response = await worker.fetch(new Request(ORIGIN + path, {method, headers: {cookie, 'x-requested-with': 'fetch', ...(body ? {'content-type': 'application/json'} : {})}, body: body ? JSON.stringify(body) : undefined}), env);
    return {status: response.status, data: await response.json()};
  };
  return {env, cookie, api};
}
async function storefront(t, env, {hash = '', search = '', shop = store, savedCart = null} = {}) {
  const dom = new JSDOM(await readFile(new URL('../../storefront/index.html', import.meta.url), 'utf8'), {url: ORIGIN + '/' + search + hash, runScripts: 'outside-only'});
  t.after(() => dom.window.close());
  const {window} = dom;
  window.fetch = async (url, init = {}) => {
    if (url === '/store.json') return {ok: true, json: async () => structuredClone(shop)};
    if (url === '/catalog.json') return {ok: true, json: async () => structuredClone(catalog)};
    const response = await worker.fetch(new Request(ORIGIN + url, {...init, headers: {'cf-connecting-ip': '203.0.113.9', ...(init.headers || {})}}), env);
    return {ok: response.ok, status: response.status, json: async () => response.json()};
  };
  window.console.error = () => {}; window.console.warn = () => {};
  window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new window.Event('close')); };
  window.HTMLElement.prototype.scrollIntoView = function () {};
  window.matchMedia = query => ({media: query, matches: false, addEventListener() {}, removeEventListener() {}});
  window.requestAnimationFrame = callback => { callback(0); return 0; };
  window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  // Read every script first, then run them back to back as deferred scripts do (no fetch can resolve in between).
  // What a returning visitor's browser already holds, written before any script runs -- the same
  // state a reload lands in.
  if (savedCart) window.localStorage.setItem('tiemora-cart-v1', JSON.stringify({version: 1, items: savedCart}));
  const scripts = await Promise.all(['catalog.js', 'gallery.js', 'app.js', 'booking.js', 'cart.js', 'order.js'].map(async file => new vm.Script(await readFile(new URL('../../storefront/' + file, import.meta.url), 'utf8'), {filename: file})));
  for (const script of scripts) script.runInContext(dom.getInternalVMContext());
  await until(() => window.document.getElementById('products').getAttribute('aria-busy') === 'false', 'catalog render');
  await until(() => [...window.document.querySelectorAll('.availability')].every(el => el.textContent.trim()), 'order config');
  return {window, document: window.document};
}
async function admin(t, env, cookie, hash = '#/') {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', () => {});
  const dom = new JSDOM(await readFile(new URL('../../admin/index.html', import.meta.url), 'utf8'), {url: ORIGIN + '/admin/' + hash, runScripts: 'outside-only', virtualConsole});
  t.after(() => dom.window.close());
  const {window} = dom;
  window.fetch = async (path, init = {}) => {
    if (path === '/catalog.json') return Response.json(catalog);
    if (path === '/store.json') return Response.json(store);
    return worker.fetch(new Request(ORIGIN + path, {...init, headers: {...(init.headers || {}), cookie}}), env);
  };
  window.confirm = () => true; window.scrollTo = () => {}; window.console.error = () => {};
  new vm.Script(await readFile(new URL('../../admin/admin.js', import.meta.url), 'utf8'), {filename: 'admin.js'}).runInContext(dom.getInternalVMContext());
  const go = async h => { window.location.hash = h; await wait(5); };
  return {window, document: window.document, go};
}
const pick = (d, window, selector) => { const input = d.querySelector(selector); input.checked = true; input.dispatchEvent(new window.Event('change', {bubbles: true})); };
const type = (d, window, name, value) => { const input = d.querySelector(`#order-form [name="${name}"]`); input.value = value; input.dispatchEvent(new window.Event('input', {bubbles: true})); };

test('storefront: sale products show the pre-order state, the dialog prices options live, and the form places an order the admin then confirms', async t => {
  const {env, cookie, api} = await backend();
  const {window, document: d} = await storefront(t, env);
  // Cards: copy overrides from store.text, sale CTA, category list filters, no rental date search.
  assert.equal(text(d.getElementById('hero-book')), 'Đặt hàng↗');
  assert.equal(text(d.getElementById('hero-eyebrow')), 'SAMPLE COLLECTION');
  assert.equal(text(d.getElementById('hero-subtitle')), 'Bộ sưu tập mẫu');
  assert.equal(d.querySelector('.date-search').hidden, true);
  assert.deepEqual([...d.querySelectorAll('.product .product-cta')].map(text), ['Đặt trước ↗', 'Đặt trước ↗']);
  assert.deepEqual([...d.querySelectorAll('.availability')].map(text), ['Còn 5', 'Nhận đặt trước']);
  assert(d.querySelector('[data-id="sale-1"] .product-price').textContent.includes('349.000'));
  assert.equal(text(d.getElementById('count')), '2 mẫu');
  assert.deepEqual([...d.querySelectorAll('[data-filter^="category:"]')].map(b => b.dataset.filter), ['category:gifts', 'category:featured', 'category:elegant']);
  d.querySelector('[data-filter="category:featured"]').click();
  assert.equal(d.querySelectorAll('.product').length, 1);
  // The dialog: option chips, add-on, quantity and the running total.
  d.querySelector('[data-id="sale-1"]').click();
  assert.equal(d.getElementById('dialog-booking').hidden, true);
  assert.equal(d.getElementById('dialog-order').hidden, false);
  assert.deepEqual([...d.querySelectorAll('#order-options .option-label')].map(text), ['Kích cỡ', 'Tông màu']);
  assert.equal(d.querySelector('#order-options input[value="small"]').checked, true);
  assert(text(d.getElementById('order-total')).includes('269.000'));
  pick(d, window, '#order-options input[value="large"]');
  pick(d, window, '#order-addons input[value="giftbag"]');
  d.getElementById('qty-plus').click();
  assert.equal(d.getElementById('order-qty').value, '2');
  assert(text(d.getElementById('order-total')).includes('998.000'), text(d.getElementById('order-total')));
  assert.equal(d.getElementById('order-open').disabled, false);
  // Add to cart, then open checkout from the sticky cart bar.
  d.getElementById('order-open').click();
  assert.equal(d.getElementById('cart-bar').hidden, false);
  d.getElementById('cart-bar').click();
  const form = d.getElementById('order-form');
  await until(() => d.querySelectorAll('#slot-chips .chip').length === 2, 'slot chips');
  assert.equal(d.getElementById('order-dialog').hasAttribute('open'), true);
  assert.equal(form.elements.message_card.placeholder, 'Viết lời nhắn của bạn');
  assert.equal(d.querySelector('#order-card-section [data-order-i18n="cardTitle"]').textContent, 'Ghi chú cho quán');
  d.querySelector('[data-template="thanks"]').click();
  assert.equal(form.elements.message_card.value, 'Cảm ơn bạn');
  assert.deepEqual([...d.querySelectorAll('#fulfillment-cards .channel-name')].map(text), ['Nhận tại cửa hàng', 'Giao tận nơi']);
  assert(text(d.querySelector('#fulfillment-cards')).includes('30.000'));
  assert.equal(d.getElementById('delivery-fields').hidden, true);
  pick(d, window, '#fulfillment-delivery');
  assert.equal(d.getElementById('delivery-fields').hidden, false);
  assert.equal(text(d.getElementById('delivery-note-text')), 'Nội thành');
  assert(text(d.getElementById('order-submit-total')).includes('1.028.000'));
  assert.deepEqual([...d.querySelectorAll('#date-chips input')].map(i => i.value), [day(1), day(2), day(3)]);
  assert.deepEqual([...d.querySelectorAll('#slot-chips .chip')].map(text), ['09:00–11:00còn 1', '13:00–15:00']);
  pick(d, window, '#date-chips input[value="' + day(2) + '"]');
  pick(d, window, '#slot-chips input[value="am"]');
  // Validation before sending: recipient, then consent.
  type(d, window, 'customer_name', 'Tran Thu'); type(d, window, 'customer_phone', '0900000010');
  form.dispatchEvent(new window.Event('submit', {cancelable: true}));
  await wait(0);
  assert.equal(text(d.getElementById('order-error')), 'Vui lòng nhập tên, số điện thoại và địa chỉ người nhận.');
  type(d, window, 'recipient_name', 'Lan'); type(d, window, 'recipient_phone', '0900000011'); type(d, window, 'delivery_address', 'Địa chỉ mẫu, Quận 1');
  form.dispatchEvent(new window.Event('submit', {cancelable: true}));
  await wait(0);
  assert.equal(text(d.getElementById('order-error')), 'Vui lòng đồng ý với Chính sách bảo mật để gửi đơn.');
  assert(d.getElementById('order-consent-row').classList.contains('is-invalid'));
  d.getElementById('order-privacy-consent').checked = true;
  form.dispatchEvent(new window.Event('submit', {cancelable: true}));
  await until(() => !d.getElementById('order-done').hidden, 'done screen');
  const done = text(d.getElementById('order-done'));
  assert.match(done, /Cảm ơn bạn/);
  assert.match(done, /ord-\d{8}-[a-z0-9]{4}/);
  assert.match(done, /Giao tận nơi · \d{2}\/\d{2}\/\d{4} · 09:00–11:00 · 1\.028\.000/);
  assert(d.querySelector('#order-done .chat').getAttribute('href') === 'https://m.me/sampleshop');
  // The order really exists, priced by the Worker, and the slot is now full for the next customer.
  const {data: {orders}} = await api('GET', '/api/admin/orders');
  assert.equal(orders.length, 1);
  const [order] = orders;
  assert.equal(order.customer_name, 'Tran Thu');
  assert.equal(order.message_card, 'Cảm ơn bạn');
  assert.deepEqual(order.items[0].options, {size: 'large', tone: 'pink'});
  assert.deepEqual(order.items[0].addons, ['giftbag']);
  assert.equal(order.items[0].quantity, 2);
  assert.equal(order.total, 2 * (349000 + 120000 + 30000) + 30000);
  assert.equal(order.delivery_address, 'Địa chỉ mẫu, Quận 1');
  assert.equal(order.privacy_consent, 1);
  // Closing the product dialog closes the order dialog and the grid shows the stock left.
  d.getElementById('close-dialog').click();
  assert.equal(d.getElementById('order-dialog').hasAttribute('open'), false);
  await until(() => text(d.querySelector('[data-id="sale-1"] .availability')) === 'Còn 3', 'stock on the card');

  // Admin: the Orders module appears (no rental pages), the list and the detail page work, statuses move.
  const a = await admin(t, env, cookie, '#/orders');
  await until(() => a.document.querySelector('#order-table .table'), 'order list');
  assert.equal(a.document.querySelector('[data-route=orders]').hidden, false);
  assert.equal(a.document.querySelector('[data-route=inventory]').hidden, true);
  assert.equal(a.document.querySelector('[data-route=reservations]').hidden, true);
  const row = a.document.querySelector('#order-table tbody tr');
  assert.match(text(row), new RegExp(`${order.id}.*Tran Thu.*Sản phẩm mẫu \\(Lớn · Hồng\\) \\+ Túi quà ×2.*Giao tận nơi.*09:00–11:00.*Chờ xác nhận.*Chưa gửi`));
  await a.go('#/orders/' + order.id);
  await until(() => a.document.getElementById('status-actions'), 'order detail');
  assert.equal(text(a.document.querySelector('.card-message')), 'Cảm ơn bạn');
  assert(text(a.document.querySelector('.order-grid')).includes('Địa chỉ mẫu, Quận 1'));
  assert.deepEqual([...a.document.querySelectorAll('#status-actions [data-status]')].map(b => b.dataset.status), ['confirmed', 'cancelled']);
  assert.match(a.document.getElementById('notify-message').value, /Đơn hoa của bạn tại Sample Store đã được xác nhận/);
  a.document.querySelector('[data-status="confirmed"]').click();
  await until(() => a.document.querySelector('#status-actions [data-status="preparing"]'), 'confirmed');
  assert.equal((await api('GET', '/api/admin/orders/' + order.id)).data.order.status, 'confirmed');
  // Notify the customer, then the schedule for that day lists the delivery under its slot.
  a.document.querySelector('#mark-sent [data-notify=sent]').click();
  await until(() => a.document.querySelector('#mark-sent [data-notify=not_sent]'), 'notified');
  assert.equal((await api('GET', '/api/admin/orders/' + order.id)).data.order.notification_status, 'sent');
  await a.go('#/orders/schedule?date=' + day(2));
  await until(() => a.document.querySelector('.schedule-grid'), 'schedule');
  const sections = [...a.document.querySelectorAll('.schedule-grid section')];
  assert.match(text(sections[1].querySelector('.slot')), /09:00–11:00 1 \/ 1 đã dùng.*Tran Thu/);
  // Dashboard tiles are the order ones.
  await a.go('#/');
  await until(() => a.document.querySelector('.stat'), 'dashboard');
});

test('storefront cart combines two products before checkout', async t => {
  const {env} = await backend();
  const {window, document: d} = await storefront(t, env);
  d.querySelector('[data-id="sale-1"]').click();
  d.getElementById('order-open').click();
  d.getElementById('close-dialog').click();
  d.querySelector('[data-id="sale-2"]').click();
  d.getElementById('order-open').click();
  assert.equal(d.getElementById('cart-bar').hidden, false);
  assert.match(text(d.getElementById('cart-bar')), /2/);
  d.getElementById('cart-bar').click();
  await until(() => d.querySelectorAll('.cart-item').length === 2, 'two cart items');
  assert.equal(d.getElementById('order-dialog').hasAttribute('open'), true);
  assert.equal(d.querySelectorAll('.cart-item-actions').length, 2);
  void window;
});

test('read-only demo mode: the admin shows the banner and a status change is refused with a translated message', async t => {
  const {env, cookie, api} = await backend({ADMIN_READ_ONLY: '1'});
  const created = await worker.fetch(new Request(ORIGIN + '/api/orders', {method: 'POST', headers: {'content-type': 'application/json', 'x-requested-with': 'fetch', 'cf-connecting-ip': '203.0.113.10'}, body: JSON.stringify({product_id: 'sale-2', fulfillment_type: 'pickup', fulfillment_date: day(1), time_slot: 'pm', customer_name: 'Sample Customer', customer_phone: '0900000020', preferred_contact_channel: 'phone', privacy_consent: true})}), env);
  assert.equal(created.status, 201);
  const {id} = (await created.json()).order;
  const a = await admin(t, env, cookie, '#/orders/' + id);
  await until(() => a.document.querySelector('#status-actions'), 'detail');
  assert.equal(a.document.getElementById('read-only-banner').hidden, false);
  assert.match(text(a.document.getElementById('read-only-banner')), /Chế độ demo/);
  a.document.querySelector('[data-status="confirmed"]').click();
  await until(() => a.document.getElementById('toast').classList.contains('error'), 'error toast');
  assert.equal(text(a.document.getElementById('toast')), 'Chế độ demo: thay đổi không được lưu.');
  assert.equal((await api('GET', '/api/admin/orders/' + id)).data.order.status, 'pending');
});

// A dine-in shop: the QR sticker on each table opens the storefront with the mode and the table
// already in the URL. Neither is trusted -- this is what the form does with them.
const dineInShop = {
  ...store,
  ordering: {
    ...store.ordering,
    fulfillment: {...store.ordering.fulfillment, delivery: false, dine_in: true},
    tables: {min: 1, max: 24}
  }
};
const dineInCatalog = catalog.map(p => ({...p, fulfillment: {...p.fulfillment, delivery: false, dine_in: true}}));

test('a QR table link preselects dine-in, fills the table read-only and drops the contact fields', async t => {
  const {env} = await backend({}, dineInShop);
  const {window, document: d} = await storefront(t, env, {search: '?mode=dine_in&table=12', shop: dineInShop});
  d.querySelector('[data-id="sale-1"]').click();
  d.getElementById('order-open').click();
  d.getElementById('cart-bar').click();
  await until(() => d.querySelectorAll('#fulfillment-cards .channel-card').length, 'fulfillment cards');

  // The sticker picks the card, not the first one the shop happens to offer.
  assert.equal(d.querySelector('#fulfillment-cards input:checked').value, 'dine_in');
  assert.equal(d.getElementById('dine-in-fields').hidden, false);
  const table = d.querySelector('#order-form [name="table_number"]');
  assert.equal(table.value, '12');
  assert.equal(table.readOnly, true, 'the guest cannot retype a table the sticker already knows');
  // Served where they sit: no name, no phone, no channel.
  assert.equal(d.querySelector('#order-form [name="customer_name"]').required, false);
  assert.equal(d.querySelector('#order-form [name="customer_phone"]').required, false);
  assert.equal(d.querySelector('#order-form .channel-group').hidden, true);
  void window;
});

test('a QR link naming a table the shop does not have is ignored, and the order is refused without a real one', async t => {
  const {env} = await backend({}, dineInShop);
  const {window, document: d} = await storefront(t, env, {search: '?mode=dine_in&table=99', shop: dineInShop});
  d.querySelector('[data-id="sale-1"]').click();
  d.getElementById('order-open').click();
  d.getElementById('cart-bar').click();
  await until(() => d.querySelectorAll('#fulfillment-cards .channel-card').length, 'fulfillment cards');

  // Table 99 is beyond the configured range, so the field opens up instead of carrying a lie.
  const table = d.querySelector('#order-form [name="table_number"]');
  assert.equal(d.querySelector('#fulfillment-cards input:checked').value, 'dine_in');
  assert.equal(table.value, '');
  assert.equal(table.readOnly, false);

  pick(d, window, '#date-chips input');
  pick(d, window, '#slot-chips input');
  d.querySelector('#order-form [name="privacy_consent"]').checked = true;
  type(d, window, 'table_number', '99');
  d.getElementById('order-form').dispatchEvent(new window.Event('submit', {bubbles: true, cancelable: true}));
  await until(() => text(d.getElementById('order-error')), 'table error');
  assert.match(text(d.getElementById('order-error')), /1.*24/, 'the message names the range the shop configured');
});

test('a dine-in order reaches the Worker with its table and no contact details', async t => {
  const {env, cookie, api} = await backend({}, dineInShop);
  const {window, document: d} = await storefront(t, env, {search: '?mode=dine_in&table=7', shop: dineInShop});
  d.querySelector('[data-id="sale-1"]').click();
  d.getElementById('order-open').click();
  d.getElementById('cart-bar').click();
  await until(() => d.querySelectorAll('#fulfillment-cards .channel-card').length, 'fulfillment cards');
  pick(d, window, '#date-chips input');
  pick(d, window, '#slot-chips input');
  d.querySelector('#order-form [name="privacy_consent"]').checked = true;
  d.getElementById('order-form').dispatchEvent(new window.Event('submit', {bubbles: true, cancelable: true}));
  await until(() => d.getElementById('order-done').dataset.id, 'order placed');

  const id = d.getElementById('order-done').dataset.id;
  const {data} = await api('GET', '/api/admin/orders/' + id);
  assert.equal(data.order.fulfillment_type, 'dine_in');
  assert.equal(data.order.table_number, '7');
  assert.equal(data.order.customer_name, '');
  assert.equal(data.order.customer_phone, '');
  void cookie; void dineInCatalog;
});

test('the Order Queue lanes the day\'s work and its buttons walk an order to completed', async t => {
  const {env, cookie, api} = await backend({}, dineInShop);
  const place = body => worker.fetch(new Request(ORIGIN + '/api/orders', {method: 'POST', headers: {'content-type': 'application/json', 'x-requested-with': 'fetch', 'cf-connecting-ip': '203.0.113.30'}, body: JSON.stringify(body)}), env);
  const dine = await place({product_id: 'sale-1', options: {size: 'medium', tone: 'pink'}, fulfillment_type: 'dine_in', fulfillment_date: day(1), time_slot: 'am', table_number: 9, note: 'Không hành', privacy_consent: true});
  assert.equal(dine.status, 201);
  const dineId = (await dine.json()).order.id;
  const takeaway = await place({product_id: 'sale-2', fulfillment_type: 'pickup', fulfillment_date: day(1), time_slot: 'pm', customer_name: 'Mai', customer_phone: '0900000030', preferred_contact_channel: 'phone', privacy_consent: true});
  assert.equal(takeaway.status, 201);

  const a = await admin(t, env, cookie, '#/orders/queue?date=' + day(1));
  await until(() => a.document.querySelectorAll('.queue-card').length === 2, 'two cards');
  // Everything a cook needs is on the card: the table, the lines and the note.
  const card = a.document.querySelector(`[data-order="${dineId}"]`);
  assert.match(text(card), /Số bàn 9/);
  assert.match(text(card), /Không hành/);
  assert.match(text(card), /×1/);
  // Both start in the pending lane; the first button confirms.
  assert.equal(a.document.querySelectorAll('.queue-lane')[0].querySelectorAll('.queue-card').length, 2);
  for (const [status, lane] of [['confirmed', 1], ['preparing', 2], ['ready', 3]]) {
    a.document.querySelector(`[data-order="${dineId}"] [data-queue-status="${status}"]`).click();
    await until(() => a.document.querySelectorAll('.queue-lane')[lane].querySelector(`[data-order="${dineId}"]`), status + ' lane');
  }
  // Completed is not a lane: a served bowl leaves the screen.
  a.document.querySelector(`[data-order="${dineId}"] [data-queue-status="completed"]`).click();
  await until(() => !a.document.querySelector(`[data-order="${dineId}"]`), 'card leaves the queue');
  const {data} = await api('GET', '/api/admin/orders/' + dineId);
  assert.equal(data.order.status, 'completed');
});

test('the admin Menu switches a dish off, and the storefront then shows it sold out', async t => {
  const {env, cookie} = await backend();
  const a = await admin(t, env, cookie, '#/menu');
  await until(() => a.document.querySelectorAll('[data-product]').length === 2, 'menu rows');
  // Rental products are not on this screen: their stock lives in Inventory.
  assert.deepEqual([...a.document.querySelectorAll('[data-product]')].map(r => r.dataset.product), ['sale-1', 'sale-2']);
  const row = a.document.querySelector('[data-product="sale-2"]');
  const toggle = row.querySelector('[data-sold-out]');
  assert.equal(toggle.checked, false);
  toggle.checked = true;
  toggle.dispatchEvent(new a.window.Event('change', {bubbles: true}));
  await until(() => a.document.querySelector('[data-product="sale-2"] [data-sold-out]').checked, 'switched off');

  // What the customer sees next time they open the shop.
  const {document: d} = await storefront(t, env);
  assert.equal(text(d.querySelector('[data-id="sale-2"] .availability')), 'Hết hàng');
  assert.equal(d.querySelector('[data-id="sale-2"] .availability').className.includes('unavailable'), true);
});

test('a reload with a cart already saved shows the cart bar without touching anything', async t => {
  const {env} = await backend();
  // cart.js restores and notifies while it loads, before order.js has subscribed. A subscriber that
  // only hears about later changes would leave the bar hidden until the next add -- this is that.
  const {window, document: d} = await storefront(t, env, {
    savedCart: [{productId: 'sale-1', name: {vi: 'Sản phẩm mẫu'}, quantity: 2, options: {size: 'medium', tone: 'pink'}, addons: [], unitPrice: 349000, lineTotal: 698000}]
  });
  assert.equal(d.getElementById('cart-bar').hidden, false, 'the saved cart is visible on arrival');
  assert.match(text(d.getElementById('cart-bar')), /2/);

  // And it is the real cart, not just a visible bar: opening it shows the line.
  d.getElementById('cart-bar').click();
  await until(() => d.querySelectorAll('.cart-item').length === 1, 'the restored line');
  assert.equal(d.getElementById('order-dialog').hasAttribute('open'), true);
  void window;
});
