// The staff digest: the morning push for the day, the evening push for tomorrow, sent by the Cron
// Trigger at the store's own times and only when there is something to say.
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../worker/index.mjs';
import {dueDigests, digestPayload, runDigest} from '../../worker/digest.mjs';
import {resetStoreCache} from '../../worker/store.mjs';
import {savePushSubscription} from '../../worker/db.mjs';
import {normalizeStoreConfig} from '../../core/config/store.mjs';
import {migratedDatabase} from '../d1-shim.mjs';
import {todayIn, shiftDate} from '../../core/booking/dates.mjs';

const today = todayIn('Asia/Ho_Chi_Minh');
const day = n => shiftDate(today, n);
const b64 = bytes => Buffer.from(bytes).toString('base64url');
// The store clock at `time` on `date`, as the trigger's scheduledTime (Hanoi is UTC+7).
const at = (date, time) => Date.parse(`${date}T${time}:00+07:00`);

test('admin.digest takes two store-local times, and is off unless set', () => {
  assert.deepEqual(normalizeStoreConfig({}).config.admin.digest, {today: null, tomorrow: null});
  const {config, warnings} = normalizeStoreConfig({admin: {digest: {today: '06:30', tomorrow: '9pm'}}}, {warn: () => {}});
  assert.deepEqual(config.admin.digest, {today: '06:30', tomorrow: null});
  assert.equal(warnings.length, 1);
});

test('a digest falls due in the half hour after its time, once', () => {
  const digest = {today: '06:30', tomorrow: '21:00'};
  assert.deepEqual(dueDigests(digest, '06:30'), ['today']);
  assert.deepEqual(dueDigests(digest, '06:59'), ['today']);
  assert.deepEqual(dueDigests(digest, '07:00'), []);
  assert.deepEqual(dueDigests(digest, '06:00'), []);
  assert.deepEqual(dueDigests(digest, '21:00'), ['tomorrow']);
  assert.deepEqual(dueDigests({}, '06:30'), []);
});

test('the push lists overdue returns first, then pick-ups and returns by time, in the staff language', () => {
  const plan = {
    date: '2026-09-27',
    pickups: [{customer_name: 'Mai', start_time: '07:00', purpose: 'rental', items: [{inventory_item_id: 'ad-0001-01'}]}, {customer_name: 'Thu', start_time: '10:00', purpose: 'fitting', items: [{inventory_item_id: 'ad-0001-02'}]}],
    returns: [{customer_name: 'Lan', start_time: '19:00', purpose: 'rental', items: [{inventory_item_id: 'ad-0002-01'}]}],
    unconfirmed: [{customer_name: 'Vy'}],
    overdue: [{customer_name: 'An', items: [{inventory_item_id: 'ad-0003-01'}]}]
  };
  const payload = digestPayload(plan, {kind: 'today', language: 'ja'});
  assert.equal(payload.title, '今日 27/9 · 受取 2件 · 返却 1件');
  assert.deepEqual(payload.body.split('\n'), ['⚠ 返却期限超過: An · ad-0003-01', '受取 07:00 Mai · ad-0001-01', '試着 10:00 Thu · ad-0001-02', '返却 19:00 Lan · ad-0002-01', '未確定の予約: 1件']);
  assert.equal(payload.url, '/admin/#/reservations?from=2026-09-27&to=2026-09-27');
  assert.equal(payload.tag, 'digest-today-2026-09-27');
  assert.match(digestPayload(plan, {kind: 'tomorrow', language: 'vi'}).title, /^Ngày mai 27\/9 · Giao 2 · Trả 1$/);
  assert.equal(digestPayload({date: '2026-09-27', pickups: [], returns: [], unconfirmed: [], overdue: []}, {kind: 'today'}), null, 'nothing to say, nothing sent');
  const busy = {...plan, pickups: Array.from({length: 20}, (_, n) => ({customer_name: `C${n}`, start_time: '07:00', items: []}))};
  assert.match(digestPayload(busy, {kind: 'today', language: 'en'}).body, /…and 10 more/);
});

test('the cron sends the day at 06:30 and tomorrow at 21:00 to every subscribed phone', async () => {
  resetStoreCache();
  const pair = await crypto.subtle.generateKey({name: 'ECDSA', namedCurve: 'P-256'}, true, ['sign', 'verify']);
  const store = {timezone: 'Asia/Ho_Chi_Minh', admin: {defaultLanguage: 'en', digest: {today: '06:30', tomorrow: '21:00'}}};
  const env = {
    DB: await migratedDatabase(), STORE_TIMEZONE: 'Asia/Ho_Chi_Minh',
    VAPID_PUBLIC_KEY: b64(await crypto.subtle.exportKey('raw', pair.publicKey)), VAPID_PRIVATE_KEY: (await crypto.subtle.exportKey('jwk', pair.privateKey)).d, VAPID_SUBJECT: 'mailto:admin@example.com',
    ASSETS: {fetch: async request => new URL(request.url).pathname === '/store.json' ? Response.json(store) : new Response('', {status: 404})}
  };
  const browser = await crypto.subtle.generateKey({name: 'ECDH', namedCurve: 'P-256'}, true, ['deriveBits']);
  await savePushSubscription(env.DB, {endpoint: 'https://push.example/phone', p256dh: b64(await crypto.subtle.exportKey('raw', browser.publicKey)), auth: b64(crypto.getRandomValues(new Uint8Array(16)))});
  await env.DB.prepare("INSERT INTO inventory_items (id, product_id, size, status) VALUES ('ad-0005-01', 'ad-0005', 'L', 'available')").run();
  await env.DB.prepare(`INSERT INTO reservations (id, customer_name, start_date, end_date, status, start_time, rental_days, start_at, ready_at)
    VALUES ('rsv-tomorrow', 'Mai', ?, ?, 'confirmed', '19:00', 1, ?, ?)`).bind(day(1), day(2), `${day(1)}T19:00`, `${day(3)}T07:00`).run();
  await env.DB.prepare("INSERT INTO reservation_items (reservation_id, inventory_item_id, product_id) VALUES ('rsv-tomorrow', 'ad-0005-01', 'ad-0005')").run();
  const pushes = [];
  const fetchImpl = async url => { pushes.push(url); return new Response('', {status: 201}); };
  // This morning: nothing on today, so nothing is sent.
  assert.deepEqual(await runDigest(env, at(today, '06:30'), {fetchImpl}), []);
  // This evening: tomorrow's pick-up.
  const [evening] = await runDigest(env, at(today, '21:00'), {fetchImpl});
  assert.equal(evening.tag, `digest-tomorrow-${day(1)}`);
  assert.match(evening.body, /^Pick-up 19:00 Mai · ad-0005-01$/);
  assert.deepEqual(pushes, ['https://push.example/phone']);
  // Tomorrow morning the same booking is today's; at any other half hour nothing goes out.
  assert.equal((await runDigest(env, at(day(1), '06:45'), {fetchImpl}))[0].tag, `digest-today-${day(1)}`);
  assert.deepEqual(await runDigest(env, at(day(1), '12:00'), {fetchImpl}), []);
  // Without VAPID keys the trigger does nothing at all.
  assert.deepEqual(await runDigest({...env, VAPID_PRIVATE_KEY: ''}, at(today, '21:00'), {fetchImpl}), []);
  // The Worker's scheduled() entry point hands the run to waitUntil.
  const waited = [];
  await worker.scheduled({scheduledTime: at(today, '21:00')}, {...env, VAPID_PRIVATE_KEY: ''}, {waitUntil: promise => waited.push(promise)});
  assert.equal(waited.length, 1);
  await waited[0];
});
