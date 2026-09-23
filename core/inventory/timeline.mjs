// What one physical garment is doing over a stretch of time, as consecutive segments staff can read
// at a glance: with a customer, held for one, back but still being cared for, free. The booking
// rules decide what may be booked (core/booking/schedule.mjs); this module only describes it.
//
// A rental and the care after it are two segments, not one: a garment that is back is not yet a
// garment that can go out again, and "returned but still being washed" is exactly what staff need
// to see. Moments are store-local "YYYY-MM-DDTHH:MM" strings, as everywhere else.
import {shiftDate} from '../booking/dates.mjs';
import {at, dateOf, dueAt, readyAt, isIsoDateTime, isFitting, occupiedInterval} from '../booking/schedule.mjs';

// Ordered roughly from "with a customer" to "on the shelf". `returned` is a finished rental's time
// with the customer, kept so the care window after it has a reason; `past` is free time already gone.
export const SEGMENT_KINDS = ['rented', 'reserved', 'fitting', 'returned', 'cleaning', 'maintenance', 'blocked', 'available', 'past'];
// Kinds that hold the garment. Everything else is either free or behind us.
const HOLDING = new Set(['rented', 'reserved', 'fitting', 'returned', 'cleaning', 'maintenance', 'blocked']);

const minutesBetween = (a, b) => Math.round((Date.parse(b + ':00Z') - Date.parse(a + ':00Z')) / 60000);
const later = (a, b) => (a > b ? a : b);
const earlier = (a, b) => (a < b ? a : b);

// A booking row as the repository reads it, turned into the segments it causes on its item: the
// time with (or reserved for) the customer, then the care window until the garment is ready again.
/** @param {any} booking @param {{now: string, turnaround?: any, fitting?: any}} options */
export function bookingSegments(booking, {now, turnaround = {}, fitting = {}}) {
  const interval = occupiedInterval(booking, {turnaround, fitting});
  const details = {
    id: booking.id, customer_name: booking.customer_name || '', status: booking.status,
    purpose: booking.purpose || 'rental', note: booking.note || '', start: interval.start
  };
  if (isFitting(booking.purpose)) {
    return [{kind: 'fitting', start: interval.start, end: interval.ready, reservation: {...details, due: interval.ready, returned: '', ready: interval.ready, overdue: false}}];
  }
  const usage = booking.status === 'rented' ? 'rented' : booking.status === 'returned' ? 'returned' : 'reserved';
  // A booking from before rentals ran on the clock blocks whole days and has no care window of its own.
  const timed = booking.rental_days > 0 && isIsoDateTime(interval.start);
  if (!timed) {
    return [{kind: usage, start: interval.start, end: interval.ready, reservation: {...details, due: interval.ready, returned: booking.returned_at || '', ready: interval.ready, overdue: false}}];
  }
  const due = dueAt(interval.start, booking.rental_days);
  const returned = isIsoDateTime(booking.returned_at) ? booking.returned_at : '';
  // Still out after it fell due: it is with the customer until now at least, and its care can only
  // start once it is back, so the care window is drawn from now rather than from the due moment.
  const overdue = booking.status === 'rented' && !returned && due < now;
  const back = returned || (overdue ? now : due);
  const ready = overdue ? later(readyAt(back, turnaround), interval.ready) : interval.ready;
  const reservation = {...details, due, returned, ready, overdue};
  const segments = [{kind: usage, start: interval.start, end: back, reservation}];
  if (ready > back) segments.push({kind: 'cleaning', start: back, end: ready, reservation});
  return segments;
}

// Every segment of one item across [from, until), gaps filled with what the item is when nobody
// holds it: free, under maintenance, or out of service altogether.
/**
 * @param {{id: string, status: string}} item
 * @param {any[]} bookings rows for this item, any order
 * @param {{from: string, until: string, now: string, turnaround?: any, fitting?: any}} options
 */
export function itemSegments(item, bookings, {from, until, now, turnaround = {}, fitting = {}}) {
  let held = bookings.flatMap(booking => bookingSegments(booking, {now, turnaround, fitting}))
    .filter(segment => segment.end > from && segment.start < until && segment.end > segment.start)
    .sort((a, b) => a.start.localeCompare(b.start) || SEGMENT_KINDS.indexOf(a.kind) - SEGMENT_KINDS.indexOf(b.kind));
  // An item staff marked as being cared for, with no booking explaining it: from now until the
  // store's turnaround would have it ready, or the end of today when the store has none.
  if (item.status === 'cleaning' && !held.some(segment => segment.kind === 'cleaning' && segment.start <= now && segment.end > now)) {
    const ready = readyAt(now, turnaround);
    held.push({kind: 'cleaning', start: now, end: ready > now ? ready : at(shiftDate(dateOf(now), 1), '00:00'), reservation: null});
    held.sort((a, b) => a.start.localeCompare(b.start));
  }
  // Bookings never overlap each other, but one made before care windows held stock (or a rental
  // returned later than planned) may run into the next: the next booking wins, the care is cut short.
  const resolved = [];
  for (const segment of held) {
    const last = resolved[resolved.length - 1];
    if (last && segment.start < last.end) {
      if (['cleaning', 'returned'].includes(last.kind) && !['cleaning', 'returned'].includes(segment.kind)) {
        last.end = segment.start;
        if (last.end <= last.start) resolved.pop();
      } else {
        const clipped = {...segment, start: last.end};
        if (clipped.end > clipped.start) resolved.push(clipped);
        continue;
      }
    }
    resolved.push({...segment});
  }
  const base = item.status === 'maintenance' ? 'maintenance' : item.status === 'inactive' ? 'blocked' : 'available';
  const segments = [];
  const fill = (start, end) => {
    if (end <= start) return;
    // Free time that has already gone by is of no use to anybody; it is drawn, but quietly.
    if (base === 'available' && start < now) {
      segments.push({kind: 'past', start, end: earlier(end, now), reservation: null});
      if (end > now) segments.push({kind: 'available', start: now, end, reservation: null});
      return;
    }
    segments.push({kind: base, start, end, reservation: null});
  };
  let cursor = from;
  for (const segment of resolved) {
    const start = later(segment.start, from), end = earlier(segment.end, until);
    fill(cursor, start);
    segments.push({...segment, start, end});
    cursor = end;
  }
  fill(cursor, until);
  return segments;
}

/** The moment the item is next free to go out, or '' when it never is within the window. */
export function nextAvailable(segments, now) {
  const free = segments.find(segment => segment.kind === 'available' && segment.end > now);
  return free ? later(free.start, now) : '';
}
/** The segment covering `now`, or null outside the window. */
export const currentSegment = (segments, now) => segments.find(segment => segment.start <= now && segment.end > now) || null;

// One calendar day of an item, summarised for a compact strip: of whatever held the garment that
// day, the kind that held it longest (a day with a booking reads as booked, however short); how
// many minutes are still free; and the pieces themselves so the page can draw and name them.
/** @param {any[]} segments @param {{from: string, days: number}} range */
export function daySummaries(segments, {from, days}) {
  return Array.from({length: days}, (_, n) => {
    const date = shiftDate(from, n);
    const start = at(date, '00:00'), end = at(shiftDate(date, 1), '00:00');
    const parts = segments
      .filter(segment => segment.end > start && segment.start < end)
      .map(segment => ({kind: segment.kind, start: later(segment.start, start), end: earlier(segment.end, end), reservation_id: segment.reservation?.id || ''}));
    const minutes = new Map();
    for (const part of parts) minutes.set(part.kind, (minutes.get(part.kind) || 0) + minutesBetween(part.start, part.end));
    const free = minutes.get('available') || 0;
    let state = free ? 'available' : 'past';
    let most = 0;
    for (const [kind, total] of minutes) if (HOLDING.has(kind) && total > most) { state = kind; most = total; }
    // When the care window finishes during this day, that is the moment staff ask about.
    const ready = parts.find(part => part.kind === 'cleaning' && part.end < end && part.end > start)?.end || '';
    return {date, state, free, full: free > 0 && free + (minutes.get('past') || 0) >= 1440, ready, parts};
  });
}

// How many pieces of one product (and size) are free each day: wholly free, and free for part of
// it. What staff scan to see which designs are tight this week.
/** @param {{days: {date: string, state: string, free: number, full: boolean}[]}[]} items */
export function productDays(items) {
  const length = items[0]?.days.length || 0;
  return Array.from({length}, (_, n) => {
    const days = items.map(item => item.days[n]);
    return {
      date: days[0].date,
      total: days.filter(day => day.state !== 'blocked').length,
      free: days.filter(day => day.full).length,
      partial: days.filter(day => day.free > 0 && !day.full).length
    };
  });
}
