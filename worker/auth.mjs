// Admin authentication. Two modes, picked by configuration:
//  1. Cloudflare Access (ACCESS_TEAM_DOMAIN + ACCESS_AUD set): the Cf-Access-Jwt-Assertion header
//     Access adds to every request is verified against the team's public keys.
//  2. Password login (ADMIN_PASSWORD secret): POST /api/admin/login sets an HMAC-signed session cookie.
// In both modes an optional ADMIN_API_TOKEN secret allows `Authorization: Bearer` for scripts.
import {HttpError, timingSafeEqual, base64url} from './util.mjs';

export const SESSION_COOKIE = 'tiemora_admin';
const SESSION_DAYS = 14;
const encoder = new TextEncoder();

export function accessEnabled(env) { return Boolean(env.ACCESS_TEAM_DOMAIN && env.ACCESS_AUD); }
export function authMode(env) { return accessEnabled(env) ? 'access' : 'password'; }

async function sha256(text) { return crypto.subtle.digest('SHA-256', encoder.encode(text)); }
async function sessionKey(env) {
  // Without a dedicated secret the key is derived from the password, so changing the password logs everyone out.
  const material = env.ADMIN_SESSION_SECRET || (env.ADMIN_PASSWORD ? 'session:' + env.ADMIN_PASSWORD : '');
  if (!material) return null;
  return crypto.subtle.importKey('raw', await sha256(material), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign', 'verify']);
}
export async function createSession(env, now = Date.now()) {
  const key = await sessionKey(env);
  const payload = base64url.encode(encoder.encode(JSON.stringify({v: 1, iat: now, exp: now + SESSION_DAYS * 86400000})));
  const signature = base64url.encode(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
  return payload + '.' + signature;
}
async function verifySession(env, token, now = Date.now()) {
  const key = await sessionKey(env);
  const [payload, signature] = String(token || '').split('.');
  if (!key || !payload || !signature) return false;
  let valid = false;
  try { valid = await crypto.subtle.verify('HMAC', key, base64url.decode(signature), encoder.encode(payload)); } catch { return false; }
  if (!valid) return false;
  try {
    const data = JSON.parse(new TextDecoder().decode(base64url.decode(payload)));
    return data.v === 1 && typeof data.exp === 'number' && data.exp > now;
  } catch { return false; }
}
export function readCookie(request, name) {
  for (const part of (request.headers.get('cookie') || '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return '';
}
export function sessionCookie(request, token, maxAge = SESSION_DAYS * 86400) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${secure}`;
}
export async function checkPassword(env, password) {
  if (!env.ADMIN_PASSWORD) throw new HttpError(503, 'auth_not_configured', 'ADMIN_PASSWORD is not set. Add it with `wrangler secret put ADMIN_PASSWORD` or in .dev.vars.');
  if (typeof password !== 'string' || !password) return false;
  return timingSafeEqual(password, env.ADMIN_PASSWORD);
}

// --- Cloudflare Access ---------------------------------------------------------------------------
let jwksCache = {domain: '', keys: [], fetchedAt: 0};
async function accessKeys(env, fetcher = fetch) {
  const domain = env.ACCESS_TEAM_DOMAIN;
  if (jwksCache.domain === domain && Date.now() - jwksCache.fetchedAt < 3600000) return jwksCache.keys;
  const response = await fetcher(`https://${domain}.cloudflareaccess.com/cdn-cgi/access/certs`);
  if (!response.ok) throw new Error(`Access certs HTTP ${response.status}`);
  const {keys = []} = await response.json();
  jwksCache = {domain, fetchedAt: Date.now(), keys: await Promise.all(keys.filter(k => k.kty === 'RSA').map(async jwk => ({
    kid: jwk.kid,
    key: await crypto.subtle.importKey('jwk', jwk, {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'}, false, ['verify'])
  })))};
  return jwksCache.keys;
}
export function resetAccessCache() { jwksCache = {domain: '', keys: [], fetchedAt: 0}; }
export async function verifyAccessToken(env, token, {fetcher = fetch, now = Date.now()} = {}) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  let header, claims;
  try {
    header = JSON.parse(new TextDecoder().decode(base64url.decode(parts[0])));
    claims = JSON.parse(new TextDecoder().decode(base64url.decode(parts[1])));
  } catch { return null; }
  if (header.alg !== 'RS256') return null;
  const keys = await accessKeys(env, fetcher);
  const entry = keys.find(k => k.kid === header.kid);
  if (!entry) return null;
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', entry.key, base64url.decode(parts[2]), encoder.encode(parts[0] + '.' + parts[1]));
  if (!valid) return null;
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(env.ACCESS_AUD)) return null;
  if (claims.iss !== `https://${env.ACCESS_TEAM_DOMAIN}.cloudflareaccess.com`) return null;
  if (typeof claims.exp !== 'number' || claims.exp * 1000 <= now) return null;
  return {email: claims.email || '', sub: claims.sub || ''};
}

// Returns {mode, user} when the request is from an admin, otherwise null.
export async function authenticate(request, env, options = {}) {
  const bearer = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (bearer && env.ADMIN_API_TOKEN && timingSafeEqual(bearer[1].trim(), env.ADMIN_API_TOKEN)) return {mode: 'token', user: 'api-token'};
  if (accessEnabled(env)) {
    const token = request.headers.get('cf-access-jwt-assertion') || readCookie(request, 'CF_Authorization');
    const identity = token && await verifyAccessToken(env, token, options).catch(() => null);
    return identity ? {mode: 'access', user: identity.email || identity.sub} : null;
  }
  const token = readCookie(request, SESSION_COOKIE);
  return token && await verifySession(env, token) ? {mode: 'password', user: 'admin'} : null;
}

// Cookie sessions are only accepted for state changes when the browser proves the request is ours:
// the custom header cannot be added cross-site without a CORS preflight, and Origin/Sec-Fetch-Site must match.
export function csrfSafe(request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
  if (request.headers.get('x-requested-with') !== 'fetch') return false;
  const site = request.headers.get('sec-fetch-site');
  if (site && !['same-origin', 'none'].includes(site)) return false;
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return false;
  return true;
}
