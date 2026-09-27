// The three things that decide when a rental can be collected, kept apart: the garment being free,
// the garment being ready after its last outing, and somebody being there to hand it over.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dueAt, readyAt, occupiedInterval, intervalsOverlap,
  handoffWindows, withinHandoff, slotTimes, dayTimeline,
  rentalDaysError, pickupError, addMinutes, addRentalDays, isIsoDateTime, padInterval
} from '../../core/booking/schedule.mjs';

const weekly = {
  // 2026-10-20 is a Tuesday.
  1: [{start: '07:00', end: '08:30'}, {start: '18:30', end: '21:00'}],
  2: [{start: '07:00', end: '08:30'}, {start: '18:30', end: '21:00'}],
  3: [{start: '07:00', end: '08:30'}, {start: '18:30', end: '21:00'}],
  4: [{start: '07:00', end: '08:30'}, {start: '18:30', end: '21:00'}],
  5: [{start: '07:00', end: '08:30'}, {start: '18:30', end: '21:00'}]
};
const overnight = {strategy: 'overnight', returnCutoff: '20:00', readyNextDayAt: '07:00'};

test('a rental day is 24 hours: the same clock time, that many days on', () => {
  assert.equal(dueAt('2026-10-20T16:00', 1), '2026-10-21T16:00');
  assert.equal(dueAt('2026-10-20T16:00', 2), '2026-10-22T16:00');
  assert.equal(dueAt('2026-10-20T19:00', 2), '2026-10-22T19:00');
  // A month boundary is still just the next day.
  assert.equal(dueAt('2026-10-31T09:30', 1), '2026-11-01T09:30');
  assert.equal(addRentalDays('2026-12-31T23:30', 1), '2027-01-01T23:30');
  assert.equal(addMinutes('2026-10-20T23:30', 90), '2026-10-21T01:00');
  assert.ok(isIsoDateTime('2026-10-20T16:00'));
  assert.ok(!isIsoDateTime('2026-02-30T16:00'));
});

test('turnaround: none frees the item at once, hours counts real hours, overnight waits for the morning', () => {
  assert.equal(readyAt('2026-10-22T19:00', {strategy: 'none'}), '2026-10-22T19:00');
  assert.equal(readyAt('2026-10-22T19:00', {strategy: 'hours', hours: 6}), '2026-10-23T01:00');
  // Back before the cutoff: washed that night, out again the next morning.
  assert.equal(readyAt('2026-10-22T19:00', overnight), '2026-10-23T07:00');
  assert.equal(readyAt('2026-10-22T20:00', overnight), '2026-10-23T07:00');
  // Back after it: the wash waits for the following night.
  assert.equal(readyAt('2026-10-22T21:00', overnight), '2026-10-24T07:00');
});

test('a booking holds its item from collection until it is ready again', () => {
  const booking = {start_at: '2026-10-20T19:00', rental_days: 2};
  const held = occupiedInterval(booking, {turnaround: overnight});
  assert.deepEqual(held, {start: '2026-10-20T19:00', ready: '2026-10-23T07:00'});
  // The next rental may start the moment the last one is ready, and not a minute before.
  assert.ok(intervalsOverlap(held, {start: '2026-10-23T06:30', ready: '2026-10-24T07:00'}));
  assert.ok(!intervalsOverlap(held, {start: '2026-10-23T07:00', ready: '2026-10-24T07:00'}));
  // An actual return earlier than the deadline frees the item earlier.
  const early = occupiedInterval({...booking, returned_at: '2026-10-22T09:00'}, {turnaround: overnight});
  assert.equal(early.ready, '2026-10-23T07:00');
  // A booking written before rentals carried a time of day holds the same whole days it always
  // did: no care window is invented for it, so the upgrade never widens what it blocked.
  const legacy = occupiedInterval({start_date: '2026-10-20', end_date: '2026-10-22'}, {turnaround: overnight});
  assert.deepEqual(legacy, {start: '2026-10-20T00:00', ready: '2026-10-23T00:00'});
  // The buffer of free days widens only the interval being asked for, so the gap between two
  // bookings is the buffer rather than twice it.
  assert.deepEqual(padInterval(held, 1), {start: '2026-10-19T19:00', ready: '2026-10-24T07:00'});
  assert.deepEqual(padInterval(held, 0), held);
});

test('handoff windows come from the week, and a single date overrides it', () => {
  const exceptions = {
    '2026-10-23': {windows: [{start: '09:00', end: '21:00'}]},
    '2026-10-28': {closed: true}
  };
  assert.deepEqual(handoffWindows('2026-10-20', {weekly}, exceptions), weekly[2]);
  // A day off work: longer hours, not the usual ones.
  assert.deepEqual(handoffWindows('2026-10-23', {weekly}, exceptions), [{start: '09:00', end: '21:00'}]);
  // Away all day.
  assert.deepEqual(handoffWindows('2026-10-28', {weekly}, exceptions), []);
  // The weekend is not in the weekly schedule at all.
  assert.deepEqual(handoffWindows('2026-10-24', {weekly}, {}), []);
  // A store that never wrote any hours down is taken as always available.
  assert.equal(handoffWindows('2026-10-20', {}, {}), null);
  assert.ok(withinHandoff('03:00', null));
  assert.ok(withinHandoff('18:30', weekly[2]));
  assert.ok(!withinHandoff('12:00', weekly[2]));
  // The closing edge is already too late to collect.
  assert.ok(!withinHandoff('21:00', weekly[2]));
  assert.ok(!withinHandoff('09:00', []));
});

test('the offered times follow the store granularity and stay inside the windows', () => {
  assert.deepEqual(slotTimes(weekly[2], {slotMinutes: 30}),
    ['07:00', '07:30', '08:00', '18:30', '19:00', '19:30', '20:00', '20:30']);
  assert.deepEqual(slotTimes([{start: '18:30', end: '21:00'}], {slotMinutes: 60}), ['18:30', '19:30', '20:30']);
  assert.deepEqual(slotTimes([], {slotMinutes: 30}), []);
  // No windows configured: the whole day, so the timeline still has an axis.
  assert.equal(slotTimes(null, {slotMinutes: 60, dayStart: '07:00', dayEnd: '10:00'}).length, 3);
});

const items = [{id: 'a', status: 'available'}, {id: 'b', status: 'available'}];
const timelineOptions = {slotMinutes: 30, handoff: {weekly}, turnaround: overnight, today: '2026-10-01'};

test('display bounds retain closed hours and handoff gaps without exposing physical ids', () => {
  const line = dayTimeline({date: '2026-10-20', days: 2, items, intervals: new Map()}, {
    ...timelineOptions, displayStart: '06:00', displayEnd: '22:00',
    openingHours: {2: [{start: '07:00', end: '21:00'}]}
  });
  assert.equal(line.slots.length, 32);
  assert.equal(line.slots[0].state, 'closed');
  assert.equal(line.slots.at(-1).state, 'closed');
  assert.deepEqual(line.slots.find(s => s.time === '12:00'), {time: '12:00', state: 'handoff', remaining: 2});
  assert.equal(line.slots.find(s => s.time === '18:30').state, 'available');
  assert.ok(line.slots.every(s => Object.keys(s).sort().join() === 'remaining,state,time'));
});

test('care and missing inventory have different reasons, and readiness boundary releases stock', () => {
  const intervals = new Map(items.map(item => [item.id, [{start: '2026-10-18T19:00', end: '2026-10-19T20:00', ready: '2026-10-20T07:00'}]]));
  const options = {displayStart: '06:00', displayEnd: '08:00', turnaround: overnight};
  const line = dayTimeline({date: '2026-10-20', days: 1, items, intervals}, options);
  assert.equal(line.slots[0].state, 'maintenance');
  assert.equal(line.slots[2].state, 'available');
  assert.equal(line.slots[2].remaining, 2);
  assert.equal(dayTimeline({date: '2026-10-20', days: 1, items: [], intervals: new Map()}, options).slots[0].state, 'none');
});

test('empty weekly windows and an empty date override both mean no handoff', () => {
  assert.deepEqual(handoffWindows('2026-10-20', {weekly: {2: []}}), []);
  assert.deepEqual(handoffWindows('2026-10-20', {weekly}, {'2026-10-20': {windows: []}}), []);
});

test('the timeline marks every reason a time cannot be picked', () => {
  const line = dayTimeline({date: '2026-10-20', days: 1, items, intervals: new Map()}, timelineOptions);
  const state = time => line.slots.find(slot => slot.time === time);
  assert.equal(line.total, 2);
  assert.equal(state('19:00').state, 'available');
  assert.equal(state('19:00').remaining, 2);
  // Handoff gaps remain visible on the continuous daily axis.
  assert.equal(state('12:00').state, 'handoff');
  assert.equal(line.slots.length, 32);
});

test('a held item takes the time off the line, and the last one left reads as low', () => {
  // Item a is out from the 19th until the morning of the 21st.
  const intervals = new Map([['a', [{start: '2026-10-19T19:00', ready: '2026-10-21T07:00'}]]]);
  const line = dayTimeline({date: '2026-10-20', days: 1, items, intervals}, timelineOptions);
  const state = time => line.slots.find(slot => slot.time === time);
  assert.equal(state('19:00').state, 'low');
  assert.equal(state('19:00').remaining, 1);
  // Both out: nothing to collect.
  const bothOut = new Map([
    ['a', [{start: '2026-10-19T19:00', ready: '2026-10-21T07:00'}]],
    ['b', [{start: '2026-10-19T19:00', ready: '2026-10-21T07:00'}]]
  ]);
  assert.equal(dayTimeline({date: '2026-10-20', days: 1, items, intervals: bothOut}, timelineOptions)
    .slots.find(s => s.time === '19:00').state, 'none');
});

test('a garment back last night is out again this morning, but not before it is dry', () => {
  // Returned 2026-10-19 at 19:00, washed overnight, ready at 07:00 on the 20th.
  const intervals = new Map([
    ['a', [{start: '2026-10-18T19:00', ready: '2026-10-20T07:00'}]],
    ['b', [{start: '2026-10-18T19:00', ready: '2026-10-20T07:00'}]]
  ]);
  const line = dayTimeline({date: '2026-10-20', days: 1, items, intervals}, timelineOptions);
  const state = time => line.slots.find(slot => slot.time === line.slots.find(s => s.time === time)?.time);
  assert.equal(state('07:00').state, 'available', 'ready exactly at 07:00');
  assert.equal(state('07:00').remaining, 2);
});

test('items in maintenance take the product off the line entirely', () => {
  const broken = [{id: 'a', status: 'maintenance'}, {id: 'b', status: 'inactive'}];
  const line = dayTimeline({date: '2026-10-20', days: 1, items: broken, intervals: new Map()},
    {...timelineOptions, blocked: ['maintenance', 'inactive']});
  assert.equal(line.total, 0);
  assert.equal(line.slots.find(s => s.time === '19:00').state, 'maintenance');
});

test('times already gone are not on offer', () => {
  const line = dayTimeline({date: '2026-10-20', days: 1, items, intervals: new Map()},
    {...timelineOptions, today: '2026-10-20', now: '19:15'});
  assert.equal(line.slots.find(s => s.time === '19:00').state, 'past');
  assert.equal(line.slots.find(s => s.time === '19:30').state, 'available');
});

test('a longer rental has to clear every night it covers', () => {
  // Item a is spoken for on the 22nd; a two-day rental from the 20th runs into it.
  const intervals = new Map([
    ['a', [{start: '2026-10-22T07:00', ready: '2026-10-23T07:00'}]],
    ['b', [{start: '2026-10-22T07:00', ready: '2026-10-23T07:00'}]]
  ]);
  const options = {...timelineOptions, handoff: {weekly}};
  assert.equal(dayTimeline({date: '2026-10-20', days: 1, items, intervals}, options)
    .slots.find(s => s.time === '19:00').state, 'available');
  assert.equal(dayTimeline({date: '2026-10-20', days: 2, items, intervals}, options)
    .slots.find(s => s.time === '19:00').state, 'none');
});

test('what a customer may ask for', () => {
  assert.equal(rentalDaysError(1, {maxRentalDays: 60}), null);
  assert.deepEqual(rentalDaysError(0, {}), {field: 'rental_days', code: 'invalid'});
  assert.deepEqual(rentalDaysError(1.5, {}), {field: 'rental_days', code: 'invalid'});
  assert.deepEqual(rentalDaysError(61, {maxRentalDays: 60}), {field: 'rental_days', code: 'too_long'});
  assert.equal(pickupError('2026-10-20T19:00', {today: '2026-10-01', maxDaysAhead: 365}), null);
  assert.deepEqual(pickupError('nonsense', {}), {field: 'start_time', code: 'invalid'});
  assert.deepEqual(pickupError('2026-09-30T19:00', {today: '2026-10-01'}), {field: 'start_date', code: 'past'});
  assert.deepEqual(pickupError('2026-10-01T08:00', {today: '2026-10-01', now: '09:00'}), {field: 'start_time', code: 'past'});
  assert.deepEqual(pickupError('2027-12-01T08:00', {today: '2026-10-01', maxDaysAhead: 30}), {field: 'start_date', code: 'too_far'});
});
