// Small helpers shared by the API handlers: JSON responses, input validation, encoding.

export class HttpError extends Error {
  constructor(status, error, message, extra) {
    super(message);
    this.status = status;
    this.error = error;
    this.extra = extra;
  }
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers}
  });
}
export const badRequest = (message, fields) => new HttpError(400, 'validation_error', message, fields ? {fields} : undefined);
export const notFound = (message = 'Not found.') => new HttpError(404, 'not_found', message);

// Calendar helpers live in core/booking/dates.mjs; re-exported so handlers import one module.
export {ISO_DATE, isIsoDate, shiftDate, todayIn} from '../core/booking/dates.mjs';
import {isIsoDate} from '../core/booking/dates.mjs';
import {ID_PATTERN} from '../core/inventory/statuses.mjs';
export {ID_PATTERN};
export function requireDateRange(from, to) {
  if (!isIsoDate(from)) throw badRequest('from must be a date in YYYY-MM-DD format.', {from: 'invalid'});
  if (!isIsoDate(to)) throw badRequest('to must be a date in YYYY-MM-DD format.', {to: 'invalid'});
  if (from > to) throw badRequest('from must not be after to.', {to: 'before_from'});
  return {from, to};
}

export function requireId(value, field, max = 64) {
  if (typeof value !== 'string' || !ID_PATTERN.test(value) || value.length > max) {
    throw badRequest(`${field} must use lowercase letters, digits and single hyphens (max ${max} characters).`, {[field]: 'invalid'});
  }
  return value;
}
export function optionalText(value, field, max = 500) {
  if (value == null) return '';
  if (typeof value !== 'string') throw badRequest(`${field} must be text.`, {[field]: 'invalid'});
  const text = value.trim();
  if (text.length > max) throw badRequest(`${field} must be at most ${max} characters.`, {[field]: 'too_long'});
  return text;
}
export function requireText(value, field, max = 200) {
  const text = optionalText(value, field, max);
  if (!text) throw badRequest(`${field} is required.`, {[field]: 'required'});
  return text;
}
export function requireEnum(value, field, allowed, fallback) {
  if (value == null && fallback !== undefined) return fallback;
  if (typeof value !== 'string' || !allowed.includes(value)) throw badRequest(`${field} must be one of: ${allowed.join(', ')}.`, {[field]: 'invalid'});
  return value;
}

const MAX_BODY = 64 * 1024;
export async function readJson(request) {
  if (!/^application\/json\b/i.test(request.headers.get('content-type') || '')) throw new HttpError(415, 'unsupported_media_type', 'Send JSON with Content-Type: application/json.');
  const text = await request.text();
  if (text.length > MAX_BODY) throw new HttpError(413, 'payload_too_large', 'Request body is too large.');
  let data;
  try { data = text ? JSON.parse(text) : {}; }
  catch { throw badRequest('Request body is not valid JSON.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw badRequest('Request body must be a JSON object.');
  return data;
}

export function timingSafeEqual(a, b) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}
export const base64url = {
  encode: bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  decode: text => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=')), c => c.charCodeAt(0))
};
