// Web Push: VAPID signing, RFC 8291 encryption (decrypted here with the browser-side keys), the
// subscription routes and the push sent when a public request arrives.
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../worker/index.mjs';
import {resetCatalogCache} from '../../worker/catalog.mjs';
import {resetStoreCache} from '../../worker/store.mjs';
import {vapidAuthorization, encryptPayload, sendPush, notifyAdmins, pushEnabled} from '../../worker/push.mjs';
import {migratedDatabase} from '../d1-shim.mjs';
import {todayIn, shiftDate} from '../../core/booking/dates.mjs';

const b64 = bytes => Buffer.from(bytes).toString('base64url');
const fromB64 = text => new Uint8Array(Buffer.from(text, 'base64url'));
const ORIGIN = 'https://store.test';
const catalog = [{id: 'ad-0005', name: {vi: 'Sản phẩm năm', en: 'Item five'}, category: 'rental', sizes: ['M', 'L'], inventory: {managed: true}, images: [], videos: []}];
const today = todayIn('Asia/Ho_Chi_Minh');
const day = n => shiftDate(today, n);

async function vapidEnv() {
  const pair = await crypto.subtle.generateKey({name: 'ECDSA', namedCurve: 'P-256'}, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  return {env: {VAPID_PUBLIC_KEY: b64(await crypto.subtle.exportKey('raw', pair.publicKey)), VAPID_PRIVATE_KEY: jwk.d, VAPID_SUBJECT: 'mailto:admin@example.com'}, publicKey: pair.publicKey};
}
// What a browser would hand back from PushManager.subscribe(): an endpoint plus its own ECDH key and auth secret.
async function browserSubscription(endpoint = 'https://push.example/send/abc') {
  const pair = await crypto.subtle.generateKey({name: 'ECDH', namedCurve: 'P-256'}, true, ['deriveBits']);
  const auth = crypto.getRandomValues(new Uint8Array(16));
  return {endpoint, keys: {p256dh: b64(await crypto.subtle.exportKey('raw', pair.publicKey)), auth: b64(auth)}, privateKey: pair.privateKey, auth};
}
// RFC 8291 decryption with the subscriber's private key, mirroring the Worker's key schedule.
async function decrypt(body, subscription) {
  const salt = body.slice(0, 16), rs = new DataView(body.buffer, body.byteOffset).getUint32(16), idlen = body[20];
  const asPublic = body.slice(21, 21 + idlen), ciphertext = body.slice(21 + idlen);
  assert.equal(rs, 4096); assert.equal(idlen, 65);
  const uaPublic = fromB64(subscription.keys.p256dh);
  const asKey = await crypto.subtle.importKey('raw', asPublic, {name: 'ECDH', namedCurve: 'P-256'}, false, []);
  const secret = new Uint8Array(await crypto.subtle.deriveBits({name: 'ECDH', public: asKey}, subscription.privateKey, 256));
  const hkdf = async (ikm, s, info, bits) => new Uint8Array(await crypto.subtle.deriveBits({name: 'HKDF', hash: 'SHA-256', salt: s, info}, await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), bits));
  const enc = new TextEncoder();
  const info = new Uint8Array([...enc.encode('WebPush: info\0'), ...uaPublic, ...asPublic]);
  const ikm = await hkdf(secret, subscription.auth, info, 256);
  const cek = await hkdf(ikm, salt, enc.encode('Content-Encoding: aes128gcm\0'), 128);
  const nonce = await hkdf(ikm, salt, enc.encode('Content-Encoding: nonce\0'), 96);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const plain = new Uint8Array(await crypto.subtle.decrypt({name: 'AES-GCM', iv: nonce}, key, ciphertext));
  assert.equal(plain.at(-1), 2, 'last-record delimiter');
  return new TextDecoder().decode(plain.slice(0, -1));
}

test('the VAPID header carries an ES256 JWT for the push service origin that verifies with the public key', async () => {
  const {env, publicKey} = await vapidEnv();
  const header = await vapidAuthorization(env, 'https://push.example', Date.parse('2026-10-01T00:00:00Z'));
  const match = /^vapid t=([^,]+), k=(.+)$/.exec(header);
  assert(match, header);
  assert.equal(match[2], env.VAPID_PUBLIC_KEY);
  const [h, c, sig] = match[1].split('.');
  assert.deepEqual(JSON.parse(Buffer.from(h, 'base64url')), {typ: 'JWT', alg: 'ES256'});
  const claims = JSON.parse(Buffer.from(c, 'base64url'));
  assert.equal(claims.aud, 'https://push.example');
  assert.equal(claims.sub, 'mailto:admin@example.com');
  assert.equal(claims.exp, Math.floor(Date.parse('2026-10-01T00:00:00Z') / 1000) + 12 * 3600);
  assert.equal(await crypto.subtle.verify({name: 'ECDSA', hash: 'SHA-256'}, publicKey, fromB64(sig), new TextEncoder().encode(h + '.' + c)), true);
  assert.equal(pushEnabled(env), true);
  assert.equal(pushEnabled({...env, VAPID_PRIVATE_KEY: ''}), false);
});

test('the payload is encrypted with aes128gcm and decrypts with the subscription keys', async () => {
  const subscription = await browserSubscription();
  const payload = JSON.stringify({title: 'Hello 🌸', body: 'Nguyễn Mai · Sản phẩm năm'});
  const body = await encryptPayload({p256dh: subscription.keys.p256dh, auth: subscription.keys.auth}, payload);
  assert.equal(await decrypt(body, subscription), payload);
  // A different message never produces the same bytes (fresh salt and ephemeral key each time).
  const again = await encryptPayload({p256dh: subscription.keys.p256dh, auth: subscription.keys.auth}, payload);
  assert.notDeepEqual(Buffer.from(again), Buffer.from(body));
  await assert.rejects(encryptPayload({p256dh: 'abc', auth: subscription.keys.auth}, payload), /Invalid push subscription keys/);
  await assert.rejects(encryptPayload({p256dh: subscription.keys.p256dh, auth: subscription.keys.auth}, 'x'.repeat(5000)), /too large/);
});

test('sendPush posts the encrypted body with the Web Push headers and reports gone subscriptions', async () => {
  const {env} = await vapidEnv();
  const subscription = await browserSubscription();
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push({url, init}); return new Response('', {status: url.endsWith('gone') ? 410 : 201}); };
  const result = await sendPush(env, {endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth}, {title: 'T', body: 'B'}, {fetchImpl});
  assert.deepEqual(result, {ok: true, status: 201, gone: false});
  const {url, init} = calls[0];
  assert.equal(url, subscription.endpoint);
  assert.equal(init.method, 'POST');
  assert.equal(init.headers['content-encoding'], 'aes128gcm');
  assert.equal(init.headers['content-type'], 'application/octet-stream');
  assert.equal(init.headers.ttl, '86400');
  assert.match(init.headers.authorization, /^vapid t=.+, k=.+$/);
  assert.equal(await decrypt(init.body, subscription), JSON.stringify({title: 'T', body: 'B'}));
  const gone = await sendPush(env, {endpoint: 'https://push.example/gone', p256dh: subscription.keys.p256dh, auth: subscription.keys.auth}, {}, {fetchImpl});
  assert.deepEqual(gone, {ok: false, status: 410, gone: true});
  const down = await sendPush(env, {endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth}, {}, {fetchImpl: async () => { throw new Error('offline'); }});
  assert.deepEqual(down, {ok: false, status: 0, gone: false});
});

async function harness(extraEnv = {}) {
  resetCatalogCache(); resetStoreCache();
  const sent = [];
  const env = {
    DB: await migratedDatabase(),
    ASSETS: {fetch: async request => new URL(request.url).pathname === '/catalog.json' ? Response.json(catalog) : new Response('', {status: 404})},
    ADMIN_PASSWORD: 'pw', ...extraEnv
  };
  const waited = [];
  const ctx = {waitUntil: promise => waited.push(promise)};
  const call = async (method, path, {body, headers = {}} = {}) => {
    const init = {method, headers: {...headers}};
    if (body !== undefined) { init.body = JSON.stringify(body); init.headers['content-type'] ??= 'application/json'; }
    const response = await worker.fetch(new Request(ORIGIN + path, init), env, ctx);
    return {status: response.status, data: await response.json().catch(() => null)};
  };
  const login = await worker.fetch(new Request(ORIGIN + '/api/admin/login', {method: 'POST', headers: {'content-type': 'application/json', 'x-requested-with': 'fetch'}, body: JSON.stringify({password: 'pw'})}), env, ctx);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const admin = (method, path, options = {}) => call(method, path, {...options, headers: {cookie, 'x-requested-with': 'fetch', ...options.headers}});
  return {env, call, admin, sent, waited};
}

test('subscription routes need an admin, validate the browser payload and upsert on the endpoint', async () => {
  const {env: vapid} = await vapidEnv();
  const {call, admin} = await harness(vapid);
  assert.equal((await call('GET', '/api/admin/push/config')).status, 401);
  assert.equal((await call('POST', '/api/admin/push/subscriptions', {body: {}, headers: {'x-requested-with': 'fetch'}})).status, 401);
  const config = await admin('GET', '/api/admin/push/config');
  assert.equal(config.data.publicKey, vapid.VAPID_PUBLIC_KEY);
  assert.deepEqual(config.data.push, {enabled: true, publicKeySet: true, privateKeySet: true, subjectSet: true});
  const subscription = await browserSubscription();
  assert.equal((await admin('POST', '/api/admin/push/subscriptions', {body: {endpoint: 'http://insecure', keys: subscription.keys}})).status, 400);
  assert.equal((await admin('POST', '/api/admin/push/subscriptions', {body: {endpoint: subscription.endpoint, keys: {p256dh: 'not base64!', auth: 'x'}}})).status, 400);
  const created = await admin('POST', '/api/admin/push/subscriptions', {body: {endpoint: subscription.endpoint, keys: subscription.keys, label: 'Phone'}});
  assert.equal(created.status, 201, JSON.stringify(created.data));
  assert.equal(created.data.subscription.label, 'Phone');
  // The same endpoint again (browser re-subscribing) keeps one row with the new keys.
  const fresh = await browserSubscription(subscription.endpoint);
  assert.equal((await admin('POST', '/api/admin/push/subscriptions', {body: {endpoint: subscription.endpoint, keys: fresh.keys, label: 'Phone 2'}})).status, 201);
  const list = await admin('GET', '/api/admin/push/subscriptions');
  assert.equal(list.data.subscriptions.length, 1);
  assert.equal(list.data.subscriptions[0].label, 'Phone 2');
  assert.equal(list.data.subscriptions[0].p256dh, undefined, 'keys never leave the server');
  assert.deepEqual((await admin('POST', '/api/admin/push/unsubscribe', {body: {endpoint: subscription.endpoint}})).data, {deleted: true});
  assert.deepEqual((await admin('POST', '/api/admin/push/unsubscribe', {body: {endpoint: subscription.endpoint}})).data, {deleted: false});
  assert.equal((await admin('GET', '/api/admin/push/subscriptions')).data.subscriptions.length, 0);
});

test('without VAPID keys the config says so and nothing is sent', async () => {
  const {admin} = await harness();
  const config = await admin('GET', '/api/admin/push/config');
  assert.equal(config.data.publicKey, '');
  assert.equal(config.data.push.enabled, false);
  assert.deepEqual((await admin('POST', '/api/admin/push/test', {body: {}})).data, {sent: 0, failed: 0, removed: 0, skipped: true});
});

test('a new public request pushes to every subscribed device; dead endpoints are pruned', async () => {
  const {env: vapid} = await vapidEnv();
  const {env, call, admin, waited} = await harness(vapid);
  const deliveries = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => { deliveries.push({url, init}); return new Response('', {status: String(url).endsWith('/dead') ? 404 : 201}); };
  try {
    const alive = await browserSubscription('https://push.example/alive');
    const dead = await browserSubscription('https://push.example/dead');
    for (const s of [alive, dead]) assert.equal((await admin('POST', '/api/admin/push/subscriptions', {body: {endpoint: s.endpoint, keys: s.keys}})).status, 201);
    await admin('POST', '/api/admin/inventory', {body: {id: 'ad-0005-01', product_id: 'ad-0005', size: 'L'}});
    const request = {product_id: 'ad-0005', size: 'L', customer_name: 'Nguyễn Mai', customer_phone: '0901234567', preferred_contact_channel: 'zalo', start_date: day(3), end_date: day(5), privacy_consent: true};
    const created = await call('POST', '/api/reservation-requests', {body: request, headers: {'x-requested-with': 'fetch', 'cf-connecting-ip': '203.0.113.7'}});
    assert.equal(created.status, 201, JSON.stringify(created.data));
    // Delivery is handed to ctx.waitUntil so the customer's response is not delayed.
    assert.equal(waited.length, 1);
    await Promise.all(waited);
    assert.deepEqual(deliveries.map(d => d.url).sort(), ['https://push.example/alive', 'https://push.example/dead']);
    const payload = JSON.parse(await decrypt(deliveries.find(d => d.url.endsWith('/alive')).init.body, alive));
    assert.equal(payload.type, 'new_request');
    assert.match(payload.body, /^Nguyễn Mai · Sản phẩm năm \(L\) · /);
    assert.equal(payload.url, `/admin/#/reservations/${created.data.request.id}`);
    // The 404 endpoint is gone; the working one recorded a send.
    const list = (await admin('GET', '/api/admin/push/subscriptions')).data.subscriptions;
    assert.deepEqual(list.map(s => s.endpoint), ['https://push.example/alive']);
    assert.match(list[0].last_sent_at, /^\d{4}-/);
    // A duplicate request (same phone, product, dates) is not announced twice.
    deliveries.length = 0;
    const again = await call('POST', '/api/reservation-requests', {body: request, headers: {'x-requested-with': 'fetch', 'cf-connecting-ip': '203.0.113.7'}});
    assert.equal(again.data.duplicate, true);
    assert.equal(deliveries.length, 0);
    // The test route reports the summary.
    assert.deepEqual(await notifyAdmins(env, {title: 'x'}, {}), {sent: 1, failed: 0, removed: 0, skipped: false});
  } finally { globalThis.fetch = original; }
});
