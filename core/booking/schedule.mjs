// When a rental actually runs, hour by hour. Three things decide whether a customer may collect a
// garment at a given moment, and they are deliberately kept apart:
//
//   inventory availability  a physical item is not held by another rental
//   item readiness          the previous rental is back AND its care window has passed
//   handoff availability    somebody is at the shop to hand it over
//
// The bookable moments are the intersection of all three. Nothing here knows that a dress shop launders
// overnight: that is a store's turnaround policy, read from its configuration.
//
// Times are store-local wall clock. A date is "YYYY-MM-DD", a time "HH:MM" and a moment
// "YYYY-MM-DDTHH:MM", so all three sort and compare as plain strings. A rental day is the same clock
// time on the next day, which is what "24 hours" means to a shop and stays true across a DST change.
import {ISO_DATE, isIsoDate, shiftDate} from './dates.mjs';

export const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;
export const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isTimeOfDay = value => typeof value === 'string' && TIME_OF_DAY.test(value);
export function isIsoDateTime(value) {
  return typeof value === 'string' && ISO_DATETIME.test(value) && isIsoDate(value.slice(0, 10));
}

export const at = (date, time) => `${date}T${time}`;
export const dateOf = moment => String(moment).slice(0, 10);
export const timeOf = moment => String(moment).slice(11, 16);
export const minutesOfDay = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
export const timeFromMinutes = minutes => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** Real minute arithmetic, for care windows measured in hours. */
export function addMinutes(moment, minutes) {
  const date = new Date(moment + ':00Z');
  date.setUTCMinutes(date.getUTCMinutes() + minutes);
  return date.toISOString().slice(0, 16);
}
/** A rental day: the same clock time, `days` days later. */
export const addRentalDays = (moment, days) => at(shiftDate(dateOf(moment), days), timeOf(moment));

/** 0 = Sunday, matching `ordering.openingHours` and `Date#getUTCDay`. */
export const weekdayOf = date => new Date(date + 'T00:00:00Z').getUTCDay();

// A visit is either a rental -- whole 24-hour days -- or a fitting: come at an agreed time, try the
// garment on, hand it straight back. Both hold one physical piece; they differ in for how long and
// in whether anything is charged.
export const PURPOSES = ['rental', 'fitting'];
export const isFitting = purpose => purpose === 'fitting';

// --- The rental itself -----------------------------------------------------------------------------

/** When the garment is due back: the pick-up moment plus whole 24-hour days. */
export const dueAt = (startAt, days) => addRentalDays(startAt, Math.max(1, Number(days) || 1));

// When a garment that came back at `endAt` can go out again. `none` frees it immediately; `hours`
// counts real hours; `overnight` is the shop that launders after closing: back by the cutoff and it
// is ready the next morning, back after it and the wash waits for the following night.
/** @param {string} endAt @param {{strategy?: string, hours?: number, returnCutoff?: string, readyNextDayAt?: string}} [turnaround] */
export function readyAt(endAt, turnaround = {}) {
  if (!isIsoDateTime(endAt)) return endAt;
  const strategy = turnaround?.strategy || 'none';
  if (strategy === 'hours') return addMinutes(endAt, Math.max(0, Number(turnaround.hours) || 0) * 60);
  if (strategy === 'overnight') {
    const cutoff = isTimeOfDay(turnaround.returnCutoff) ? turnaround.returnCutoff : '20:00';
    const ready = isTimeOfDay(turnaround.readyNextDayAt) ? turnaround.readyNextDayAt : '07:00';
    return at(shiftDate(dateOf(endAt), timeOf(endAt) <= cutoff ? 1 : 2), ready);
  }
  return endAt;
}

// The stretch of time one booking keeps its item out of circulation: from collection until it is
// ready again, plus the store's buffer of free days. Half-open, so one rental's ready moment and the
// next one's pick-up may be the same instant.
/** @param {{start_at?: string, ready_at?: string, start_date?: string, end_date?: string, start_time?: string, rental_days?: number, returned_at?: string, purpose?: string}} booking */
export function occupiedInterval(booking, {turnaround = {}, fitting = {}} = {}) {
  const startAt = isIsoDateTime(booking.start_at) ? booking.start_at : at(booking.start_date, booking.start_time || '00:00');
  // A fitting is measured in minutes, so it never carries a count of days and has to be recognised
  // before the day-based branches below would read it as a whole-day booking.
  if (isFitting(booking.purpose) && isIsoDateTime(startAt)) {
    return isIsoDateTime(booking.ready_at) ? {start: startAt, ready: booking.ready_at} : visitSpan(startAt, {purpose: booking.purpose, fitting});
  }
  // A booking written before rentals carried a time of day holds whole calendar days and nothing
  // more: no care window is invented for it, so upgrading never widens what it already blocked.
  if (!(booking.rental_days > 0) || !isIsoDateTime(startAt)) {
    const endDate = booking.end_date || booking.start_date || dateOf(startAt);
    return {start: at(booking.start_date || dateOf(startAt), '00:00'), ready: at(shiftDate(endDate, 1), '00:00')};
  }
  if (isIsoDateTime(booking.ready_at)) return {start: startAt, ready: booking.ready_at};
  const back = isIsoDateTime(booking.returned_at) ? booking.returned_at : dueAt(startAt, booking.rental_days);
  return {start: startAt, ready: readyAt(back, turnaround)};
}
// The store's buffer of free days between one rental and the next. Only the interval being asked
// for is widened, the way the calendar-day rule padded only the requested period, so the gap
// between two bookings is the buffer and not twice it.
export function padInterval({start, ready}, bufferDays = 0) {
  if (!(bufferDays > 0)) return {start, ready};
  return {start: at(shiftDate(dateOf(start), -bufferDays), timeOf(start)), ready: at(shiftDate(dateOf(ready), bufferDays), timeOf(ready))};
}
// How long one visit keeps a garment, from the moment it is collected until it can go out again.
// A fitting is over when the appointment is, plus whatever time the shop wants before the next one.
/** @param {string} startAt @param {{purpose?: string, days?: number, turnaround?: any, fitting?: any}} [options] */
export function visitSpan(startAt, {purpose = 'rental', days = 1, turnaround = {}, fitting = {}} = {}) {
  if (isFitting(purpose)) {
    const minutes = Math.max(5, Number(fitting.minutes) || 30) + Math.max(0, Number(fitting.bufferMinutes) || 0);
    return {start: startAt, ready: addMinutes(startAt, minutes)};
  }
  return {start: startAt, ready: readyAt(dueAt(startAt, days), turnaround)};
}
/** Half-open overlap: [start, ready) against [start, ready). */
export const intervalsOverlap = (a, b) => a.start < b.ready && a.ready > b.start;

// --- Handoff availability ---------------------------------------------------------------------------

// The windows somebody is at the shop on `date`. `null` means the store never wrote any down, which
// is taken as "any time" so a shop that has not configured this keeps working as it did.
// A single-date exception replaces that day's weekly windows outright: closed all day, or its own.
// A public holiday (handoff.holidayDates, generated at build time) comes next, with its own windows.
/** @param {string} date @param {any} [handoff] @param {any} [exceptions] */
export function handoffWindows(date, handoff = {}, exceptions = {}) {
  const exception = exceptions?.[date];
  if (exception) {
    if (exception.closed) return [];
    if (Array.isArray(exception.windows)) return exception.windows;
  }
  if (handoff?.holidayDates?.includes(date)) return handoff.holidayWindows || [{start: '00:00', end: '24:00'}];
  const weekly = handoff?.weekly || {};
  const configured = Object.keys(weekly).length > 0;
  if (!configured) return null;
  return weekly[weekdayOf(date)] || [];
}
/** `windows` of null means unrestricted. A moment on a window's closing edge is already too late. */
export function withinHandoff(time, windows) {
  if (windows === null) return true;
  return windows.some(window => time >= window.start && time < window.end);
}

// Every clock time the store offers on a date, at its own granularity. Without handoff windows the
// day runs from `dayStart` to `dayEnd` so the timeline still has an axis to draw.
/** @param {{start: string, end: string}[]|null} windows @param {{slotMinutes?: number, dayStart?: string, dayEnd?: string}} [options] */
export function slotTimes(windows, {slotMinutes = 30, dayStart = '00:00', dayEnd = '24:00'} = {}) {
  const step = Math.min(240, Math.max(5, Number(slotMinutes) || 30));
  const spans = windows === null ? [{start: dayStart, end: dayEnd}] : windows;
  const times = new Set();
  for (const span of spans) {
    const end = span.end === '24:00' ? 1440 : minutesOfDay(span.end);
    // Align to the store's own grid so 18:30 with a 30-minute step offers 18:30, not 18:45.
    for (let minute = minutesOfDay(span.start); minute < end; minute += step) times.add(timeFromMinutes(minute));
  }
  return [...times].sort();
}

// --- The timeline a customer reads ------------------------------------------------------------------

export const SLOT_STATES = ['available', 'low', 'none', 'handoff', 'maintenance', 'closed', 'past'];

// One row of the day's axis per offered time, with why it cannot be picked when it cannot. `items`
// are the product's physical pieces; `intervals` maps an item id to the stretches it is already
// spoken for. Counts leave the shop, item ids never do.
/**
 * @param {{date: string, days: number, items: {id: string, status: string}[], intervals: Map<string, {start: string, ready: string, end?: string}[]>}} input
 * @param {{slotMinutes?: number, handoff?: any, exceptions?: any, turnaround?: any, bufferDays?: number, now?: string, today?: string, dayStart?: string, dayEnd?: string, displayStart?: string, displayEnd?: string, openingHours?: any, blocked?: string[], outNow?: string[], purpose?: string, fitting?: any}} [options]
 */
export function dayTimeline({date, days = 1, items = [], intervals = new Map()}, options = {}) {
  const {slotMinutes = 30, handoff = {}, exceptions = {}, turnaround = {}, bufferDays = 0, now = '', today = '', blocked = [], outNow = [], purpose = 'rental', fitting = {}} = options;
  const windows = handoffWindows(date, handoff, exceptions);
  // An item that is physically out of the shop right now is not on offer today whatever the
  // bookings say, but it is free again for a later day.
  const usable = items.filter(item => !blocked.includes(item.status) && !(date === today && outNow.includes(item.status)));
  const displayStart = options.displayStart || options.dayStart || '06:00';
  const displayEnd = options.displayEnd || options.dayEnd || '22:00';
  const times = slotTimes(null, {slotMinutes, dayStart: displayStart, dayEnd: displayEnd});
  const opening = handoffWindows(date, {weekly: options.openingHours || {}}, exceptions);
  const offered = new Set(slotTimes(windows, {slotMinutes, dayStart: displayStart, dayEnd: displayEnd}));
  // Include the actual handoff grid when a window starts between display ticks.
  const visibleTimes = [...new Set([...times, ...[...offered].filter(time => time >= displayStart && time < displayEnd)])].sort();
  const slots = visibleTimes.map(time => {
    const start = at(date, time);
    // A fitting asks for the length of the appointment; a rental asks for whole days and its care
    // window. The buffer of free days is a rental idea and is left out of an appointment.
    const span = visitSpan(start, {purpose, days, turnaround, fitting});
    const wanted = isFitting(purpose) ? span : padInterval(span, bufferDays);
    if (today && (date < today || (date === today && now && time <= now))) return {time, state: 'past', remaining: 0};
    const remaining = usable.filter(item => !(intervals.get(item.id) || []).some(taken => intervalsOverlap(wanted, taken))).length;
    if (!withinHandoff(time, opening) && !exceptions[date]?.closed) return {time, state: 'closed', remaining};
    if (!withinHandoff(time, windows) || !offered.has(time)) return {time, state: 'handoff', remaining};
    if (!remaining) {
      const care = items.some(item => item.status === 'maintenance' || (date === today && item.status === 'cleaning') ||
        (intervals.get(item.id) || []).some(taken => taken.end && taken.end <= start && start < taken.ready));
      return {time, state: care ? 'maintenance' : 'none', remaining: 0};
    }
    return {time, state: remaining === 1 && items.length > 1 ? 'low' : 'available', remaining};
  });
  return {date, days, purpose, slotMinutes, displayStart, displayEnd, windows, total: usable.length, slots};
}

// --- What a customer may ask for ---------------------------------------------------------------------

/** Validation of the rental length. Returns {field, code} or null. */
export function rentalDaysError(days, {maxRentalDays = 60} = {}) {
  if (!Number.isInteger(days) || days < 1) return {field: 'rental_days', code: 'invalid'};
  if (days > maxRentalDays) return {field: 'rental_days', code: 'too_long'};
  return null;
}
/** Validation of the pick-up moment against today and the booking window. Returns {field, code} or null. */
export function pickupError(startAt, {today = '', now = '', maxDaysAhead = 365} = {}) {
  if (!isIsoDateTime(startAt)) return {field: 'start_time', code: 'invalid'};
  const date = dateOf(startAt);
  if (!ISO_DATE.test(date)) return {field: 'start_date', code: 'invalid'};
  if (today && date < today) return {field: 'start_date', code: 'past'};
  if (today && date === today && now && timeOf(startAt) <= now) return {field: 'start_time', code: 'past'};
  if (today && date > shiftDate(today, maxDaysAhead)) return {field: 'start_date', code: 'too_far'};
  return null;
}
