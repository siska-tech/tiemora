// Spam protection for the public reservation form (POST /api/reservation-requests).
//  1. Cloudflare Turnstile, when TURNSTILE_SITE_KEY (var) and TURNSTILE_SECRET_KEY (secret) are set:
//     the page renders the widget and sends its token; the token is verified with siteverify here.
//     Both empty = no widget, no check (local development, or before the keys exist).
//  2. A per-IP throttle kept in D1 (public_request_log): a few requests per 10 minutes, a handful per
//     day. The client IP is stored only as a SHA-256 hash and rows are pruned after a day.
// A Cloudflare WAF rate-limiting rule on /api/reservation-requests is still recommended in front.
import {HttpError} from './util.mjs';
import {countPublicRequests, logPublicRequest} from './db.mjs';

export const LIMITS = {perTenMinutes: 3, perDay: 10};
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Verification runs only when BOTH keys exist: the page cannot render the widget without the site key,
// and the Worker cannot verify without the secret. A half-configured pair must never lock customers
// out, so the form keeps working and shows an admin warning instead (see turnstileStatus).
export const turnstileEnabled = env => Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY);
export const turnstileStatus = env => ({enabled: turnstileEnabled(env), siteKeySet: Boolean(env.TURNSTILE_SITE_KEY), secretSet: Boolean(env.TURNSTILE_SECRET_KEY)});
export function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}
async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyTurnstile(env, token, ip, fetchImpl = fetch) {
  if (typeof token !== 'string' || !token || token.length > 2048) throw new HttpError(400, 'turnstile_required', 'Please complete the verification and try again.', {fields: {turnstile_token: 'required'}});
  const form = new URLSearchParams({secret: env.TURNSTILE_SECRET_KEY, response: token});
  if (ip && ip !== 'unknown') form.set('remoteip', ip);
  let result;
  try {
    const response = await fetchImpl(SITEVERIFY, {method: 'POST', body: form});
    result = await response.json();
  } catch (error) {
    console.error('Turnstile siteverify failed:', error);
    throw new HttpError(503, 'turnstile_unavailable', 'Verification is temporarily unavailable. Please try again in a moment.');
  }
  if (!result?.success) throw new HttpError(400, 'turnstile_failed', 'Verification failed. Please try again.', {codes: result?.['error-codes'] || []});
}

// Runs every check that must pass before a request is written, and hands back record() to call
// once it has been. Throws HttpError (400 / 429 / 503) otherwise.
/** @param {Request} request @param {any} env @param {any} body @param {{now?: Date, fetchImpl?: typeof fetch}} [options] */
export async function publicRequestGuard(request, env, body, {now = new Date(), fetchImpl} = {}) {
  const ip = clientIp(request);
  if (turnstileEnabled(env)) await verifyTurnstile(env, body.turnstile_token ?? body['cf-turnstile-response'], ip, fetchImpl);
  const ipHash = await sha256Hex('ip:' + ip);
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60000).toISOString();
  const dayAgo = new Date(now.getTime() - 24 * 3600000).toISOString();
  const [recent, daily] = await Promise.all([countPublicRequests(env.DB, ipHash, tenMinutesAgo), countPublicRequests(env.DB, ipHash, dayAgo)]);
  if (recent >= LIMITS.perTenMinutes || daily >= LIMITS.perDay) {
    throw new HttpError(429, 'too_many_requests', 'Too many requests from this connection. Please try again later or message the store.', undefined);
  }
  return {ip, record: () => logPublicRequest(env.DB, ipHash, {keepSince: dayAgo})};
}
