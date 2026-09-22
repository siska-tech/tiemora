// The booking domain: statuses, which of them hold stock, how availability is summarised and
// what a public request may ask for. Pure functions; the repository (worker/db.mjs) runs the SQL.
import {BLOCKED_ITEM, OUT_NOW} from '../inventory/statuses.mjs';
import {isIsoDate, shiftDate} from './dates.mjs';

export const RESERVATION_STATUSES = ['pending', 'confirmed', 'rented', 'returned', 'cancelled'];
// Statuses that hold their items. `cancelled` never does; `returned` means the item is back.
export const OCCUPYING = ['pending', 'confirmed', 'rented'];
// The status buttons the admin shows for each current status.
export const NEXT_STATUSES = {pending: ['confirmed', 'cancelled'], confirmed: ['rented', 'cancelled'], rented: ['returned', 'cancelled'], returned: [], cancelled: []};
export const RESERVATION_SOURCES = ['admin', 'public'];

// A request from the public site names a product but holds no item until staff confirm it.
export const isRequest = reservation => Boolean(reservation?.request_product_id) && !(reservation.items?.length);

// Only a pending request may have no item yet. Returns an error code or null.
export function itemsRequirement(itemIds, reservation) {
  if (itemIds.length) return null;
  if (reservation.status === 'pending' && reservation.request_product_id) return null;
  return reservation.request_product_id ? 'assign_item_before_status_change' : 'items_required';
}

// total / available / status for one product from its items and the ids clashing with the period.
export function summarize(items, conflictIds, {includesToday = false} = {}) {
  const active = items.filter(i => i.status !== 'inactive');
  let available = 0, rented = 0;
  for (const item of active) {
    if (BLOCKED_ITEM.includes(item.status)) continue;
    if (conflictIds.has(item.id) || (includesToday && OUT_NOW.includes(item.status))) rented++;
    else available++;
  }
  const total = active.length;
  let status = 'unavailable';
  if (available > 0) status = available < total && available <= 1 ? 'low' : 'available';
  else if (rented > 0) status = 'rented';
  return {total, available, status};
}

// Validation of the dates a customer may request. Returns {field, code} or null.
/** @param {{start_date?: string, end_date?: string}} dates @param {{today?: string, maxRentalDays?: number, maxDaysAhead?: number}} [limits] */
export function requestDatesError({start_date, end_date}, {today, maxRentalDays = 60, maxDaysAhead = 365} = {}) {
  if (!isIsoDate(start_date)) return {field: 'start_date', code: 'invalid'};
  if (!isIsoDate(end_date)) return {field: 'end_date', code: 'invalid'};
  if (start_date > end_date) return {field: 'end_date', code: 'before_start'};
  if (today && start_date < today) return {field: 'start_date', code: 'past'};
  if (today && start_date > shiftDate(today, maxDaysAhead)) return {field: 'start_date', code: 'too_far'};
  if (end_date > shiftDate(start_date, maxRentalDays)) return {field: 'end_date', code: 'too_long'};
  return null;
}
// Which physical status a booking status implies for its items (null = leave as is).
export function itemStatusFor(reservationStatus) {
  if (reservationStatus === 'rented') return 'rented';
  if (reservationStatus === 'returned' || reservationStatus === 'cancelled') return 'available';
  return null;
}
