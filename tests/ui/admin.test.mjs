// The admin page is driven in jsdom against the real Worker, with its fetch() wired straight into
// worker.fetch() over the node:sqlite D1 shim, so these tests cover admin.js, api.mjs and db.mjs together.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM, VirtualConsole} from 'jsdom';
import worker from '../../worker/index.mjs';
import {resetCatalogCache} from '../../worker/catalog.mjs';
import {resetStoreCache} from '../../worker/store.mjs';
import {migratedDatabase} from '../d1-shim.mjs';
import {shiftDate} from '../../core/booking/dates.mjs';

const ORIGIN = 'https://store.example';
const catalog = [
  {id: 'ad-0005', name: {vi: 'Sản phẩm năm', ja: '商品五'}, category: 'rental', sizes: ['L'], inventory: {managed: true}, cover: '/catalog/a/1.jpg', images: ['/catalog/a/1.jpg'], videos: [], variants: {'/catalog/a/1.jpg': {thumb: '/catalog/a/1.thumb.webp'}}},
  {id: 'ad-0002', name: {vi: 'Sản phẩm hai'}, category: 'rental', sizes: ['S', 'M'], inventory: {managed: true}, cover: null, images: [], videos: []}
];
const saleCatalog = [
  {id: 'pho-1', name: {vi: 'Phở bò'}, category: 'pho', type: 'sale', price: {sale: 40000}, currency: 'VND', options: {size: [{id: 'regular'}, {id: 'large', price: 10000}]}, addons: [{id: 'quay'}], cover: null, images: [], videos: []},
  {id: 'tra-1', name: {vi: 'Trà đá'}, category: 'drink', type: 'sale', price: {sale: 15000}, currency: 'VND', cover: null, images: [], videos: []}
];
// The staff language starts from admin.defaultLanguage; the Vietnamese assertions below rely on it.
const store = {store: {name: 'Test Store'}, languages: ['vi', 'en', 'ja'], defaultLanguage: 'vi', phoneCountryCode: '84', contact: {messenger: 'https://m.me/teststore'}, ordering: {fulfillment: {pickup: true, delivery: true, dine_in: true}, timeSlots: [], options: {size: {label: {vi: 'Size'}, choices: {regular: {label: {vi: 'Thường'}}, large: {label: {vi: 'Lớn'}, price: 10000}}}}, addons: {quay: {label: {vi: 'Quẩy'}, price: 10000}}}, admin: {defaultLanguage: 'vi'}};
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, label, timeout = 3000) {
  const started = Date.now();
  while (Date.now() - started < timeout) { const value = check(); if (value) return value; await wait(15); }
  throw new Error(`Timed out waiting for ${label}`);
}

async function setup(t, {hash = '#/', storeConfig = store, extraEnv = {}, products = catalog} = {}) {
  resetCatalogCache(); resetStoreCache();
  const env = {
    DB: await migratedDatabase(),
    ASSETS: {fetch: async request => { const p = new URL(request.url).pathname; return p === '/catalog.json' ? Response.json(products) : p === '/store.json' ? Response.json(storeConfig) : new Response('', {status: 404}); }},
    ADMIN_PASSWORD: 'pw', RESERVATION_BUFFER_DAYS: '0', STORE_TIMEZONE: 'Asia/Ho_Chi_Minh', ...extraEnv
  };
  const login = await worker.fetch(new Request(ORIGIN + '/api/admin/login', {method: 'POST', headers: {'content-type': 'application/json', 'x-requested-with': 'fetch'}, body: JSON.stringify({password: 'pw'})}), env);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  // jsdom cannot navigate away from the page; location.replace() surfaces as a "not implemented" report instead.
  const redirects = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => { if (/navigation/i.test(error.message)) redirects.push(error.message); });
  const dom = new JSDOM(await readFile(new URL('../../admin/index.html', import.meta.url), 'utf8'), {url: ORIGIN + '/admin/' + hash, runScripts: 'outside-only', virtualConsole});
  t.after(() => dom.window.close());
  const {window} = dom;
  window.fetch = async (path, init = {}) => {
    if (path === '/catalog.json') return Response.json(products);
    if (path === '/store.json') return Response.json(storeConfig);
    const headers = {...(init.headers || {}), cookie};
    return worker.fetch(new Request(ORIGIN + path, {...init, headers}), env);
  };
  window.confirm = () => true;
  window.scrollTo = () => {};
  window.console.error = () => {};
  new vm.Script(await readFile(new URL('../../admin/admin.js', import.meta.url), 'utf8'), {filename: 'admin.js'}).runInContext(dom.getInternalVMContext());
  const api = async (method, path, body) => {
    const response = await worker.fetch(new Request(ORIGIN + path, {method, headers: {cookie, 'x-requested-with': 'fetch', ...(body ? {'content-type': 'application/json'} : {})}, body: body ? JSON.stringify(body) : undefined}), env);
    return {status: response.status, data: await response.json()};
  };
  const go = async hash => { window.location.hash = hash; await wait(5); };
  return {window, document: window.document, api, go, redirects, env};
}
const text = el => el.textContent.replace(/\s+/g, ' ').trim();

test('dashboard shows the counts and the language switch translates the navigation', async t => {
  const {window, document: d, api} = await setup(t);
  await api('POST', '/api/admin/inventory', {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'});
  await until(() => d.querySelector('.stat'), 'dashboard stats');
  const stats = [...d.querySelectorAll('.stat')].map(el => [text(el.querySelector('span')), text(el.querySelector('b'))]);
  assert.deepEqual(stats.slice(0, 4), [['Yêu cầu mới', '0'], ['Cần thông báo khách', '0'], ['Sản phẩm', '2'], ['Hàng thực tế', '1']]);
  assert.equal(text(d.getElementById('brand-name')), 'Test Store');
  assert.equal(d.querySelector('[data-route=dashboard]').getAttribute('aria-current'), 'page');
  const select = d.getElementById('admin-lang'); select.value = 'ja'; select.dispatchEvent(new window.Event('change'));
  assert.equal(text(d.querySelector('[data-route=inventory]')), '在庫');
  await until(() => d.querySelector('.stat span')?.textContent === '新規申請', 'translated dashboard');
});

test('adding an item suggests the next id, lists it and lets its status be changed inline', async t => {
  const {window, document: d, api, go} = await setup(t, {hash: '#/inventory/new'});
  await api('POST', '/api/admin/inventory', {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'});
  const form = await until(() => d.getElementById('item-form'), 'item form');
  form.elements.product_id.value = 'ad-0005'; form.elements.product_id.dispatchEvent(new window.Event('change'));
  await until(() => form.elements.id.value === 'ad-0005-02', 'suggested id');
  assert.equal(form.elements.size.value, 'L');
  form.elements.note.value = 'kệ B';
  form.dispatchEvent(new window.Event('submit', {cancelable: true}));
  await until(() => window.location.hash === '#/inventory?product_id=ad-0005', 'redirect to list');
  const rows = await until(() => { const r = d.querySelectorAll('tr[data-item]'); return r.length === 2 ? r : null; }, 'two rows');
  assert.deepEqual([...rows].map(r => r.dataset.item), ['ad-0005-01', 'ad-0005-02']);
  assert.equal(text(rows[1].querySelector('.product-cell b')), 'Sản phẩm năm');
  assert.equal(rows[1].querySelector('img.thumb').getAttribute('src'), '/catalog/a/1.thumb.webp');
  assert.equal(rows[1].querySelector('[data-field=note]').value, 'kệ B');
  const status = rows[1].querySelector('[data-field=status]');
  status.value = 'maintenance'; status.dispatchEvent(new window.Event('change', {bubbles: true}));
  await until(() => !status.disabled, 'patch done');
  assert.equal((await api('GET', '/api/admin/inventory/ad-0005-02')).data.item.status, 'maintenance');
  // Deleting an unused item removes its row; the filter navigates through the hash.
  await until(() => d.querySelector('[data-item="ad-0005-02"] [data-field=status]')?.value === 'maintenance', 'refreshed status');
  d.querySelector('[data-item="ad-0005-02"] [data-delete]').click();
  await until(() => d.querySelectorAll('tr[data-item]').length === 1, 'row removed');
  assert.equal((await api('GET', '/api/admin/inventory/ad-0005-02')).status, 404);
  await go('#/inventory?status=inactive');
  await until(() => d.querySelector('.empty'), 'empty filtered list');
});

test('a booking is created from the form with the free item auto-picked, then walked through its statuses', async t => {
  const {window, document: d, api, go} = await setup(t, {hash: '#/reservations/new'});
  await api('POST', '/api/admin/inventory', {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'});
  await api('POST', '/api/admin/inventory', {id: 'ad-0005-02', product_id: 'ad-0005', size: 'L'});
  await api('POST', '/api/admin/reservations', {customer_name: 'Mai', start_date: '2026-10-01', end_date: '2026-10-03', items: ['ad-0005-01']});
  const form = await until(() => d.getElementById('reservation-form'), 'reservation form');
  form.elements.customer_name.value = 'Linh'; form.elements.customer_phone.value = '0900000009'; form.elements.customer_facebook.value = 'fb.com/linh';
  form.elements.start_date.value = '2026-10-02'; form.elements.start_date.dispatchEvent(new window.Event('change'));
  form.elements.end_date.value = '2026-10-04'; form.elements.end_date.dispatchEvent(new window.Event('change'));
  const line = d.querySelector('.line');
  const productSelect = line.querySelector('[data-role=product]');
  productSelect.value = 'ad-0005'; productSelect.dispatchEvent(new window.Event('change'));
  const candidates = await until(() => { const c = line.querySelectorAll('.candidate'); return c.length === 2 ? c : null; }, 'candidates');
  // ad-0005-01 is Mai's for those dates; the label says so and it cannot be chosen.
  assert(candidates[0].classList.contains('taken'));
  assert(candidates[0].querySelector('input').disabled);
  assert.match(text(candidates[0]), /Mai/);
  assert.equal(text(candidates[1].querySelector('.who')), 'Trống');
  line.querySelector('[data-role=auto]').click();
  assert.equal(line.dataset.selected, 'ad-0005-02');
  form.dispatchEvent(new window.Event('submit', {cancelable: true}));
  await until(() => /^#\/reservations\/rsv-/.test(window.location.hash), 'redirect to detail');
  const id = decodeURIComponent(window.location.hash.slice('#/reservations/'.length));
  const {data} = await api('GET', `/api/admin/reservations/${id}`);
  assert.equal(data.reservation.customer_name, 'Linh');
  assert.deepEqual(data.reservation.items.map(i => i.inventory_item_id), ['ad-0005-02']);
  // Detail view: pending -> confirmed -> rented -> returned via the quick buttons.
  const actions = await until(() => d.getElementById('status-actions'), 'status actions');
  assert.equal(text(actions.querySelector('.pill')), 'Chờ xác nhận');
  // The view re-renders between clicks, so the pill may be missing for a moment.
  const pillText = () => text(d.querySelector('#status-actions .pill') || d.createElement('i'));
  actions.querySelector('[data-status=confirmed]').click();
  await until(() => pillText() === 'Đã xác nhận', 'confirmed');
  d.querySelector('#status-actions [data-status=rented]').click();
  await until(() => pillText() === 'Đã giao', 'rented');
  assert.equal((await api('GET', '/api/admin/inventory/ad-0005-02')).data.item.status, 'rented');
  d.querySelector('#status-actions [data-status=returned]').click();
  await until(() => pillText() === 'Đã trả', 'returned');
  assert.equal((await api('GET', '/api/admin/inventory/ad-0005-02')).data.item.status, 'available');
  // The list filters by status and shows both items' bookings, with the notification state.
  await go('#/reservations?status=returned');
  await until(() => d.querySelectorAll('.row-link').length === 1, 'filtered list');
  assert.match(text(d.querySelector('.row-link')), /Linh.*0900000009 · fb\.com\/linh.*ad-0005-02.*Đã trả.*Chưa gửi/);
  await go('#/reservations');
  await until(() => d.querySelectorAll('.row-link').length === 2, 'full list');
});

test('a clash on save is explained in the staff language and the form stays filled', async t => {
  const {window, document: d, api} = await setup(t, {hash: '#/reservations/new'});
  await api('POST', '/api/admin/inventory', {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'});
  const form = await until(() => d.getElementById('reservation-form'), 'reservation form');
  form.elements.customer_name.value = 'Linh';
  form.elements.start_date.value = '2026-10-01'; form.elements.end_date.value = '2026-10-03'; form.elements.end_date.dispatchEvent(new window.Event('change'));
  const line = d.querySelector('.line'), productSelect = line.querySelector('[data-role=product]');
  productSelect.value = 'ad-0005'; productSelect.dispatchEvent(new window.Event('change'));
  await until(() => line.querySelector('.candidate'), 'candidate');
  line.querySelector('[data-role=auto]').click();
  // Someone else books the same item between loading the candidates and pressing save.
  await api('POST', '/api/admin/reservations', {customer_name: 'Mai', start_date: '2026-10-03', end_date: '2026-10-05', items: ['ad-0005-01']});
  form.dispatchEvent(new window.Event('submit', {cancelable: true}));
  await until(() => text(d.getElementById('reservation-error')), 'error shown');
  assert.equal(text(d.getElementById('reservation-error')), 'Hàng này đã được đặt trong khoảng ngày đó.');
  assert.equal(form.elements.customer_name.value, 'Linh');
  await until(() => line.querySelector('.candidate.taken'), 'candidate refreshed as taken');
  // Submitting without an item is stopped before any request.
  line.dataset.selected = '';
  form.dispatchEvent(new window.Event('submit', {cancelable: true}));
  await wait(10);
  assert.equal(text(d.getElementById('reservation-error')), 'Mỗi dòng cần chọn một mã hàng.');
  assert.equal((await api('GET', '/api/admin/reservations')).data.reservations.length, 1);
});

test('an expired session sends the page to the login screen', async t => {
  const {window, redirects} = await setup(t);
  window.fetch = async path => path === '/catalog.json' ? Response.json(catalog) : path === '/store.json' ? Response.json(store) : new Response('{"error":"unauthorized"}', {status: 401});
  window.location.hash = '#/inventory';
  await until(() => redirects.length, 'login redirect');
});

test('a public request shows in the bell and the dashboard, is confirmed with an item, then notified via the panel', async t => {
  const {window, document: d, api, go} = await setup(t, {hash: '#/inventory'});
  await api('POST', '/api/admin/inventory', {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'});
  const day = n => { const date = new Date(); date.setUTCDate(date.getUTCDate() + n); return date.toISOString().slice(0, 10); };
  const created = await api('POST', '/api/reservation-requests', {product_id: 'ad-0005', size: 'L', customer_name: 'Nguyễn Mai', customer_phone: '0901234567', preferred_contact_channel: 'zalo', start_date: day(3), end_date: day(5), privacy_consent: true});
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const id = created.data.request.id;
  // Dashboard: the request is a "new request" and the bell counts it.
  await go('#/');
  await until(() => d.querySelector('.stat.attention'), 'attention stat');
  assert.equal(text(d.querySelector('.stat.attention b')), '1');
  await until(() => !d.getElementById('bell-count').hidden, 'bell badge');
  assert.equal(text(d.getElementById('bell-count')), '1');
  d.getElementById('bell').click();
  const alert = await until(() => d.querySelector('#notification-panel .alert'), 'alert entry');
  assert.match(text(alert), /Nguyễn Mai.*Zalo.*Sản phẩm năm \(L\)/);
  assert.equal(alert.getAttribute('href'), `#/reservations/${id}`);
  alert.click();
  await until(() => d.getElementById('notification-panel').hidden, 'panel closed');
  // Detail: request card, no item yet, confirm assigns one.
  await go(`#/reservations/${id}`);
  const actions = await until(() => d.getElementById('status-actions'), 'status actions');
  assert(d.querySelector('.request-card'));
  assert.match(text(d.querySelector('.request-card')), /Sản phẩm năm.*Cỡ: L/);
  assert.equal(text(actions.querySelector('[data-status=confirmed]')), 'Xác nhận đặt chỗ');
  assert(d.querySelector('.hint'), 'pending hint in the notification panel');
  actions.querySelector('[data-status=confirmed]').click();
  await until(() => text(d.querySelector('#status-actions .pill') || d.createElement('i')) === 'Đã xác nhận', 'confirmed');
  assert.deepEqual((await api('GET', `/api/admin/reservations/${id}`)).data.reservation.items.map(i => i.inventory_item_id), ['ad-0005-01']);
  // Notification panel: Zalo is the preferred (primary) row, WhatsApp opens wa.me with the text, Messenger opens the page.
  const notify = await until(() => d.querySelector('.notify .channels'), 'channels');
  // The public form's consent is shown with its time; Zalo was "same as phone".
  assert.equal(text(d.querySelector('.contact-block .consent-ok')), '✓ Đã đồng ý');
  assert.match(text(d.querySelector('.contact-block')), /Zalo0901234567 · Giống số điện thoại.*Thời điểm đồng ý[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}/);
  assert.equal(text(d.querySelector('.channel-row.preferred .channel-label')), 'Zalo Ưu tiên');
  assert(d.querySelector('.channel-row.preferred [data-copy=zalo]').classList.contains('primary'));
  // Only the channel the customer asked for is open; the others are folded away, still one click from reach.
  assert.deepEqual([...notify.children].filter(el => el.classList.contains('channel-row')).map(el => text(el.querySelector('.channel-label'))), ['Zalo Ưu tiên', 'Sao chép tin nhắn']);
  const folded = notify.querySelector('.more-channels');
  assert.equal(text(folded.querySelector('summary')), 'Cách liên hệ khác (3)');
  assert.deepEqual([...folded.querySelectorAll('.channel-label')].map(text), ['WhatsApp', 'Messenger', 'Điện thoại']);
  const wa = notify.querySelector('[data-wa]');
  assert.equal(wa.getAttribute('target'), '_blank');
  assert.equal(wa.getAttribute('rel'), 'noopener noreferrer');
  assert.match(wa.getAttribute('href'), /^https:\/\/wa\.me\/84901234567\?text=Xin%20ch%C3%A0o%20Nguy/);
  assert.equal(notify.querySelector('[data-channel=messenger]').getAttribute('href'), 'https://m.me/teststore');
  assert.match(d.getElementById('notify-message').value, /^Xin chào Nguyễn Mai 🌸/);
  // Switching the language rewrites the preview and the WhatsApp link.
  const langSelect = d.getElementById('notify-lang'); langSelect.value = 'en'; langSelect.dispatchEvent(new window.Event('change'));
  assert.match(d.getElementById('notify-message').value, /^Hello Nguyễn Mai 🌸/);
  assert.match(wa.getAttribute('href'), /text=Hello%20/);
  // Copying the Zalo number suggests "zalo" as the channel and shows the toast.
  const copied = [];
  Object.defineProperty(window.navigator, 'clipboard', {configurable: true, value: {writeText: async value => { copied.push(value); }}});
  d.querySelector('[data-copy=zalo]').click();
  await until(() => copied.length === 1, 'copied');
  assert.equal(copied[0], '0901234567');
  await until(() => d.getElementById('toast').classList.contains('show') && text(d.getElementById('toast')) === 'Đã sao chép', 'toast');
  const markForm = d.getElementById('mark-sent');
  assert.equal(markForm.elements.channel.value, 'zalo');
  d.querySelector('[data-copy=message]').click();
  await until(() => copied.length === 2, 'message copied');
  assert.match(copied[1], /^Hello Nguyễn Mai/);
  markForm.elements.channel.value = 'zalo';
  markForm.elements.note.value = 'Zalo shop';
  markForm.dispatchEvent(new window.Event('submit', {cancelable: true}));
  await until(() => d.querySelector('.notify [data-notify=not_sent]'), 'sent state');
  assert.match(text(d.querySelector('.notification-state')), /Zalo ✓.*Kênh: Zalo.*Gửi lúc: \d{4}-\d{2}-\d{2} \d{2}:\d{2}.*Zalo shop/);
  const saved = (await api('GET', `/api/admin/reservations/${id}`)).data.reservation;
  assert.equal(saved.notification_status, 'sent');
  assert.equal(saved.notification_channel, 'zalo');
  // The list shows the sent state and filters on it; the bell is quiet again.
  await go('#/reservations?notification=sent');
  await until(() => d.querySelectorAll('.row-link').length === 1, 'sent list');
  assert.match(text(d.querySelector('.row-link')), /Website.*Nguyễn Mai.*Zalo.*Zalo ✓/);
  await go('#/reservations?notification=not_sent');
  await until(() => d.querySelector('.empty'), 'nothing unsent');
  await until(() => d.getElementById('bell-count').hidden, 'bell quiet');
  // Back to not sent.
  await go(`#/reservations/${id}`);
  (await until(() => d.querySelector('.notify [data-notify=not_sent]'), 'reset button')).click();
  await until(() => d.querySelector('.notify [data-notify=sent]'), 'not sent again');
});

test('the booking form saves the contact preferences and can copy the phone into the WhatsApp / Zalo fields', async t => {
  const {window, document: d, api} = await setup(t, {hash: '#/reservations/new'});
  await api('POST', '/api/admin/inventory', {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'});
  const form = await until(() => d.getElementById('reservation-form'), 'reservation form');
  form.elements.customer_name.value = 'Linh'; form.elements.customer_phone.value = '0900000009';
  form.querySelector('[data-use-phone=customer_whatsapp]').click();
  form.querySelector('[data-use-phone=customer_zalo_phone]').click();
  assert.equal(form.elements.customer_whatsapp.value, '0900000009');
  assert.equal(form.elements.customer_zalo_phone.value, '0900000009');
  form.elements.customer_messenger_url.value = 'm.me/linh';
  form.querySelector('input[name=preferred_contact_channel][value=whatsapp]').checked = true;
  form.elements.start_date.value = '2026-10-02'; form.elements.end_date.value = '2026-10-04'; form.elements.end_date.dispatchEvent(new window.Event('change'));
  const line = d.querySelector('.line'), productSelect = line.querySelector('[data-role=product]');
  productSelect.value = 'ad-0005'; productSelect.dispatchEvent(new window.Event('change'));
  await until(() => line.querySelector('.candidate'), 'candidate');
  line.querySelector('[data-role=auto]').click();
  form.dispatchEvent(new window.Event('submit', {cancelable: true}));
  await until(() => /^#\/reservations\/rsv-/.test(window.location.hash), 'redirect to detail');
  const id = decodeURIComponent(window.location.hash.slice('#/reservations/'.length));
  const r = (await api('GET', `/api/admin/reservations/${id}`)).data.reservation;
  assert.equal(r.preferred_contact_channel, 'whatsapp');
  assert.equal(r.customer_whatsapp, '0900000009');
  assert.equal(r.customer_zalo_phone, '0900000009');
  assert.equal(r.customer_messenger_url, 'https://m.me/linh');
  await until(() => d.querySelector('.notify'), 'notification panel');
  assert.equal(text(d.querySelector('.channel-row.preferred .channel-label')), 'WhatsApp Ưu tiên');
  assert.equal(d.querySelector('[data-channel=messenger]').getAttribute('href'), 'https://m.me/linh');
  assert.deepEqual([...d.querySelectorAll('.contact-block .contact-line')].map(el => [text(el.querySelector('span')), text(el.querySelector('b'))]), [['Kênh liên hệ ưu tiên', 'WhatsApp'], ['Điện thoại', '0900000009'], ['WhatsApp', '0900000009 · Giống số điện thoại'], ['Messenger', 'm.me/linh'], ['Zalo', '0900000009 · Giống số điện thoại'], ['Đồng ý bảo mật', 'Chưa ghi nhận (tạo tại cửa hàng)']]);
});

test('a staff order takes several products, each with its own options and quantity', async t => {
  const {document: d, window, api, go} = await setup(t, {hash: '#/orders/new', products: saleCatalog});
  const form = await until(() => d.getElementById('order-form'), 'order form');
  const lines = d.getElementById('order-lines');
  // One line to start with, no way to remove the last one.
  assert.equal(lines.querySelectorAll('.order-line').length, 1);
  assert.equal(lines.querySelector('[data-remove-line]'), null);
  const pick = (index, id) => { const el = lines.querySelector(`[data-line-product="${index}"]`); el.value = id; el.dispatchEvent(new window.Event('change', {bubbles: true})); };
  pick(0, 'pho-1');
  // Choosing the product reveals its own options and add-ons; a second line is independent of the first.
  const large = lines.querySelector('[data-option="size"][data-line="0"]');
  large.value = 'large'; large.dispatchEvent(new window.Event('change', {bubbles: true}));
  const quay = lines.querySelector('[data-addon="quay"][data-line="0"]');
  quay.checked = true; quay.dispatchEvent(new window.Event('change', {bubbles: true}));
  d.getElementById('add-line').click();
  pick(1, 'tra-1');
  assert.equal(lines.querySelectorAll('[data-line-row="1"] [data-option]').length, 0, 'the drink has no options of its own');
  const quantity = lines.querySelector('[data-line-quantity="1"]');
  quantity.value = '2'; quantity.dispatchEvent(new window.Event('change', {bubbles: true}));
  form.elements.customer_name.value = 'Nguyễn Mai';
  form.elements.fulfillment_date.value = form.elements.fulfillment_date.value || '2026-01-01';
  form.dispatchEvent(new window.Event('submit', {bubbles: true, cancelable: true}));
  await until(() => window.location.hash.startsWith('#/orders/ord-') || d.getElementById('order-error')?.textContent, 'redirect to the new order');
  assert.match(window.location.hash, /^#\/orders\/ord-/, d.getElementById('order-error')?.textContent || 'the form neither sent nor reported an error');
  const id = decodeURIComponent(window.location.hash.slice('#/orders/'.length));
  const {data} = await api('GET', `/api/admin/orders/${id}`);
  assert.deepEqual(data.order.items.map(i => [i.product_id, i.quantity, i.options.size ?? null, i.addons]), [['pho-1', 1, 'large', ['quay']], ['tra-1', 2, null, []]]);
  // 40,000 + 10,000 (large) + 10,000 (quẩy) + 2 × 15,000
  assert.equal(data.order.total, 90000);
  // A line can be taken back out again before sending.
  await go('#/orders/new');
  const again = await until(() => d.getElementById('order-lines'), 'form again');
  d.getElementById('add-line').click();
  assert.equal(again.querySelectorAll('.order-line').length, 2);
  again.querySelector('[data-remove-line="1"]').click();
  assert.equal(again.querySelectorAll('.order-line').length, 1);
});
test('the admin opens in English when the store says so; the settings page explains that push is not configured', async t => {
  const {document: d, go} = await setup(t, {storeConfig: {...store, admin: {defaultLanguage: 'en'}}});
  await until(() => d.querySelector('.stat'), 'dashboard stats');
  assert.equal(text(d.querySelector('[data-route=inventory]')), 'Inventory');
  assert.equal(d.documentElement.lang, 'en');
  await go('#/settings');
  await until(() => d.querySelector('.hint'), 'settings hint');
  assert.match(text(d.querySelector('.hint')), /Web Push is not configured/);
  assert.match(text(d.querySelector('.contact-block')), /Store nameTest StoreLanguagesvi, en, ja/);
  assert.equal(d.querySelector('#push-toggle'), null);
});

test('with VAPID keys the settings page shows the subscribed devices; jsdom cannot subscribe itself', async t => {
  const pair = await crypto.subtle.generateKey({name: 'ECDSA', namedCurve: 'P-256'}, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const vapid = {VAPID_PUBLIC_KEY: Buffer.from(await crypto.subtle.exportKey('raw', pair.publicKey)).toString('base64url'), VAPID_PRIVATE_KEY: jwk.d, VAPID_SUBJECT: 'mailto:admin@example.com'};
  const {document: d, api, go} = await setup(t, {hash: '#/inventory', storeConfig: {...store, admin: {defaultLanguage: 'en'}}, extraEnv: vapid});
  await api('POST', '/api/admin/push/subscriptions', {endpoint: 'https://push.example/other', keys: {p256dh: 'A'.repeat(87), auth: 'B'.repeat(22)}, label: 'Other phone'});
  await go('#/settings');
  const devices = await until(() => d.querySelector('.card table'), 'device table');
  assert.match(text(devices), /Other phone/);
  // No PushManager in jsdom: the page explains the browser cannot subscribe instead of offering the button.
  assert.match(text(d.querySelector('.hint')), /does not support Web Push/);
  assert.equal(d.querySelector('#push-toggle'), null);
  devices.querySelector('[data-remove]').click();
  await until(() => !d.querySelector('.card table'), 'device removed');
  assert.equal((await api('GET', '/api/admin/push/subscriptions')).data.subscriptions.length, 0);
});


test('inventory overview separates today, future bookings, overdue rentals and unassigned requests', async t => {
 const {api,env,go,document:d,window}=await setup(t);
 const {data:{today}}=await api('GET','/api/admin/inventory?overview=1');
 const day=n=>shiftDate(today,n);
 for(let n=1;n<=5;n++) await api('POST','/api/admin/inventory',{id:'ad-0005-0'+n,product_id:'ad-0005',size:'L'});
 await api('PATCH','/api/admin/inventory/ad-0005-04',{status:'maintenance'});
 const reserve=async(id,start,end,status)=>{
   const result=await api('POST','/api/admin/reservations',{customer_name:'Guest '+id,start_date:start,end_date:end,status,items:[id]});
   assert.equal(result.status,201,JSON.stringify(result.data));return result.data.reservation;
 };
 const current=await reserve('ad-0005-01',today,day(1),'confirmed');
 const next=await reserve('ad-0005-02',day(3),day(4),'confirmed');
 const overdue=await reserve('ad-0005-03',day(-3),day(-1),'rented');
 await reserve('ad-0005-05',today,day(1),'cancelled');
 await env.DB.prepare("INSERT INTO reservations (id,customer_name,start_date,end_date,status,source,request_product_id,request_size) VALUES ('unassigned-test','Awaiting assignment',?,?,'pending','public','ad-0005','L')").bind(today,day(1)).run();
 const result=await api('GET','/api/admin/inventory?overview=1');
 assert.deepEqual(result.data.summary,{total:5,available:2,booked:2,rented:1,maintenance:1});
 assert.equal(result.data.items[0].current_reservations[0].id,current.id);
 assert.equal(result.data.items[1].next_reservation.id,next.id);
 assert.equal(result.data.items[1].available_today,true);
 assert.equal(result.data.items[2].current_reservations[0].id,overdue.id);
 assert.equal(result.data.items[4].current_reservations.length,0);
 assert.equal(result.data.requests.length,1);
 assert.equal((await api('GET','/api/admin/inventory?overview=1&status=maintenance')).data.summary.total,1);
 assert.equal((await api('GET','/api/admin/inventory?overview=1&product_id=ad-0002')).data.requests.length,0);
 const anonymous=await worker.fetch(new Request(ORIGIN+'/api/admin/inventory?overview=1'),env);
 assert.equal(anonymous.status,401);
 await go('#/inventory');
 await until(()=>d.querySelectorAll('tr[data-item]').length===5,'inventory overview rows');
 assert.equal(d.querySelector('[data-stock=availableToday] b').textContent,'2');
 assert.equal(d.querySelector('[data-item="ad-0005-01"] .inventory-current a').hash,'#/reservations/'+current.id);
 assert.equal(d.querySelector('[data-item="ad-0005-02"] .inventory-next a').hash,'#/reservations/'+next.id);
 assert.match(d.querySelector('[data-item="ad-0005-03"] .inventory-current').textContent,/Quá hạn trả/);
 assert.match(d.getElementById('inventory-requests').textContent,/Awaiting assignment/);
 const language=d.getElementById('admin-lang');language.value='ja';language.dispatchEvent(new window.Event('change'));
 await until(()=>d.getElementById('inventory-overview')?.textContent.includes('今日の在庫状況'),'Japanese overview');
 await until(()=>d.querySelector('[data-item="ad-0005-03"] .inventory-current'),'translated rows');
 assert.match(d.querySelector('[data-item="ad-0005-03"] .inventory-current').textContent,/返却期限超過/);
 await api('PATCH','/api/admin/reservations/'+current.id,{status:'cancelled'});
 d.getElementById('refresh-stock').click();
 await until(()=>d.querySelector('[data-stock=availableToday] b')?.textContent==='3','refreshed cancellation');
});

test('inventory overview respects reservation buffer days without claiming a future booking is available today', async t => {
 const {api}=await setup(t,{extraEnv:{RESERVATION_BUFFER_DAYS:'2'}});
 const {data:{today}}=await api('GET','/api/admin/inventory?overview=1');
 await api('POST','/api/admin/inventory',{id:'ad-0005-01',product_id:'ad-0005',size:'L'});
 const booking=await api('POST','/api/admin/reservations',{customer_name:'Buffer booking',start_date:shiftDate(today,2),end_date:shiftDate(today,3),status:'confirmed',items:['ad-0005-01']});
 assert.equal(booking.status,201);
 const {data}=await api('GET','/api/admin/inventory?overview=1');
 assert.equal(data.buffer,2);assert.equal(data.summary.available,0);assert.equal(data.summary.booked,1);
 assert.equal(data.items[0].current_reservations[0].id,booking.data.reservation.id);
});

// The availability view answers a different question from the booking list: not who booked what,
// but what each garment is doing and when the next one comes free.
// A rental collected on day 1 at 19:00 for one day, due back on day 2 at 19:00 and washed overnight.
async function timedRental(env, {id = 'rsv-timed', item = 'ad-0005-01', customer = 'Lan', start, status = 'confirmed'}) {
  await env.DB.prepare(`INSERT INTO reservations (id, customer_name, start_date, end_date, status, start_time, rental_days, start_at, ready_at, note)
    VALUES (?, ?, ?, ?, ?, '19:00', 1, ?, ?, 'Hem sửa')`).bind(id, customer, start, shiftDate(start, 1), status, `${start}T19:00`, `${shiftDate(start, 2)}T07:00`).run();
  await env.DB.prepare('INSERT INTO reservation_items (reservation_id, inventory_item_id, product_id) VALUES (?, ?, ?)').bind(id, item, 'ad-0005').run();
}

test('each garment in the list shows its week; a day tells who holds it, and a free day books the item', async t => {
  const {document: d, api, go, env} = await setup(t);
  await api('POST', '/api/admin/inventory', {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'});
  await api('POST', '/api/admin/inventory', {id: 'ad-0005-02', product_id: 'ad-0005', size: 'L'});
  const {data: {today}} = await api('GET', '/api/admin/inventory/timeline?days=1');
  await timedRental(env, {start: shiftDate(today, 1)});
  await go('#/inventory');
  await until(() => d.querySelectorAll('tr[data-item="ad-0005-01"] .tl-day').length === 7, 'week strip');
  const row = d.querySelector('tr[data-item="ad-0005-01"]');
  // The day it comes back: booked until 19:00, then in care -- said in words, not only in colour.
  const back = row.querySelector(`[data-tl-day="${shiftDate(today, 2)}"]`);
  assert.match(back.getAttribute('aria-label'), /Đã đặt từ 00:00 đến 19:00; Đang giặt ủi từ 19:00 đến 24:00/);
  assert.ok(back.classList.contains('s-reserved'));
  assert.equal(back.querySelectorAll('.tl-bar i').length, 2, 'both pieces are drawn');
  assert.equal(back.querySelector('.tl-bar i.k-cleaning').style.left, '79.17%', 'placed through the CSSOM at 19:00');
  // The next morning it is ready at 07:00 and free for the rest of the day.
  const ready = row.querySelector(`[data-tl-day="${shiftDate(today, 3)}"]`);
  assert.ok(ready.classList.contains('part-free'));
  assert.match(ready.getAttribute('aria-label'), /Trống từ 07:00 đến 24:00/);
  // The product line counts what is free each day.
  const counts = [...d.querySelectorAll('.tl-products .tl-count')];
  assert.equal(counts.length, 7);
  assert.equal(counts[2].querySelector('b').textContent, '1', 'one of two is free all day');
  assert.match(counts[3].textContent, /\+1/, 'the other is free from the morning');
  // Tapping the day opens who holds it and when it is ready again.
  back.click();
  const sheet = await until(() => { const el = d.getElementById('tl-sheet'); return el && !el.hidden && el; }, 'sheet');
  assert.match(text(sheet), /Lan/);
  assert.match(text(sheet), /Hạn trả/);
  assert.match(text(sheet), /Hem sửa/);
  assert.ok(sheet.querySelector('a[href="#/reservations/rsv-timed"]'));
  assert.equal(d.activeElement, sheet.querySelector('h2'), 'focus moves into the sheet');
  d.dispatchEvent(new d.defaultView.KeyboardEvent('keydown', {key: 'Escape'}));
  assert.equal(sheet.hidden, true);
  assert.equal(d.activeElement, back, 'and back to the day on Escape');
  // A free day offers to book this very item on that day.
  row.querySelector(`[data-tl-day="${shiftDate(today, 5)}"]`).click();
  const book = await until(() => d.querySelector('#tl-sheet:not([hidden]) a.primary'), 'book link');
  assert.match(book.getAttribute('href'), new RegExp(`item=ad-0005-01&start=${shiftDate(today, 5)}`));
  // On a phone the card keeps the extras folded away until asked for.
  const toggle = row.querySelector('[data-toggle-row]');
  toggle.click();
  assert.ok(row.classList.contains('open'));
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  // Following the link opens the booking form with that item and date already chosen.
  await go(book.getAttribute('href'));
  await until(() => d.querySelector('#reservation-form input[value="ad-0005-01"]'), 'candidate list');
  assert.equal(d.querySelector('#reservation-form [name=start_date]').value, shiftDate(today, 5));
  assert.equal(d.querySelector('#reservation-form input[value="ad-0005-01"]').checked, true);
  assert.equal(d.getElementById('tl-sheet').hidden, true, 'navigating closes the sheet');
});

test('the schedule draws each product group once, in 7, 14 or 30 days, with the same schedule as a list', async t => {
  const {document: d, api, go, window, env} = await setup(t);
  await api('POST', '/api/admin/inventory', {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'});
  await api('POST', '/api/admin/inventory', {id: 'ad-0005-02', product_id: 'ad-0005', size: 'L'});
  await api('PATCH', '/api/admin/inventory/ad-0005-02', {status: 'cleaning'});
  const {data: {today}} = await api('GET', '/api/admin/inventory/timeline?days=1');
  await timedRental(env, {start: shiftDate(today, 2), customer: 'Mai'});
  // A stand-in for ECharts: jsdom cannot draw on a canvas, but the page's use of it can be checked.
  const charts = [];
  window.echarts = {
    graphic: {clipRectByRect: rect => rect},
    init: element => { const chart = {element, options: null, handlers: {}, disposed: false, setOption(options) { this.options = options; }, resize() {}, on(name, fn) { this.handlers[name] = fn; }, off() {}, dispose() { this.disposed = true; }}; charts.push(chart); return chart; }
  };
  await go('#/inventory/schedule');
  const group = await until(() => d.querySelector('.availability-group'), 'availability');
  assert.match(text(group.querySelector('h2')), /Sản phẩm năm/);
  const counts = [...group.querySelectorAll('.state-counts li')].map(li => text(li));
  assert.ok(counts.some(entry => /Trống.*1/.test(entry)), 'one garment is free');
  assert.ok(counts.some(entry => /Đang giặt ủi.*1/.test(entry)), 'one is in care');
  assert.match(text(group.querySelector('.next-free')), /Sắp trống/);
  assert.ok(d.querySelector('.tl-range [aria-current]').textContent.includes('7'));
  // One chart for the product group, not one per garment; a tap on a bar opens the same details.
  await until(() => charts[0]?.options, 'chart drawn');
  assert.equal(charts.length, 1);
  const series = charts[0].options.series[0];
  const bar = series.data.find(datum => datum.kind === 'reserved');
  assert.equal(bar.label, 'Mai');
  charts[0].handlers.click({value: bar.value});
  const sheet = await until(() => { const el = d.getElementById('tl-sheet'); return el && !el.hidden && el; }, 'sheet');
  assert.match(text(sheet), /Mai/);
  assert.match(text(sheet), /Sẵn sàng lại/);
  // The same schedule, in words, for anyone who cannot use the chart.
  const rows = [...group.querySelectorAll('.tl-list .tl-row')].map(row => text(row));
  assert.ok(rows.some(row => /Đã đặt từ .* đến .*Mai/.test(row)), rows.join(' | '));
  assert.ok(rows.some(row => /Đang giặt ủi từ/.test(row)));
  // 30 days are summarised a day at a time, without a chart.
  await go('#/inventory/schedule?days=30');
  await until(() => d.querySelectorAll('.tl-month .tl-day').length === 60, '30 days × 2 garments');
  assert.equal(d.querySelector('.gantt-chart'), null);
  assert.ok(charts[0].disposed, 'the chart is let go when the view changes');
  // Choosing one garment narrows the view to it, and the choice stays offered.
  await go('#/inventory/schedule?product_id=ad-0005&item_id=ad-0005-02&days=14');
  await until(() => d.querySelectorAll('.availability-group .tl-list-item').length === 1, 'one garment');
  assert.deepEqual([...d.querySelectorAll('[name=item_id] option')].map(o => o.value), ['', 'ad-0005-01', 'ad-0005-02']);
  assert.equal(d.querySelector('[name=item_id]').value, 'ad-0005-02');
});


// A day off has to reach customers without a rebuild, so it is set here and read by the timeline.
test('the handover diary saves a day with its own hours, closes another, and removes one again', async t => {
  const {window, document: d, api, go} = await setup(t);
  await go('#/inventory/handoff');
  await until(() => d.getElementById('handoff-form'), 'handover form');
  assert.equal(d.querySelectorAll('.weekly-hours li').length, 7, 'the ordinary week, Monday first');
  const form = d.getElementById('handoff-form');
  const dayOff = shiftDate(new Date().toISOString().slice(0, 10), 3);
  form.elements.date.value = dayOff;
  form.elements.note.value = 'Nghỉ phép';
  d.querySelector('.win-start').value = '09:00';
  d.querySelector('.win-end').value = '21:00';
  form.dispatchEvent(new window.Event('submit', {bubbles: true, cancelable: true}));
  await until(() => d.querySelector('[data-drop-date]'), 'the saved day');
  assert.match(text(d.getElementById('handoff-list')), /09:00–21:00/);
  assert.match(text(d.getElementById('handoff-list')), /Nghỉ phép/);
  // The Worker has it, which is what the customer timeline reads.
  const saved = await api('GET', '/api/admin/handoff-exceptions');
  assert.equal(saved.data.exceptions.length, 1);
  assert.deepEqual(saved.data.exceptions[0].windows, [{start: '09:00', end: '21:00'}]);

  // Away all day: the window rows go away and nothing is sent for them.
  const closedDay = shiftDate(dayOff, 1);
  const live = d.getElementById('handoff-form');
  live.elements.date.value = closedDay;
  live.elements.closed.checked = true;
  live.elements.closed.dispatchEvent(new window.Event('change'));
  await until(() => d.getElementById('window-rows').hidden, 'the window rows step aside');
  live.dispatchEvent(new window.Event('submit', {bubbles: true, cancelable: true}));
  await until(() => d.querySelectorAll('[data-drop-date]').length === 2, 'both days');
  assert.match(text(d.getElementById('handoff-list')), /Nghỉ cả ngày/);
  assert.equal((await api('GET', '/api/admin/handoff-exceptions')).data.exceptions.find(e => e.date === closedDay).closed, true);

  d.querySelector(`[data-drop-date="${closedDay}"]`).click();
  await until(() => d.querySelectorAll('[data-drop-date]').length === 1, 'one day left');
  assert.equal((await api('GET', '/api/admin/handoff-exceptions')).data.exceptions.length, 1);
});

test('adjacent fitting bookings keep their assigned item when staff edit a note', async t => {
  const {window, document: d, env, go, api} = await setup(t, {storeConfig: {...store, booking: {fitting: {enabled: true, minutes: 30}}}});
  await api('POST', '/api/admin/inventory', {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'});
  for (const [id, start, end] of [['first', '19:00', '19:30'], ['second', '19:30', '20:00']]) {
    await env.DB.prepare("INSERT INTO reservations (id, customer_name, start_date, end_date, status, start_time, purpose, start_at, ready_at) VALUES (?, 'Mai', '2026-10-20', '2026-10-20', 'confirmed', ?, 'fitting', ?, ?)").bind(id, start, '2026-10-20T' + start, '2026-10-20T' + end).run();
    await env.DB.prepare("INSERT INTO reservation_items (reservation_id, inventory_item_id, product_id) VALUES (?, 'ad-0005-01', 'ad-0005')").bind(id).run();
  }
  await go('#/reservations/second');
  await until(() => d.querySelector('.candidate input:checked'), 'assigned fitting item');
  assert.equal(d.querySelector('.candidate input:checked').disabled, false);
  const form = d.getElementById('reservation-form');
  form.elements.note.value = 'Updated fitting note';
  form.dispatchEvent(new window.Event('submit', {bubbles: true, cancelable: true}));
  await until(() => !form.querySelector('[type=submit]').disabled, 'saved note');
  assert.equal((await api('GET', '/api/admin/reservations/second')).data.reservation.note, 'Updated fitting note');
});
