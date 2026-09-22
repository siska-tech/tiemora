// Calendar-day helpers. Bookings are inclusive ranges of ISO dates (YYYY-MM-DD) in the store's
// own time zone; nothing here carries a time of day.
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Accepts only real calendar days: 2026-02-30 round-trips to 2026-03-02 and is rejected.
export function isIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function shiftDate(isoDate, days) {
  const date = new Date(isoDate + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
// Today's calendar date in the store's time zone (servers run in UTC).
export function todayIn(timeZone = 'Asia/Ho_Chi_Minh', now = new Date()) {
  try { return new Intl.DateTimeFormat('en-CA', {timeZone, year: 'numeric', month: '2-digit', day: '2-digit'}).format(now); }
  catch { return now.toISOString().slice(0, 10); }
}
// The period a booking blocks once the store's buffer of free days is added on both sides.
export function paddedPeriod(from, to, buffer = 0) {
  return {start: shiftDate(from, -buffer), end: shiftDate(to, buffer)};
}
// Inclusive calendar overlap, the one rule every availability answer is built on.
export function periodsOverlap(a, b) {
  return a.start <= b.end && a.end >= b.start;
}
