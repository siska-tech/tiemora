// What a garment is doing over time, as staff read it: a rental and the care after it are separate
// segments, so "back, but not yet ready" is visible at a glance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {itemSegments, daySummaries, productDays, nextAvailable, currentSegment, bookingSegments} from '../../core/inventory/timeline.mjs';

const overnight = {strategy: 'overnight', returnCutoff: '20:00', readyNextDayAt: '07:00'};
const window7 = {from: '2026-09-24T00:00', until: '2026-10-01T00:00', now: '2026-09-24T09:00', turnaround: overnight, fitting: {minutes: 30}};
const rental = extra => ({id: 'rsv-1', customer_name: 'Mai', status: 'confirmed', purpose: 'rental', start_date: '2026-09-24', end_date: '2026-09-25', start_time: '19:00', rental_days: 1, returned_at: '', start_at: '2026-09-24T19:00', ready_at: '2026-09-26T07:00', ...extra});
const shape = segments => segments.map(({kind, start, end}) => [kind, start, end]);

test('a rental is followed by its own care window, and only then is the garment free', () => {
  const segments = itemSegments({id: 'a-01', status: 'available'}, [rental()], window7);
  assert.deepEqual(shape(segments), [
    ['past', '2026-09-24T00:00', '2026-09-24T09:00'],
    ['available', '2026-09-24T09:00', '2026-09-24T19:00'],
    ['reserved', '2026-09-24T19:00', '2026-09-25T19:00'],
    ['cleaning', '2026-09-25T19:00', '2026-09-26T07:00'],
    ['available', '2026-09-26T07:00', '2026-10-01T00:00']
  ]);
  const held = segments[2].reservation;
  assert.equal(held.customer_name, 'Mai');
  assert.equal(held.due, '2026-09-25T19:00');
  assert.equal(held.ready, '2026-09-26T07:00');
  assert.equal(segments[3].reservation, held, 'the care window says which rental it follows');
});

test('handed over, it reads as rented; returned early, the care window starts from the real return', () => {
  assert.equal(itemSegments({id: 'a-01', status: 'rented'}, [rental({status: 'rented', start_at: '2026-09-23T19:00', start_date: '2026-09-23'})], window7)
    .find(segment => segment.reservation)?.kind, 'rented');
  // Back at 10:00 the next morning: washed that night, ready the morning after.
  const back = rental({status: 'returned', start_at: '2026-09-23T19:00', start_date: '2026-09-23', returned_at: '2026-09-24T08:00', ready_at: '2026-09-25T07:00'});
  assert.deepEqual(shape(itemSegments({id: 'a-01', status: 'available'}, [back], window7)), [
    ['returned', '2026-09-24T00:00', '2026-09-24T08:00'],
    ['cleaning', '2026-09-24T08:00', '2026-09-25T07:00'],
    ['available', '2026-09-25T07:00', '2026-10-01T00:00']
  ]);
});

test('a rental still out after it fell due is rented until now, and cared for from now', () => {
  const late = rental({status: 'rented', start_at: '2026-09-22T19:00', start_date: '2026-09-22', ready_at: '2026-09-24T07:00'});
  const [held, care] = bookingSegments(late, window7);
  assert.equal(held.kind, 'rented');
  assert.equal(held.end, '2026-09-24T09:00');
  assert.equal(held.reservation.overdue, true);
  assert.deepEqual([care.kind, care.start, care.end], ['cleaning', '2026-09-24T09:00', '2026-09-25T07:00']);
  const segments = itemSegments({id: 'a-01', status: 'rented'}, [late], window7);
  assert.equal(currentSegment(segments, window7.now).kind, 'cleaning');
  assert.equal(nextAvailable(segments, window7.now), '2026-09-25T07:00');
});

test('a fitting holds the garment for the appointment only, and is told apart from a rental', () => {
  const fitting = {id: 'rsv-2', customer_name: 'Lan', status: 'confirmed', purpose: 'fitting', start_date: '2026-09-25', end_date: '2026-09-25', start_time: '10:00', rental_days: 0, start_at: '2026-09-25T10:00', ready_at: '2026-09-25T10:30'};
  const segments = itemSegments({id: 'a-01', status: 'available'}, [fitting], window7);
  const held = segments.find(segment => segment.kind === 'fitting');
  assert.deepEqual([held.start, held.end], ['2026-09-25T10:00', '2026-09-25T10:30']);
  assert.equal(held.reservation.purpose, 'fitting');
  const day = daySummaries(segments, {from: '2026-09-24', days: 7})[1];
  assert.equal(day.state, 'fitting');
  assert.equal(day.full, false, 'the rest of the day is still free');
  assert.equal(day.free, 1410);
});

test('a booking from before rentals had times blocks whole days, with no care window invented', () => {
  const legacy = {id: 'rsv-3', customer_name: 'Hoa', status: 'confirmed', purpose: 'rental', start_date: '2026-09-25', end_date: '2026-09-26', start_time: '', rental_days: 0, start_at: '', ready_at: ''};
  const segments = itemSegments({id: 'a-01', status: 'available'}, [legacy], window7);
  assert.deepEqual(shape(segments.filter(segment => segment.reservation)), [['reserved', '2026-09-25T00:00', '2026-09-27T00:00']]);
  assert.ok(!segments.some(segment => segment.kind === 'cleaning'));
});

test('maintenance and retired pieces are never shown as free; a piece marked "in care" is ready by the turnaround', () => {
  assert.deepEqual(shape(itemSegments({id: 'a-01', status: 'maintenance'}, [], window7)), [['maintenance', '2026-09-24T00:00', '2026-10-01T00:00']]);
  assert.deepEqual(shape(itemSegments({id: 'a-01', status: 'inactive'}, [], window7)), [['blocked', '2026-09-24T00:00', '2026-10-01T00:00']]);
  const cleaning = itemSegments({id: 'a-01', status: 'cleaning'}, [], window7);
  assert.deepEqual(shape(cleaning).slice(1, 3), [['cleaning', '2026-09-24T09:00', '2026-09-25T07:00'], ['available', '2026-09-25T07:00', '2026-10-01T00:00']]);
  // Without a turnaround policy it is shown in care for the rest of today.
  const plain = itemSegments({id: 'a-01', status: 'cleaning'}, [], {...window7, turnaround: {}});
  assert.equal(plain.find(segment => segment.kind === 'cleaning').end, '2026-09-25T00:00');
});

test('a returned rental\'s care window gives way to the next booking', () => {
  const back = rental({status: 'returned', start_at: '2026-09-23T19:00', start_date: '2026-09-23', returned_at: '2026-09-24T08:00', ready_at: '2026-09-25T07:00'});
  const next = rental({id: 'rsv-4', customer_name: 'Thu', start_at: '2026-09-24T19:00', start_date: '2026-09-24', ready_at: '2026-09-26T07:00'});
  const segments = itemSegments({id: 'a-01', status: 'available'}, [next, back], window7);
  assert.deepEqual(shape(segments).slice(0, 3), [
    ['returned', '2026-09-24T00:00', '2026-09-24T08:00'],
    ['cleaning', '2026-09-24T08:00', '2026-09-24T19:00'],
    ['reserved', '2026-09-24T19:00', '2026-09-25T19:00']
  ]);
  // Segments never overlap and cover the whole window.
  for (let n = 1; n < segments.length; n++) assert.equal(segments[n].start, segments[n - 1].end);
  assert.equal(segments.at(-1).end, window7.until);
});

test('each day says what took most of it, when the garment is ready, and how much is still free', () => {
  const days = daySummaries(itemSegments({id: 'a-01', status: 'available'}, [rental()], window7), {from: '2026-09-24', days: 7});
  assert.equal(days.length, 7);
  // A day with any hold shows that hold, however short; how much is still free is told separately.
  assert.deepEqual(days.map(day => day.state), ['reserved', 'reserved', 'cleaning', 'available', 'available', 'available', 'available']);
  // 24 Sep: past until 09:00, free until 19:00, then booked -- free for part of the day.
  assert.equal(days[0].free, 600);
  assert.equal(days[0].full, false);
  // 25 Sep: booked until 19:00, then in care; 26 Sep: in care until 07:00, then free.
  assert.deepEqual(days[1].parts.map(part => part.kind), ['reserved', 'cleaning']);
  assert.equal(days[1].parts[0].reservation_id, 'rsv-1');
  assert.equal(days[2].ready, '2026-09-26T07:00');
  assert.equal(days[2].free, 17 * 60);
  assert.equal(days[3].full, true);
});

test('per product, each day counts the pieces free all day and those free for part of it', () => {
  const summarise = (status, bookings) => ({days: daySummaries(itemSegments({id: 'x', status}, bookings, window7), {from: '2026-09-24', days: 7})});
  const days = productDays([summarise('available', [rental()]), summarise('available', []), summarise('maintenance', []), summarise('inactive', [])]);
  assert.equal(days.length, 7);
  assert.deepEqual(days[1], {date: '2026-09-25', total: 3, free: 1, partial: 0});
  assert.deepEqual(days[2], {date: '2026-09-26', total: 3, free: 1, partial: 1});
  assert.deepEqual(days[3], {date: '2026-09-27', total: 3, free: 2, partial: 0});
  assert.deepEqual(productDays([]), []);
});
