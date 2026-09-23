// core/booking + core/inventory: the pure rules the Worker's repository builds on.
import test from 'node:test';
import assert from 'node:assert/strict';
import {isIsoDate, shiftDate, todayIn, paddedPeriod, periodsOverlap} from '../../core/booking/dates.mjs';
import {RESERVATION_STATUSES, OCCUPYING, isRequest, itemsRequirement, summarize, requestDatesError, itemStatusFor} from '../../core/booking/rules.mjs';
import {ITEM_STATUSES, BLOCKED_ITEM, nextInventoryItemId, inventoryItemId, ID_PATTERN} from '../../core/inventory/statuses.mjs';

test('dates: only real calendar days, shifting, store-zone today, buffered periods and inclusive overlap', () => {
  assert.equal(isIsoDate('2026-02-28'), true);
  assert.equal(isIsoDate('2026-02-30'), false);
  assert.equal(isIsoDate('2026-2-3'), false);
  assert.equal(isIsoDate(20260228), false);
  assert.equal(shiftDate('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftDate('2026-03-01', -1), '2026-02-28');
  assert.equal(todayIn('Asia/Ho_Chi_Minh', new Date('2026-10-01T18:30:00Z')), '2026-10-02');
  assert.equal(todayIn('UTC', new Date('2026-10-01T18:30:00Z')), '2026-10-01');
  assert.equal(todayIn('Not/AZone', new Date('2026-10-01T18:30:00Z')), '2026-10-01');
  assert.deepEqual(paddedPeriod('2026-10-05', '2026-10-07', 1), {start: '2026-10-04', end: '2026-10-08'});
  const booked = {start: '2026-10-05', end: '2026-10-07'};
  assert.equal(periodsOverlap(booked, {start: '2026-10-07', end: '2026-10-09'}), true, 'same day counts');
  assert.equal(periodsOverlap(booked, {start: '2026-10-08', end: '2026-10-09'}), false);
  assert.equal(periodsOverlap(booked, {start: '2026-10-01', end: '2026-10-04'}), false);
  assert.equal(periodsOverlap(booked, {start: '2026-10-01', end: '2026-10-05'}), true);
});

test('booking statuses: pending / confirmed / rented hold stock, returned / cancelled release it', () => {
  assert.deepEqual(RESERVATION_STATUSES, ['pending', 'confirmed', 'rented', 'returned', 'cancelled']);
  assert.deepEqual(OCCUPYING, ['pending', 'confirmed', 'rented']);
  assert.equal(itemStatusFor('rented'), 'rented');
  assert.equal(itemStatusFor('returned'), 'available');
  assert.equal(itemStatusFor('cancelled'), 'available');
  assert.equal(itemStatusFor('confirmed'), null);
});

test('a request names a product without holding an item; only pending requests may stay empty', () => {
  assert.equal(isRequest({request_product_id: 'p', items: []}), true);
  assert.equal(isRequest({request_product_id: 'p', items: [{}]}), false);
  assert.equal(isRequest({request_product_id: '', items: []}), false);
  assert.equal(itemsRequirement([], {status: 'pending', request_product_id: 'p'}), null);
  assert.equal(itemsRequirement([], {status: 'confirmed', request_product_id: 'p'}), 'assign_item_before_status_change');
  assert.equal(itemsRequirement([], {status: 'pending', request_product_id: ''}), 'items_required');
  assert.equal(itemsRequirement(['x'], {status: 'confirmed'}), null);
});

test('availability summary: available / low / rented / unavailable across the inventory statuses', () => {
  const items = [
    {id: 'a', status: 'available'}, {id: 'b', status: 'available'}, {id: 'c', status: 'maintenance'}, {id: 'd', status: 'inactive'}, {id: 'e', status: 'rented'}
  ];
  assert.deepEqual(ITEM_STATUSES, ['available', 'reserved', 'rented', 'cleaning', 'maintenance', 'inactive']);
  assert.deepEqual(BLOCKED_ITEM, ['maintenance', 'inactive']);
  // Future period: the rented item counts as free again (its booking is checked via conflictIds).
  assert.deepEqual(summarize(items, new Set(), {includesToday: false}), {total: 4, available: 3, status: 'available'});
  // Today: the rented item is out; maintenance never counts; inactive is not even in the total.
  assert.deepEqual(summarize(items, new Set(), {includesToday: true}), {total: 4, available: 2, status: 'available'});
  assert.deepEqual(summarize(items, new Set(['a']), {includesToday: true}), {total: 4, available: 1, status: 'low'});
  assert.deepEqual(summarize(items, new Set(['a', 'b']), {includesToday: true}), {total: 4, available: 0, status: 'rented'});
  assert.deepEqual(summarize([{id: 'c', status: 'maintenance'}], new Set()), {total: 1, available: 0, status: 'unavailable'});
  assert.deepEqual(summarize([{id: 'd', status: 'inactive'}], new Set()), {total: 0, available: 0, status: 'unavailable'});
  assert.deepEqual(summarize([{id: 'a', status: 'available'}], new Set()), {total: 1, available: 1, status: 'available'}, 'a single free item is "available", not "low"');
  // A garment back but not yet washed is out today, and free again for a later period.
  const washing = [{id: 'a', status: 'available'}, {id: 'f', status: 'cleaning'}];
  assert.deepEqual(summarize(washing, new Set(), {includesToday: true}), {total: 2, available: 1, status: 'low'});
  assert.deepEqual(summarize(washing, new Set(), {includesToday: false}), {total: 2, available: 2, status: 'available'});
});

test('public request dates: valid, invalid, past, too far ahead, too long', () => {
  const limits = {today: '2026-10-01', maxRentalDays: 5, maxDaysAhead: 30};
  assert.equal(requestDatesError({start_date: '2026-10-03', end_date: '2026-10-05'}, limits), null);
  assert.deepEqual(requestDatesError({start_date: '2026-13-01', end_date: '2026-10-05'}, limits), {field: 'start_date', code: 'invalid'});
  assert.deepEqual(requestDatesError({start_date: '2026-10-03', end_date: 'soon'}, limits), {field: 'end_date', code: 'invalid'});
  assert.deepEqual(requestDatesError({start_date: '2026-10-05', end_date: '2026-10-03'}, limits), {field: 'end_date', code: 'before_start'});
  assert.deepEqual(requestDatesError({start_date: '2026-09-30', end_date: '2026-10-03'}, limits), {field: 'start_date', code: 'past'});
  assert.deepEqual(requestDatesError({start_date: '2026-11-01', end_date: '2026-11-02'}, limits), {field: 'start_date', code: 'too_far'});
  assert.deepEqual(requestDatesError({start_date: '2026-10-03', end_date: '2026-10-09'}, limits), {field: 'end_date', code: 'too_long'});
  assert.equal(requestDatesError({start_date: '2026-10-03', end_date: '2026-10-08'}, limits), null, 'exactly maxRentalDays is allowed');
});

test('inventory ids: <product>-NN, suggesting the next free number', () => {
  assert.equal(inventoryItemId('sample-rental-001', 3), 'sample-rental-001-03');
  assert.equal(nextInventoryItemId('p', []), 'p-01');
  assert.equal(nextInventoryItemId('p', ['p-01', 'p-02']), 'p-03');
  assert.equal(nextInventoryItemId('p', ['p-01', 'p-03']), 'p-04', 'a gap is skipped, not reused');
  assert(ID_PATTERN.test('sample-rental-001-01'));
  assert(!ID_PATTERN.test('Sample-001'));
  assert(!ID_PATTERN.test('a--b'));
});
