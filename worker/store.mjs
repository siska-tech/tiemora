// The store configuration (config/store.yaml) is published by the build as /store.json. The Worker
// reads it through the static-assets binding, exactly like catalog.json, so name, languages, contact
// links and booking limits exist in one place. Environment variables override the few values an
// operator may want to change without a rebuild (RESERVATION_BUFFER_DAYS, STORE_TIMEZONE).
import {normalizeStoreConfig} from '../core/config/store.mjs';
import {todayIn, timeIn} from '../core/booking/dates.mjs';

const TTL = 60000;
let cache = {origin: '', config: null, fetchedAt: 0};

export async function loadStore(env, request) {
  const origin = new URL(request.url).origin;
  if (cache.origin === origin && cache.config && Date.now() - cache.fetchedAt < TTL) return cache.config;
  let raw = {};
  try {
    const response = await env.ASSETS.fetch(new Request(origin + '/store.json'));
    // A missing file (or a non-JSON answer from a misconfigured asset route) means defaults, not an error.
    if (response.ok && /json/i.test(response.headers.get('content-type') || '')) raw = await response.json();
  } catch (error) { console.warn('store.json unavailable, using defaults:', error); }
  const {config} = normalizeStoreConfig(raw, {warn: () => {}});
  cache = {origin, config, fetchedAt: Date.now()};
  return config;
}
export function resetStoreCache() { cache = {origin: '', config: null, fetchedAt: 0}; }

function envInt(value) {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
// What every booking handler needs: today's date in the store's zone and the booking limits.
export function bookingContext(env, store) {
  const timezone = env.STORE_TIMEZONE || store.timezone;
  return {
    today: todayIn(timezone),
    now: timeIn(timezone),
    timezone,
    buffer: envInt(env.RESERVATION_BUFFER_DAYS) ?? store.booking.bufferDays,
    maxRentalDays: store.booking.maxRentalDays,
    maxDaysAhead: store.booking.maxDaysAhead,
    timeSlots: store.booking.timeSlots,
    slotMinutes: store.booking.slotMinutes,
    displayStart: store.booking.displayStart, displayEnd: store.booking.displayEnd,
    openingHours: store.booking.openingHours,
    handoff: store.booking.handoff,
    turnaround: store.booking.turnaround,
    fitting: store.booking.fitting
  };
}
