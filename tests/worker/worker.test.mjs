import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync, createSign} from 'node:crypto';
import worker from '../../worker/index.mjs';
import {resetCatalogCache} from '../../worker/catalog.mjs';
import {resetStoreCache} from '../../worker/store.mjs';
import {resetAccessCache} from '../../worker/auth.mjs';
import {migratedDatabase} from '../d1-shim.mjs';

const catalog = [
  {id: 'ad-0001', name: {vi: 'Sản phẩm một'}, category: 'rental', available: true, inventory: {managed: true}, images: [], videos: []},
  {id: 'ad-0005', name: {vi: 'Sản phẩm năm'}, category: 'rental', sizes: ['L'], inventory: {managed: true}, images: [], videos: []},
  {id: 'km-0001', name: {vi: 'Phụ kiện'}, category: 'accessories', available: false, images: [], videos: []}
];
const ORIGIN = 'https://store.test';

async function harness({env: overrides = {}, signIn = true} = {}) {
  resetCatalogCache();resetStoreCache();
  const env = {
    DB: await migratedDatabase(),
    ASSETS: {fetch: async request => {
      const url = new URL(request.url);
      if (url.pathname === '/catalog.json') return Response.json(catalog);
      return new Response(`asset:${url.pathname}`, {status: 200, headers: {'content-type': url.pathname.endsWith('.js') ? 'text/javascript' : 'text/html'}});
    }},
    ADMIN_PASSWORD: 'correct horse battery staple',
    RESERVATION_BUFFER_DAYS: '0',
    STORE_TIMEZONE: 'Asia/Ho_Chi_Minh',
    ...overrides
  };
  const request = (method, path, {body, headers = {}, cookie} = {}) => {
    const init = {method, headers: {...headers}};
    if (cookie) init.headers.cookie = cookie;
    if (body !== undefined) { init.body = typeof body === 'string' ? body : JSON.stringify(body); init.headers['content-type'] ??= 'application/json'; }
    return worker.fetch(new Request(ORIGIN + path, init), env);
  };
  const call = async (method, path, options) => {
    const response = await request(method, path, options);
    const text = await response.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = text; }
    return {status: response.status, data, headers: response.headers};
  };
  if (!signIn) return {env, call};
  const login = await request('POST', '/api/admin/login', {body: {password: env.ADMIN_PASSWORD}, headers: {'x-requested-with': 'fetch'}});
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const admin = (method, path, options = {}) => call(method, path, {...options, cookie, headers: {'x-requested-with': 'fetch', ...options.headers}});
  return {env, call, admin, cookie};
}
const addItem = (admin, id, product_id, extra = {}) => admin('POST', '/api/admin/inventory', {body: {id, product_id, size: 'L', ...extra}});
const booking = (items, start_date, end_date, extra = {}) => ({customer_name: 'Linh', customer_phone: '+84 900 000 009', customer_facebook: 'fb.com/linh', start_date, end_date, items, ...extra});

test('1-2. inventory items are added per product, several per product, only for catalog products with the product prefix', async () => {
  const {admin} = await harness();
  const first = await addItem(admin, 'ad-0005-01', 'ad-0005', {note: 'shelf A'});
  assert.equal(first.status, 201);
  assert.equal(first.data.item.status, 'available');
  assert.equal(first.data.item.note, 'shelf A');
  assert.equal((await addItem(admin, 'ad-0005-02', 'ad-0005')).status, 201);
  assert.equal((await addItem(admin, 'ad-0005-03', 'ad-0005')).status, 201);
  assert.equal((await addItem(admin, 'ad-0005-01', 'ad-0005')).status, 409);
  assert.equal((await addItem(admin, 'ad-9999-01', 'ad-9999')).status, 400);
  assert.equal((await addItem(admin, 'ad-0001-01', 'ad-0005')).status, 400);
  assert.equal((await addItem(admin, 'AD-0005-04', 'ad-0005')).status, 400);
  assert.equal((await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-04', product_id: 'ad-0005', status: 'broken'}})).status, 400);
  const list = await admin('GET', '/api/admin/inventory?product_id=ad-0005');
  assert.deepEqual(list.data.items.map(i => i.id), ['ad-0005-01', 'ad-0005-02', 'ad-0005-03']);
  const patched = await admin('PATCH', '/api/admin/inventory/ad-0005-03', {body: {status: 'maintenance', note: 'zip'}});
  assert.equal(patched.data.item.status, 'maintenance');
  assert.equal((await admin('PATCH', '/api/admin/inventory/ad-0005-03', {body: {}})).status, 400);
  assert.equal((await admin('DELETE', '/api/admin/inventory/ad-0005-03')).status, 200);
  assert.equal((await admin('GET', '/api/admin/inventory/ad-0005-03')).status, 404);
});

test('3-7. reservations: create, double booking rejected, cancelled frees, other period ok, maintenance refused', async () => {
  const {admin} = await harness();
  await addItem(admin, 'ad-0005-01', 'ad-0005');
  await addItem(admin, 'ad-0001-01', 'ad-0001', {status: 'maintenance'});
  const created = await admin('POST', '/api/admin/reservations', {body: booking(['ad-0005-01'], '2026-10-01', '2026-10-03')});
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const {reservation} = created.data;
  assert.match(reservation.id, /^rsv-\d{8}-[a-z0-9]{4}$/);
  assert.equal(reservation.status, 'pending');
  assert.deepEqual(reservation.items.map(i => i.inventory_item_id), ['ad-0005-01']);
  assert.equal(reservation.items[0].product_id, 'ad-0005');
  // 4. the same item for an overlapping period
  const clash = await admin('POST', '/api/admin/reservations', {body: booking(['ad-0005-01'], '2026-10-02', '2026-10-04')});
  assert.equal(clash.status, 409);
  assert.equal(clash.data.error, 'inventory_conflict');
  assert.equal(clash.data.conflicts[0].reservationId, reservation.id);
  // Touching boundaries clash too: dates are inclusive.
  assert.equal((await admin('POST', '/api/admin/reservations', {body: booking(['ad-0005-01'], '2026-10-03', '2026-10-05')})).status, 409);
  assert.equal((await admin('POST', '/api/admin/reservations', {body: booking(['ad-0005-01'], '2026-09-28', '2026-10-01')})).status, 409);
  // 6. a period that ends the day before is fine
  const other = await admin('POST', '/api/admin/reservations', {body: booking(['ad-0005-01'], '2026-10-04', '2026-10-06')});
  assert.equal(other.status, 201);
  // 7. maintenance items are never bookable
  const blocked = await admin('POST', '/api/admin/reservations', {body: booking(['ad-0001-01'], '2026-11-01', '2026-11-02')});
  assert.equal(blocked.status, 409);
  assert.equal(blocked.data.error, 'inventory_unavailable');
  // 5. cancelling releases the item for the original period
  const cancelled = await admin('DELETE', `/api/admin/reservations/${reservation.id}`);
  assert.equal(cancelled.data.reservation.status, 'cancelled');
  const again = await admin('POST', '/api/admin/reservations', {body: booking(['ad-0005-01'], '2026-10-02', '2026-10-03')});
  assert.equal(again.status, 201);
  // Bringing the cancelled booking back is now what clashes.
  const revive = await admin('PATCH', `/api/admin/reservations/${reservation.id}`, {body: {status: 'confirmed'}});
  assert.equal(revive.status, 409);
  assert.equal((await admin('GET', `/api/admin/reservations/${reservation.id}`)).data.reservation.status, 'cancelled');
});

test('validation: dates, order, unknown items, missing name, empty items', async () => {
  const {admin} = await harness();
  await addItem(admin, 'ad-0005-01', 'ad-0005');
  const post = body => admin('POST', '/api/admin/reservations', {body});
  assert.equal((await post(booking(['ad-0005-01'], '2026-02-30', '2026-03-01'))).status, 400);
  assert.equal((await post(booking(['ad-0005-01'], '2026-10-05', '2026-10-01'))).status, 400);
  assert.equal((await post(booking(['ad-0005-01'], '10/01/2026', '10/02/2026'))).status, 400);
  assert.equal((await post(booking(['ad-0005-09'], '2026-10-01', '2026-10-02'))).status, 400);
  assert.equal((await post(booking([], '2026-10-01', '2026-10-02'))).status, 400);
  assert.equal((await post(booking(['ad-0005-01'], '2026-10-01', '2026-10-02', {customer_name: '  '}))).status, 400);
  assert.equal((await post(booking(['ad-0005-01'], '2026-10-01', '2026-10-02', {customer_phone: 'call me'}))).status, 400);
  assert.equal((await post(booking(["ad-0005-01'; DROP TABLE reservations;--"], '2026-10-01', '2026-10-02'))).status, 400);
  assert.equal((await admin('POST', '/api/admin/reservations', {body: 'x', headers: {'content-type': 'text/plain'}})).status, 415);
  assert.equal((await admin('GET', '/api/admin/reservations?from=2026-13-01')).status, 400);
  assert.equal((await admin('GET', '/api/admin/reservations?status=lost')).status, 400);
  assert.equal((await admin('GET', '/api/products/ad-0005/inventory?from=2026-10-05&to=2026-10-01')).status, 400);
  assert.equal((await admin('GET', '/api/admin/reservations')).data.reservations.length, 0);
});

test('editing a reservation: status flow updates the physical item, date moves are re-checked', async () => {
  const {admin} = await harness();
  await addItem(admin, 'ad-0005-01', 'ad-0005');
  await addItem(admin, 'ad-0005-02', 'ad-0005');
  const a = (await admin('POST', '/api/admin/reservations', {body: booking(['ad-0005-01'], '2026-10-01', '2026-10-03', {status: 'confirmed'})})).data.reservation;
  const b = (await admin('POST', '/api/admin/reservations', {body: booking(['ad-0005-01', 'ad-0005-02'], '2026-10-10', '2026-10-12')})).data.reservation;
  assert.equal(b.items.length, 2);
  // Moving A onto B's dates clashes; moving it elsewhere works and keeps the original untouched on failure.
  assert.equal((await admin('PATCH', `/api/admin/reservations/${a.id}`, {body: {start_date: '2026-10-11', end_date: '2026-10-11'}})).status, 409);
  assert.equal((await admin('GET', `/api/admin/reservations/${a.id}`)).data.reservation.start_date, '2026-10-01');
  const moved = await admin('PATCH', `/api/admin/reservations/${a.id}`, {body: {start_date: '2026-10-05', end_date: '2026-10-06', note: 'moved'}});
  assert.equal(moved.status, 200);
  assert.equal(moved.data.reservation.note, 'moved');
  // Swapping B to the other item only frees ad-0005-01 for its dates.
  const swapped = await admin('PATCH', `/api/admin/reservations/${b.id}`, {body: {items: ['ad-0005-02']}});
  assert.deepEqual(swapped.data.reservation.items.map(i => i.inventory_item_id), ['ad-0005-02']);
  assert.equal((await admin('POST', '/api/admin/reservations', {body: booking(['ad-0005-01'], '2026-10-10', '2026-10-12')})).status, 201);
  // confirmed -> rented -> returned mirrors onto the item status.
  assert.equal((await admin('PATCH', `/api/admin/reservations/${a.id}`, {body: {status: 'rented'}})).data.reservation.status, 'rented');
  assert.equal((await admin('GET', '/api/admin/inventory/ad-0005-01')).data.item.status, 'rented');
  assert.equal((await admin('PATCH', `/api/admin/reservations/${a.id}`, {body: {status: 'returned'}})).data.reservation.status, 'returned');
  assert.equal((await admin('GET', '/api/admin/inventory/ad-0005-01')).data.item.status, 'available');
  // A item that went into maintenance while out can still be marked returned.
  await admin('PATCH', `/api/admin/reservations/${b.id}`, {body: {status: 'rented'}});
  await admin('PATCH', '/api/admin/inventory/ad-0005-02', {body: {status: 'maintenance'}});
  assert.equal((await admin('PATCH', `/api/admin/reservations/${b.id}`, {body: {status: 'returned'}})).status, 200);
  assert.equal((await admin('GET', '/api/admin/inventory/ad-0005-02')).data.item.status, 'maintenance');
  const filtered = await admin('GET', '/api/admin/reservations?status=returned&from=2026-10-01&to=2026-10-31&q=Linh');
  assert.equal(filtered.data.reservations.length, 2);
  assert.equal((await admin('GET', '/api/admin/reservations?q=nobody')).data.reservations.length, 0);
});

test('8-9. public availability now and for a period; unmanaged products fall back to the catalog', async () => {
  const {admin, call} = await harness();
  await addItem(admin, 'ad-0005-01', 'ad-0005');
  await addItem(admin, 'ad-0005-02', 'ad-0005');
  await addItem(admin, 'ad-0005-03', 'ad-0005', {status: 'inactive'});
  await addItem(admin, 'ad-0001-01', 'ad-0001');
  await admin('POST', '/api/admin/reservations', {body: booking(['ad-0005-01'], '2026-10-01', '2026-10-03', {status: 'confirmed'})});
  const now = await call('GET', '/api/products/ad-0005/availability');
  assert.equal(now.status, 200);
  assert.deepEqual(now.data, {productId: 'ad-0005', total: 2, available: 2, status: 'available', managed: true});
  assert.equal(now.data.from, undefined);
  const period = await call('GET', '/api/products/ad-0005/availability?from=2026-10-02&to=2026-10-04');
  assert.deepEqual(period.data, {productId: 'ad-0005', from: '2026-10-02', to: '2026-10-04', total: 2, available: 1, status: 'low', managed: true});
  await admin('POST', '/api/admin/reservations', {body: booking(['ad-0005-02'], '2026-10-02', '2026-10-02')});
  const full = await call('GET', '/api/products/ad-0005/availability?from=2026-10-02&to=2026-10-02');
  assert.equal(full.data.available, 0);
  assert.equal(full.data.status, 'rented');
  assert.equal((await call('GET', '/api/products/ad-0005/availability?from=2026-10-04&to=2026-10-04')).data.available, 2);
  // The whole catalog in one request, for the product grid.
  const all = await call('GET', '/api/availability?from=2026-10-02&to=2026-10-02');
  assert.equal(all.data.products['ad-0005'].status, 'rented');
  assert.equal(all.data.products['ad-0001'].status, 'available');
  assert.deepEqual(all.data.products['km-0001'], {productId: 'km-0001', total: 0, available: 0, status: 'unavailable', managed: false});
  assert.equal((await call('GET', '/api/products/nope/availability')).status, 404);
  assert.equal((await call('GET', '/api/products/ad-0005/availability?from=2026-10-05&to=2026-10-01')).status, 400);
  assert.equal((await call('GET', '/api/products/ad-0005/availability?from=next-week')).status, 400);
  // A item marked rented on the shelf is unavailable today even without a booking.
  await admin('PATCH', '/api/admin/inventory/ad-0001-01', {body: {status: 'rented'}});
  assert.equal((await call('GET', '/api/products/ad-0001/availability')).data.status, 'rented');
  assert.equal((await call('GET', '/api/products/ad-0001/availability?from=2027-01-01&to=2027-01-02')).data.status, 'available');
  // The admin candidate list says which items are free and who holds the others.
  const candidates = await admin('GET', '/api/products/ad-0005/inventory?from=2026-10-02&to=2026-10-02');
  assert.deepEqual(candidates.data.items.map(i => [i.id, i.available]), [['ad-0005-01', false], ['ad-0005-02', false], ['ad-0005-03', false]]);
  assert.equal(candidates.data.items[0].conflicts[0].customer_name, 'Linh');
  assert.equal((await admin('GET', '/api/products/ad-0005/inventory?from=2026-10-04&to=2026-10-05')).data.items.filter(i => i.available).length, 2);
});

test('a buffer keeps free days between one return and the next pickup', async () => {
  const {admin} = await harness({env: {RESERVATION_BUFFER_DAYS: '1'}});
  await addItem(admin, 'ad-0005-01', 'ad-0005');
  await admin('POST', '/api/admin/reservations', {body: booking(['ad-0005-01'], '2026-10-01', '2026-10-03')});
  assert.equal((await admin('POST', '/api/admin/reservations', {body: booking(['ad-0005-01'], '2026-10-04', '2026-10-05')})).status, 409);
  assert.equal((await admin('POST', '/api/admin/reservations', {body: booking(['ad-0005-01'], '2026-10-05', '2026-10-06')})).status, 201);
  assert.equal((await admin('POST', '/api/admin/reservations', {body: booking(['ad-0005-01'], '2026-09-28', '2026-09-30')})).status, 409);
});

test('10. admin routes refuse strangers, cross-site posts and wrong passwords; inventory list needs auth', async () => {
  const {call, cookie, env} = await harness();
  for (const [method, path] of [['GET', '/api/admin/inventory'], ['POST', '/api/admin/inventory'], ['GET', '/api/admin/reservations'], ['GET', '/api/admin/dashboard'], ['GET', '/api/products/ad-0005/inventory'], ['DELETE', '/api/admin/reservations/x']]) {
    const response = await call(method, path, {body: method === 'POST' ? {} : undefined, headers: {'x-requested-with': 'fetch'}});
    assert.equal(response.status, 401, `${method} ${path}`);
    assert.equal(response.data.error, 'unauthorized');
  }
  assert.equal((await call('GET', '/api/admin/inventory', {cookie: 'tiemora_admin=forged.token'})).status, 401);
  assert.equal((await call('GET', '/api/admin/inventory', {cookie})).status, 200);
  // A cookie alone is not enough for writes: the admin page's fetch header must be there and the origin must match.
  const csrf = await call('POST', '/api/admin/inventory', {cookie, body: {id: 'ad-0005-01', product_id: 'ad-0005'}});
  assert.equal(csrf.status, 403);
  assert.equal((await call('POST', '/api/admin/inventory', {cookie, body: {id: 'ad-0005-01', product_id: 'ad-0005'}, headers: {'x-requested-with': 'fetch', origin: 'https://evil.example'}})).status, 403);
  assert.equal((await call('POST', '/api/admin/inventory', {cookie, body: {id: 'ad-0005-01', product_id: 'ad-0005'}, headers: {'x-requested-with': 'fetch', 'sec-fetch-site': 'cross-site'}})).status, 403);
  assert.equal((await call('POST', '/api/admin/inventory', {cookie, body: {id: 'ad-0005-01', product_id: 'ad-0005'}, headers: {'x-requested-with': 'fetch', origin: ORIGIN, 'sec-fetch-site': 'same-origin'}})).status, 201);
  const wrong = await call('POST', '/api/admin/login', {body: {password: 'nope'}, headers: {'x-requested-with': 'fetch'}});
  assert.equal(wrong.status, 401);
  assert.equal(wrong.headers.get('set-cookie'), null);
  const cookieFlags = (await call('POST', '/api/admin/login', {body: {password: env.ADMIN_PASSWORD}, headers: {'x-requested-with': 'fetch'}})).headers.get('set-cookie');
  assert.match(cookieFlags, /HttpOnly/);
  assert.match(cookieFlags, /SameSite=Strict/);
  assert.match(cookieFlags, /Secure/);
  const out = await call('POST', '/api/admin/logout', {cookie, headers: {'x-requested-with': 'fetch'}});
  assert.match(out.headers.get('set-cookie'), /Max-Age=0/);
  // The admin pages themselves are gated; only the login page is public.
  const page = await call('GET', '/admin/', {headers: {accept: 'text/html'}});
  assert.equal(page.status, 302);
  assert.equal(new URL(page.headers.get('location')).pathname, '/admin/login');
  assert.equal((await call('GET', '/admin/admin.js')).status, 401);
  assert.equal((await call('GET', '/admin/login')).status, 200);
  // The login page must be able to load its own stylesheet and script before anyone is signed in.
  assert.equal((await call('GET', '/admin/admin.css')).status, 200);
  assert.equal((await call('GET', '/admin/login.js')).status, 200);
  assert.equal((await call('GET', '/admin/index.html')).status, 401);
  const gated = await call('GET', '/admin/', {cookie});
  assert.equal(gated.status, 200);
  assert.equal(gated.data, 'asset:/admin/');
  assert.equal(gated.headers.get('cache-control'), 'private, no-store');
  assert.equal((await call('GET', '/admin/login', {cookie})).status, 302);
  assert.equal((await call('GET', '/admin')).status, 302);
  // Without a password configured, nobody gets in and the error says how to fix it.
  const bare = await harness({env: {ADMIN_PASSWORD: ''}, signIn: false});
  assert.equal((await bare.call('POST', '/api/admin/login', {body: {password: ''}, headers: {'x-requested-with': 'fetch'}})).status, 503);
  // Bearer tokens serve scripts and skip the browser-only CSRF check.
  const {call: tokenCall} = await harness({env: {ADMIN_API_TOKEN: 'tok-123'}});
  assert.equal((await tokenCall('GET', '/api/admin/inventory', {headers: {authorization: 'Bearer tok-123'}})).status, 200);
  assert.equal((await tokenCall('POST', '/api/admin/inventory', {headers: {authorization: 'Bearer tok-123'}, body: {id: 'ad-0005-01', product_id: 'ad-0005'}})).status, 201);
  assert.equal((await tokenCall('GET', '/api/admin/inventory', {headers: {authorization: 'Bearer wrong'}})).status, 401);
  assert.equal((await tokenCall('GET', '/api/nothing')).status, 404);
  assert.equal((await tokenCall('PUT', '/api/admin/inventory', {headers: {authorization: 'Bearer tok-123'}, body: {}})).status, 405);
});

test('Cloudflare Access mode verifies the JWT Access adds to each request', async () => {
  resetAccessCache();
  const {privateKey, publicKey} = generateKeyPairSync('rsa', {modulusLength: 2048});
  const jwk = {...publicKey.export({format: 'jwk'}), kid: 'test-key', use: 'sig', alg: 'RS256'};
  const env = {ACCESS_TEAM_DOMAIN: 'example-team', ACCESS_AUD: 'aud-123', ADMIN_PASSWORD: ''};
  const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const sign = claims => {
    const head = b64({alg: 'RS256', kid: 'test-key', typ: 'JWT'}) + '.' + b64(claims);
    return head + '.' + createSign('RSA-SHA256').update(head).sign(privateKey).toString('base64url');
  };
  const certs = async url => { assert.equal(url, 'https://example-team.cloudflareaccess.com/cdn-cgi/access/certs'); return Response.json({keys: [jwk]}); };
  const {verifyAccessToken, authenticate} = await import('../../worker/auth.mjs');
  const good = {aud: ['aud-123'], iss: 'https://example-team.cloudflareaccess.com', exp: Math.floor(Date.now() / 1000) + 600, email: 'staff@example.com'};
  assert.deepEqual(await verifyAccessToken(env, sign(good), {fetcher: certs}), {email: 'staff@example.com', sub: ''});
  assert.equal(await verifyAccessToken(env, sign({...good, aud: 'other'}), {fetcher: certs}), null);
  assert.equal(await verifyAccessToken(env, sign({...good, exp: 1}), {fetcher: certs}), null);
  assert.equal(await verifyAccessToken(env, sign({...good, iss: 'https://evil.cloudflareaccess.com'}), {fetcher: certs}), null);
  const tampered = sign(good).replace(/\.[^.]+$/, '.AAAA');
  assert.equal(await verifyAccessToken(env, tampered, {fetcher: certs}), null);
  const headers = token => new Request(ORIGIN + '/api/admin/inventory', {headers: {'cf-access-jwt-assertion': token}});
  assert.equal((await authenticate(headers(sign(good)), env, {fetcher: certs})).user, 'staff@example.com');
  assert.equal(await authenticate(headers('garbage'), env, {fetcher: certs}), null);
  // With Access on, the password cookie is ignored and the login page is not offered.
  const {call} = await harness({env: {...env, ADMIN_PASSWORD: 'x'}, signIn: false});
  assert.equal((await call('GET', '/api/admin/inventory', {cookie: 'tiemora_admin=whatever'})).status, 401);
  assert.equal((await call('GET', '/admin/login')).status, 403);
  resetAccessCache();
});

test('dashboard counts the day\'s work', async () => {
  const {admin} = await harness();
  const {today} = (await admin('GET', '/api/admin/dashboard')).data;
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  await addItem(admin, 'ad-0005-01', 'ad-0005');
  await addItem(admin, 'ad-0005-02', 'ad-0005', {status: 'maintenance'});
  await addItem(admin, 'ad-0001-01', 'ad-0001');
  const shift = (days) => { const d = new Date(today + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
  const out = (await admin('POST', '/api/admin/reservations', {body: booking(['ad-0005-01'], shift(-2), today, {status: 'confirmed'})})).data.reservation;
  await admin('PATCH', `/api/admin/reservations/${out.id}`, {body: {status: 'rented'}});
  await admin('POST', '/api/admin/reservations', {body: booking(['ad-0001-01'], today, shift(1), {status: 'confirmed'})});
  await admin('POST', '/api/admin/reservations', {body: booking(['ad-0001-01'], shift(5), shift(6))});
  const dash = (await admin('GET', '/api/admin/dashboard')).data;
  assert.equal(dash.products, 3);
  assert.equal(dash.items, 3);
  assert.equal(dash.rentedNow, 1);
  assert.equal(dash.maintenance, 1);
  assert.equal(dash.upcoming, 2);
  assert.deepEqual(dash.returnsToday.map(r => r.id), [out.id]);
  assert.equal(dash.pickupsToday.length, 1);
  assert.equal(dash.pickupsToday[0].items[0].inventory_item_id, 'ad-0001-01');
});
