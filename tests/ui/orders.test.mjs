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
    messageCard: {enabled: true, maxLength: 120, placeholder: {vi: 'Viết lời nhắn của bạn'}, templates: [{id: 'thanks', label: {vi: 'Cảm ơn'}, text: {vi: 'Cảm ơn bạn'}}]}
  },
  admin: {defaultLanguage: 'vi'}
};
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, label, timeout = 3000) { const started = Date.now(); while (Date.now() - started < timeout) { const v = check(); if (v) return v; await wait(5); } throw new Error('Timed out: ' + label); }
const text = el => el.textContent.replace(/\s+/g, ' ').trim();

async function backend(extraEnv = {}) {
  resetCatalogCache(); resetStoreCache();
  const env = {
    DB: await migratedDatabase(),
    ASSETS: {fetch: async request => { const p = new URL(request.url).pathname; return p === '/catalog.json' ? Response.json(catalog) : p === '/store.json' ? Response.json(store) : new Response('', {status: 404}); }},
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
async function storefront(t, env, {hash = ''} = {}) {
  const dom = new JSDOM(await readFile(new URL('../../storefront/index.html', import.meta.url), 'utf8'), {url: ORIGIN + '/' + hash, runScripts: 'outside-only'});
  t.after(() => dom.window.close());
  const {window} = dom;
  window.fetch = async (url, init = {}) => {
    if (url === '/store.json') return {ok: true, json: async () => structuredClone(store)};
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
  const scripts = await Promise.all(['catalog.js', 'gallery.js', 'app.js', 'booking.js', 'order.js'].map(async file => new vm.Script(await readFile(new URL('../../storefront/' + file, import.meta.url), 'utf8'), {filename: file})));
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
  // The form: template chip fills the card, delivery reveals the recipient fields, slots show real capacity.
  d.getElementById('order-open').click();
  const form = d.getElementById('order-form');
  await until(() => d.querySelectorAll('#slot-chips .chip').length === 2, 'slot chips');
  assert.equal(d.getElementById('order-dialog').hasAttribute('open'), true);
  assert.equal(form.elements.message_card.placeholder, 'Viết lời nhắn của bạn');
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
