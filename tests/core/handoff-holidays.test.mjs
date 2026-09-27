// Public holidays for the handover hours: listed at build time from the date-holidays calendars, read
// by the timeline as plain dates, and always overridden by a date the store set in the admin.
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeStoreConfig} from '../../core/config/store.mjs';
import {populateHandoffHolidays} from '../../scripts/handoff-holidays.mjs';
import {handoffWindows, withinHandoff} from '../../core/booking/schedule.mjs';

test('Vietnam public holiday dates include every Tet day, exclude observances, and survive Worker normalization', () => {
  const {config} = normalizeStoreConfig({booking: {handoff: {holidayCountry: 'VN', holidayDates: ['2026-09-01']}}});
  populateHandoffHolidays(config, 2026);
  const handoff = normalizeStoreConfig(config).config.booking.handoff;
  for (const date of ['2027-01-01', '2027-02-05', '2027-02-06', '2027-02-07', '2027-02-08', '2027-02-09', '2027-04-16', '2027-04-30', '2027-05-01', '2027-09-02', '2026-09-01']) assert.ok(handoff.holidayDates.includes(date), date);
  assert.ok(!handoff.holidayDates.includes('2027-10-20'), 'observance is not a public holiday');
  assert.equal(handoff.holidayCalendarThrough, '2028-12-31');
});

test('any country date-holidays knows works, and an unknown one keeps only the hand-written dates', () => {
  const {config} = normalizeStoreConfig({booking: {handoff: {holidayCountry: 'JP'}}});
  populateHandoffHolidays(config, 2026);
  assert.ok(config.booking.handoff.holidayDates.includes('2026-11-03'), 'Culture Day');
  const warnings = [];
  const unknown = normalizeStoreConfig({booking: {handoff: {holidayCountry: 'ZZ', holidayDates: ['2026-12-24']}}}).config;
  populateHandoffHolidays(unknown, 2026, {warn: message => warnings.push(message)});
  assert.deepEqual(unknown.booking.handoff.holidayDates, ['2026-12-24']);
  assert.equal(warnings.length, 1);
  // Not a country code at all: the configuration says so and ignores it.
  assert.equal(normalizeStoreConfig({booking: {handoff: {holidayCountry: 'Vietnam'}}}, {warn: () => {}}).warnings.length, 1);
  // Without holidays configured the handoff stays exactly as before.
  assert.deepEqual(normalizeStoreConfig({}).config.booking.handoff, {weekly: {}});
});

test('weekday evening, all-day weekend/holiday and explicit exception priority', () => {
  const handoff = {weekly: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map(day => [day, [{start: day === 0 || day === 6 ? '00:00' : '18:30', end: '24:00'}]])), holidayCountry: 'VN', holidayDates: ['2027-01-01']};
  assert.equal(withinHandoff('18:00', handoffWindows('2026-10-20', handoff)), false);
  assert.equal(withinHandoff('18:30', handoffWindows('2026-10-20', handoff)), true);
  assert.equal(withinHandoff('23:30', handoffWindows('2026-10-20', handoff)), true);
  assert.equal(withinHandoff('09:00', handoffWindows('2026-10-24', handoff)), true);
  assert.equal(withinHandoff('09:00', handoffWindows('2027-01-01', handoff)), true);
  assert.deepEqual(handoffWindows('2027-01-01', handoff, {'2027-01-01': {closed: true}}), []);
  assert.deepEqual(handoffWindows('2027-01-01', handoff, {'2027-01-01': {windows: [{start: '10:00', end: '12:00'}]}}), [{start: '10:00', end: '12:00'}]);
});

test('a store can give holidays its own hours, or close on them', () => {
  const {config} = normalizeStoreConfig({booking: {handoff: {weekly: {thu: [{start: '18:30', end: '21:00'}]}, holidayDates: ['2026-12-31'], holidayWindows: [{start: '10:00', end: '14:00'}]}}});
  assert.deepEqual(handoffWindows('2026-12-31', config.booking.handoff), [{start: '10:00', end: '14:00'}]);
  assert.deepEqual(handoffWindows('2026-12-24', config.booking.handoff), [{start: '18:30', end: '21:00'}], 'an ordinary Thursday');
  const closed = normalizeStoreConfig({booking: {handoff: {holidayDates: ['2026-12-31'], holidayWindows: []}}}).config.booking.handoff;
  assert.deepEqual(handoffWindows('2026-12-31', closed), []);
});
