// Web Push to admin devices, implemented on Web Crypto alone (no dependency):
//  - VAPID (RFC 8292): an ES256 JWT signed with the store's VAPID private key identifies the sender.
//  - Message encryption (RFC 8291 / RFC 8188 "aes128gcm"): ECDH with the browser's subscription key,
//    HKDF and AES-128-GCM, one record.
// Configuration: VAPID_PUBLIC_KEY (wrangler var, base64url of the 65-byte uncompressed P-256 point),
// VAPID_PRIVATE_KEY (secret, base64url of the 32-byte scalar) and VAPID_SUBJECT (mailto:… or https://…).
// `npm run vapid:generate` prints a fresh pair. Push is optional: with any of the three missing the
// admin page simply hides the subscribe button.
import {base64url} from './util.mjs';
import * as db from './db.mjs';

const encoder = new TextEncoder();
const RECORD_SIZE = 4096;
const MAX_PAYLOAD = 3800;

export const pushEnabled = env => Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);
export function pushStatus(env) {
  return {enabled: pushEnabled(env), publicKeySet: Boolean(env.VAPID_PUBLIC_KEY), privateKeySet: Boolean(env.VAPID_PRIVATE_KEY), subjectSet: Boolean(env.VAPID_SUBJECT)};
}

// --- VAPID ------------------------------------------------------------------------------------------
let signingKey = {id: '', key: null};
async function vapidSigningKey(env) {
  const id = env.VAPID_PUBLIC_KEY + '|' + env.VAPID_PRIVATE_KEY;
  if (signingKey.id === id && signingKey.key) return signingKey.key;
  const pub = base64url.decode(env.VAPID_PUBLIC_KEY);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error('VAPID_PUBLIC_KEY must be the base64url of a 65-byte uncompressed P-256 public key.');
  const jwk = {kty: 'EC', crv: 'P-256', x: base64url.encode(pub.slice(1, 33)), y: base64url.encode(pub.slice(33, 65)), d: env.VAPID_PRIVATE_KEY};
  const key = await crypto.subtle.importKey('jwk', jwk, {name: 'ECDSA', namedCurve: 'P-256'}, false, ['sign']);
  signingKey = {id, key};
  return key;
}
// Authorization header for one push service origin. Tokens are valid 12 hours (the maximum is 24).
export async function vapidAuthorization(env, audience, now = Date.now()) {
  const header = base64url.encode(encoder.encode(JSON.stringify({typ: 'JWT', alg: 'ES256'})));
  const claims = base64url.encode(encoder.encode(JSON.stringify({aud: audience, exp: Math.floor(now / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT})));
  const signature = await crypto.subtle.sign({name: 'ECDSA', hash: 'SHA-256'}, await vapidSigningKey(env), encoder.encode(header + '.' + claims));
  return `vapid t=${header}.${claims}.${base64url.encode(signature)}, k=${env.VAPID_PUBLIC_KEY}`;
}

// --- Encryption -----------------------------------------------------------------------------------
const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
};
async function hkdf(ikm, salt, info, bits) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({name: 'HKDF', hash: 'SHA-256', salt, info}, key, bits));
}
// Encrypts `payload` (string or bytes) for a subscription {p256dh, auth}; returns the aes128gcm body.
/** @param {{p256dh: string, auth: string}} subscription @param {string | Uint8Array} payload @param {{salt?: Uint8Array, keyPair?: CryptoKeyPair}} [options] */
export async function encryptPayload(subscription, payload, {salt = crypto.getRandomValues(new Uint8Array(16)), keyPair} = {}) {
  const plaintext = typeof payload === 'string' ? encoder.encode(payload) : payload;
  if (plaintext.length > MAX_PAYLOAD) throw new Error(`Push payload too large (${plaintext.length} > ${MAX_PAYLOAD} bytes).`);
  const uaPublic = base64url.decode(subscription.p256dh);
  const authSecret = base64url.decode(subscription.auth);
  if (uaPublic.length !== 65 || authSecret.length !== 16) throw new Error('Invalid push subscription keys.');
  keyPair ??= await crypto.subtle.generateKey({name: 'ECDH', namedCurve: 'P-256'}, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, {name: 'ECDH', namedCurve: 'P-256'}, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({name: 'ECDH', public: uaKey}, keyPair.privateKey, 256));
  // RFC 8291 §3.3 / §3.4: IKM from the ECDH secret and the auth secret, then the RFC 8188 key schedule.
  const ikm = await hkdf(ecdhSecret, authSecret, concat(encoder.encode('WebPush: info\0'), uaPublic, asPublic), 256);
  const cek = await hkdf(ikm, salt, encoder.encode('Content-Encoding: aes128gcm\0'), 128);
  const nonce = await hkdf(ikm, salt, encoder.encode('Content-Encoding: nonce\0'), 96);
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  // One record: payload, then the 0x02 delimiter that marks the last record (no extra padding).
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({name: 'AES-GCM', iv: nonce}, aesKey, concat(plaintext, new Uint8Array([2]))));
  const header = new Uint8Array(16 + 4 + 1 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, RECORD_SIZE);
  header[20] = asPublic.length;
  header.set(asPublic, 21);
  return concat(header, ciphertext);
}

// --- Sending --------------------------------------------------------------------------------------
// Sends one message. Resolves {ok, status, gone}; gone means the subscription no longer exists.
export async function sendPush(env, subscription, payload, {fetchImpl = fetch, ttl = 86400, urgency = 'high'} = {}) {
  const body = await encryptPayload(subscription, JSON.stringify(payload));
  const authorization = await vapidAuthorization(env, new URL(subscription.endpoint).origin);
  let response;
  try {
    response = await fetchImpl(subscription.endpoint, {
      method: 'POST',
      headers: {authorization, 'content-encoding': 'aes128gcm', 'content-type': 'application/octet-stream', ttl: String(ttl), urgency},
      body
    });
  } catch (error) {
    console.error('Push delivery failed:', error);
    return {ok: false, status: 0, gone: false};
  }
  return {ok: response.ok, status: response.status, gone: response.status === 404 || response.status === 410};
}
// Sends `payload` to every subscribed admin device and prunes dead subscriptions.
export async function notifyAdmins(env, payload, options = {}) {
  if (!pushEnabled(env)) return {sent: 0, failed: 0, removed: 0, skipped: true};
  const subscriptions = await db.listPushSubscriptions(env.DB);
  const summary = {sent: 0, failed: 0, removed: 0, skipped: false};
  await Promise.all(subscriptions.map(async subscription => {
    const result = await sendPush(env, subscription, payload, options);
    await db.recordPushResult(env.DB, subscription.endpoint, result);
    if (result.gone) summary.removed++; else if (result.ok) summary.sent++; else summary.failed++;
  }));
  return summary;
}
// The notification for a new sale / pre-order from the public site.
export function newOrderPayload(order, productName) {
  const line = order.items?.[0];
  return {
    type: 'new_order',
    title: 'New order',
    body: `${order.customer_name} · ${productName}${line?.quantity > 1 ? ` ×${line.quantity}` : ''} · ${order.fulfillment_type} ${order.fulfillment_date}${order.time_slot ? ' ' + order.time_slot : ''}`,
    url: `/admin/#/orders/${encodeURIComponent(order.id)}`,
    tag: `order-${order.id}`
  };
}
// The notification for a new reservation request from the public site.
export function newRequestPayload(reservation, productName) {
  return {
    type: 'new_request',
    title: 'New booking request',
    body: `${reservation.customer_name} · ${productName}${reservation.request_size ? ` (${reservation.request_size})` : ''} · ${reservation.start_date} → ${reservation.end_date}`,
    url: `/admin/#/reservations/${encodeURIComponent(reservation.id)}`,
    tag: `reservation-${reservation.id}`
  };
}
