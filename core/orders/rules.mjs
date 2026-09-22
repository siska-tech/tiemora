// The order domain for `type: sale` products: statuses, fulfillment, pricing of a line with its
// options and add-ons, the dates and time slots a customer may pick, and how capacity is counted.
// Nothing here is a physical item: a florist sells quantities and production capacity, so the
// limits are counts (orders per slot, orders per day, units per product). Pure functions; the
// repository (worker/orders-db.mjs) runs the SQL and the handlers (worker/orders.mjs) call these.
import {isIsoDate, shiftDate} from '../booking/dates.mjs';

export const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'];
// Statuses that count against capacity and stock. A cancelled order frees its slot; a pending one
// already holds it so the shop cannot accept more than it can make while it confirms.
export const ACTIVE_ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed'];
export const FULFILLMENT_TYPES = ['pickup', 'delivery'];
export const ORDER_SOURCES = ['admin', 'public'];
// The status buttons the admin offers. `out_for_delivery` only makes sense for a delivery.
export function nextOrderStatuses(status, fulfillmentType = 'pickup') {
  const flow = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: fulfillmentType === 'delivery' ? ['out_for_delivery', 'completed', 'cancelled'] : ['completed', 'cancelled'],
    out_for_delivery: ['completed', 'cancelled'],
    completed: [],
    cancelled: []
  };
  return flow[status] || [];
}

export const MAX_QUANTITY = 20;

// --- Pricing ---------------------------------------------------------------------------------------
// Resolves the customer's choices against the product (which ids it offers, and its own price
// deltas) and the store config (labels and default deltas). Returns {error} or the priced line.
/** @param {any} product @param {any} ordering @param {{options?: Record<string, string>, addons?: string[], quantity?: number}} choice */
export function priceOrderLine(product, ordering, {options = {}, addons = [], quantity = 1} = {}) {
  if (!product || product.type !== 'sale') return {error: {field: 'product_id', code: 'not_for_sale'}};
  const base = product.price?.sale;
  if (typeof base !== 'number') return {error: {field: 'product_id', code: 'no_price'}};
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) return {error: {field: 'quantity', code: 'invalid'}};
  if (!options || typeof options !== 'object' || Array.isArray(options)) return {error: {field: 'options', code: 'invalid'}};
  const groups = product.options || {};
  const chosen = {};
  let unit = base;
  for (const [group, choices] of Object.entries(groups)) {
    const picked = options[group];
    if (picked == null || picked === '') {
      // A group the customer skipped takes the product's first choice ("florist's default").
      const first = choices[0];
      chosen[group] = first.id;
      unit += delta(first, ordering?.options?.[group]?.choices?.[first.id]);
      continue;
    }
    if (typeof picked !== 'string') return {error: {field: `options.${group}`, code: 'invalid'}};
    const entry = choices.find(c => c.id === picked);
    if (!entry) return {error: {field: `options.${group}`, code: 'invalid'}};
    chosen[group] = picked;
    unit += delta(entry, ordering?.options?.[group]?.choices?.[picked]);
  }
  for (const group of Object.keys(options)) if (!(group in groups) && options[group] !== '' && options[group] != null) return {error: {field: `options.${group}`, code: 'unknown'}};
  if (!Array.isArray(addons)) return {error: {field: 'addons', code: 'invalid'}};
  const offered = product.addons || [];
  const pickedAddons = [];
  for (const id of new Set(addons)) {
    const entry = offered.find(a => a.id === id);
    if (!entry) return {error: {field: 'addons', code: 'invalid'}};
    pickedAddons.push(id);
    unit += delta(entry, ordering?.addons?.[id]);
  }
  if (unit < 0) unit = 0;
  return {product_id: product.id, quantity, options: chosen, addons: pickedAddons, unit_price: unit, line_total: unit * quantity};
}
// A product's own price delta wins over the store-wide default for that id.
function delta(entry, configured) {
  if (typeof entry?.price === 'number') return entry.price;
  if (typeof configured?.price === 'number') return configured.price;
  return 0;
}
export function orderTotals(lines, {fulfillmentType, deliveryFee = 0}) {
  const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0);
  const delivery_fee = fulfillmentType === 'delivery' ? deliveryFee : 0;
  return {subtotal, delivery_fee, total: subtotal + delivery_fee};
}

// --- Dates, slots, deadline ------------------------------------------------------------------------
// The calendar days the form offers: an explicit campaign window clipped to today onwards, or a
// rolling window from today + minLeadDays.
/** @param {{from?: string|null, to?: string|null, minLeadDays?: number, maxDaysAhead?: number}} dates @param {string} today */
export function orderDateWindow(dates, today) {
  const earliest = shiftDate(today, dates?.minLeadDays ?? 1);
  if (dates?.from && dates?.to) {
    const from = dates.from > earliest ? dates.from : earliest;
    return {from, to: dates.to, campaign: true, open: from <= dates.to};
  }
  const to = shiftDate(today, dates?.maxDaysAhead ?? 14);
  return {from: earliest, to, campaign: false, open: earliest <= to};
}
export function orderDateError(date, window) {
  if (!isIsoDate(date)) return {field: 'fulfillment_date', code: 'invalid'};
  if (!window.open || date < window.from) return {field: 'fulfillment_date', code: 'too_early'};
  if (date > window.to) return {field: 'fulfillment_date', code: 'too_late'};
  return null;
}
export const deadlinePassed = (deadline, now = new Date()) => Boolean(deadline) && now.getTime() >= Date.parse(deadline);
export const findSlot = (timeSlots, id) => (timeSlots || []).find(s => s.id === id) || null;

// --- Capacity --------------------------------------------------------------------------------------
// `counts` is what the repository counted from active orders: {[date]: {total, slots: {[slotId]: n}}}.
// Every slot of the configured list is reported for every date, with `open` false once its own
// capacity or the day's capacity is used up. No limit configured = always open, and `capacity: null`.
/** @param {{timeSlots?: any[], dailyCapacity?: number|null}} ordering @param {string[]} dates @param {Record<string, {total: number, slots: Record<string, number>}>} counts */
export function capacityByDate(ordering, dates, counts = {}) {
  const out = {};
  for (const date of dates) {
    const day = counts[date] || {total: 0, slots: {}};
    const dayCap = ordering.dailyCapacity ?? null;
    const dayOpen = dayCap === null || day.total < dayCap;
    const slots = {};
    for (const slot of ordering.timeSlots || []) {
      const used = day.slots[slot.id] || 0;
      const cap = slot.capacity ?? null;
      slots[slot.id] = {used, capacity: cap, remaining: cap === null ? null : Math.max(0, cap - used), open: dayOpen && (cap === null || used < cap)};
    }
    // Without configured slots the day itself is the only unit of capacity.
    const open = (ordering.timeSlots || []).length ? Object.values(slots).some(s => s.open) : dayOpen;
    out[date] = {used: day.total, capacity: dayCap, remaining: dayCap === null ? null : Math.max(0, dayCap - day.total), open, slots};
  }
  return out;
}
// Units sold per product against `ordering.stock` in product.yaml (null = no limit, never sold out).
export function stockSummary(product, sold = 0) {
  const stock = product?.ordering?.stock ?? null;
  const remaining = stock === null ? null : Math.max(0, stock - sold);
  return {stock, sold, remaining, soldOut: stock !== null && sold >= stock};
}
