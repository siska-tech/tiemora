// The repository: every SQL statement lives here. Handlers in api.mjs validate input and shape
// responses; the domain rules (statuses, overlap, availability summary) come from core/booking and
// core/inventory. The one invariant this module enforces in SQL: an inventory item can only be in
// one active reservation at a time, where two reservations clash when their occupied intervals
// overlap:
//   existing.start < requested.ready AND existing.ready > requested.start
// An interval runs from the moment a garment is collected until it is ready to go out again --
// the return plus the store's care window -- and is half-open, so one rental may start exactly
// when the last one became ready. Bookings written before migration 0011 have no times and are
// read as the whole calendar days they always blocked, which makes the old rule a special case of
// this one. `booking.bufferDays` widens the interval being asked for, as it always did.
//
// `db` is anything that speaks the D1 prepared-statement interface:
//   db.prepare(sql).bind(...params).{all()|first(column?)|run()} and db.batch([statements])
// Cloudflare D1 does natively; tests/d1-shim.mjs implements the same surface over node:sqlite, and
// a SQLite/PostgreSQL adapter for another host only has to provide these five calls.
import {HttpError} from './util.mjs';
import {paddedPeriod, shiftDate} from '../core/booking/dates.mjs';
import {at, occupiedInterval, padInterval, dueAt, readyAt, isIsoDateTime, isFitting, visitSpan} from '../core/booking/schedule.mjs';
import {RESERVATION_STATUSES, OCCUPYING, isRequest, itemsRequirement, summarize} from '../core/booking/rules.mjs';
import {ITEM_STATUSES, BLOCKED_ITEM, OUT_NOW} from '../core/inventory/statuses.mjs';
import {NOTIFICATION_STATUSES} from '../core/notifications/messages.mjs';

export {ITEM_STATUSES, RESERVATION_STATUSES, OCCUPYING, BLOCKED_ITEM, OUT_NOW, isRequest, summarize};
// Customer contact details (migration 0002) and the public-request fields (0003) saved with a
// booking. The notification_* columns are written only by setNotification(), so editing a booking
// never clears "sent".
const EXTRA_COLUMNS = ['preferred_contact_channel', 'customer_whatsapp', 'customer_messenger_url', 'customer_zalo_phone', 'source', 'request_product_id', 'request_size', 'privacy_consent', 'privacy_consent_at', 'start_time', 'rental_days', 'returned_at', 'start_at', 'ready_at', 'purpose'];

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";
const placeholders = list => list.map(() => '?').join(',');
const occupying = `cr.status IN (${OCCUPYING.map(s => `'${s}'`).join(',')})`;
// What keeps an item from going out again: an occupying booking, or a timed rental that is back but
// still being cared for -- its interval runs to ready_at, so it stops holding once that has passed.
// A whole-day booking from before 0011 has no ready_at and frees its item on return, as it always did.
const holding = `(${occupying} OR (cr.status = 'returned' AND cr.ready_at <> ''))`;
// What a stored booking occupies, in SQL. A row from before 0011 carries no moments, so it is read
// as midnight to midnight after its last day -- exactly the span the calendar-day rule gave it.
const EFFECTIVE_START = `CASE WHEN cr.start_at <> '' THEN cr.start_at ELSE cr.start_date || 'T00:00' END`;
const READY_AS_PLANNED = `CASE WHEN cr.ready_at <> '' THEN cr.ready_at ELSE date(cr.end_date, '+1 day') || 'T00:00' END`;
// A rental still out after it should have been ready again cannot be promised to anybody: it holds
// its item at least until it could be back and cared for from now on -- `hold` below, worked out
// as the store's turnaround applied to the present moment. Params: hold, hold. An empty hold
// leaves every booking as planned.
const EFFECTIVE_READY = `CASE WHEN cr.status = 'rented' AND ${READY_AS_PLANNED} < ? THEN ? ELSE ${READY_AS_PLANNED} END`;
// Params: requested ready, hold, hold, requested start, excluded reservation id -- see overlapParams().
const overlap = `${EFFECTIVE_START} < ? AND ${EFFECTIVE_READY} > ? AND cr.id <> ?`;
const overlapParams = (interval, exclude = '', hold = '') => [interval.ready, hold, hold, interval.start, exclude];
/** The moment an overdue rental is held until: now, plus the store's turnaround. '' without a clock. */
export const holdUntil = ({today = '', now = '', turnaround = {}} = {}) => (today && now ? readyAt(at(today, now), turnaround) : '');

const padded = paddedPeriod;
// A stretch of whole calendar days as an interval. Lossless: the two rules agree day for day.
export const intervalOfDays = (from, to, buffer = 0) => padInterval({start: at(from, '00:00'), ready: at(shiftDate(to, 1), '00:00')}, buffer);
// The interval a booking asks for: whole days when it names no time, hour-accurate when it does.
export function requestedInterval(booking, {buffer = 0, turnaround = {}, fitting = {}} = {}) {
  const span = occupiedInterval(booking, {turnaround, fitting});
  return isFitting(booking.purpose) ? span : padInterval(span, buffer);
}
// The moments a booking is written with, so the overlap query never has to recompute them.
export function scheduleColumns(data, {turnaround = {}, fitting = {}} = {}) {
  const startAt = at(data.start_date, data.start_time || '00:00');
  if (isFitting(data.purpose) && isIsoDateTime(startAt)) return {start_at: startAt, ...{ready_at: visitSpan(startAt, {purpose: data.purpose, fitting}).ready}};
  if (!(data.rental_days > 0) || !isIsoDateTime(startAt)) return {start_at: '', ready_at: ''};
  const back = isIsoDateTime(data.returned_at) ? data.returned_at : dueAt(startAt, data.rental_days);
  return {start_at: startAt, ready_at: readyAt(back, turnaround)};
}

// --- Inventory ------------------------------------------------------------------------------------
/** @param {any} db @param {{product_id?: string, status?: string}} [filters] */
export async function listInventory(db, {product_id, status} = {}) {
  const where = [], params = [];
  if (product_id) { where.push('product_id = ?'); params.push(product_id); }
  if (status) { where.push('status = ?'); params.push(status); }
  const sql = `SELECT * FROM inventory_items${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY product_id, id`;
  return (await db.prepare(sql).bind(...params).all()).results;
}
// Current availability plus assigned schedules. Pending public requests hold no stock.
export async function inventoryOverview(db, filters, today, buffer = 0, now = '') {
  const items = await listInventory(db, filters);
  // Back but not yet ready: not available today, whatever its bookings say.
  const caring = new Set(now ? (await db.prepare(`SELECT ri.inventory_item_id FROM reservation_items ri JOIN reservations cr ON cr.id = ri.reservation_id
    WHERE cr.status = 'returned' AND cr.ready_at > ?`).bind(now).all()).results.map(row => row.inventory_item_id) : []);
  const {start, end} = padded(today, today, buffer);
  const bookings = (await db.prepare(`SELECT ri.inventory_item_id, cr.id, cr.customer_name, cr.start_date, cr.end_date, cr.status
    FROM reservation_items ri JOIN reservations cr ON cr.id = ri.reservation_id
    WHERE ${occupying} AND (cr.end_date >= ? OR cr.status = 'rented') ORDER BY cr.start_date, cr.id`).bind(start).all()).results;
  const requests = (await db.prepare(`SELECT r.id, r.customer_name, r.start_date, r.end_date, r.request_product_id, r.request_size, r.status
    FROM reservations r WHERE r.status = 'pending' AND r.source = 'public'
    AND NOT EXISTS (SELECT 1 FROM reservation_items ri WHERE ri.reservation_id = r.id)
    AND (? = '' OR r.request_product_id = ?) ORDER BY r.start_date, r.id`).bind(filters.product_id || '', filters.product_id || '').all()).results;
  const byItem = new Map();
  for (const row of bookings) {
    if (!byItem.has(row.inventory_item_id)) byItem.set(row.inventory_item_id, []);
    byItem.get(row.inventory_item_id).push(row);
  }
  const enriched = items.map(item => {
    const reservations = byItem.get(item.id) || [];
    const current = reservations.filter(r => r.status === 'rented' || (r.start_date <= end && r.end_date >= start));
    const next = reservations.find(r => !current.includes(r)) || null;
    return {...item, available_today: item.status === 'available' && current.length === 0 && !caring.has(item.id), current_reservations: current, next_reservation: next};
  });
  return {today, buffer, items: enriched, requests, summary: {
    total: enriched.length,
    available: enriched.filter(i => i.available_today).length,
    booked: enriched.filter(i => i.current_reservations.length).length,
    rented: enriched.filter(i => i.status === 'rented' || i.current_reservations.some(r => r.status === 'rented')).length,
    maintenance: enriched.filter(i => i.status === 'maintenance').length
  }};
}
export async function getItem(db, id) { return (await db.prepare('SELECT * FROM inventory_items WHERE id = ?').bind(id).first()) || null; }
export async function getItems(db, ids) {
  if (!ids.length) return [];
  return (await db.prepare(`SELECT * FROM inventory_items WHERE id IN (${placeholders(ids)})`).bind(...ids).all()).results;
}
export async function createItem(db, {id, product_id, size, status, note}) {
  if (await getItem(db, id)) throw new HttpError(409, 'inventory_exists', `Inventory item ${id} already exists.`);
  await db.prepare('INSERT INTO inventory_items (id, product_id, size, status, note) VALUES (?, ?, ?, ?, ?)').bind(id, product_id, size, status, note).run();
  return getItem(db, id);
}
export async function updateItem(db, id, fields) {
  const keys = Object.keys(fields);
  if (keys.length) await db.prepare(`UPDATE inventory_items SET ${keys.map(k => `${k} = ?`).join(', ')}, updated_at = ${NOW} WHERE id = ?`).bind(...keys.map(k => fields[k]), id).run();
  return getItem(db, id);
}
export async function deleteItem(db, id) {
  const used = await db.prepare('SELECT COUNT(*) AS n FROM reservation_items WHERE inventory_item_id = ?').bind(id).first('n');
  if (used) throw new HttpError(409, 'inventory_in_use', `Inventory item ${id} appears in ${used} reservation(s). Set its status to inactive instead of deleting it.`);
  const {meta} = await db.prepare('DELETE FROM inventory_items WHERE id = ?').bind(id).run();
  return meta.changes > 0;
}

// --- Availability ---------------------------------------------------------------------------------
// Which of these items are held by another active reservation during [from, to]?
/** @param {any} db @param {string[]} itemIds @param {{start: string, ready: string}} interval @param {{exclude?: string, hold?: string}} [options] */
export async function listConflicts(db, itemIds, interval, {exclude = '', hold = ''} = {}) {
  if (!itemIds.length) return [];
  const sql = `SELECT c.inventory_item_id, cr.id AS reservation_id, cr.start_date, cr.end_date, cr.start_time, cr.rental_days, cr.status, cr.customer_name
    FROM reservation_items c JOIN reservations cr ON cr.id = c.reservation_id
    WHERE c.inventory_item_id IN (${placeholders(itemIds)}) AND ${holding} AND ${overlap}
    ORDER BY cr.start_date`;
  return (await db.prepare(sql).bind(...itemIds, ...overlapParams(interval, exclude, hold)).all()).results;
}
// Availability of every managed product for [from, to]; two queries however many products there are.
/** @param {any} db @param {string} from @param {string} to @param {{buffer?: number, today?: string, hold?: string}} [options] */
export async function availabilityByProduct(db, from, to, {buffer = 0, today, hold = ''} = {}) {
  const interval = intervalOfDays(from, to, buffer);
  const items = (await db.prepare("SELECT id, product_id, status FROM inventory_items WHERE status <> 'inactive'").all()).results;
  const conflicts = (await db.prepare(`SELECT DISTINCT c.inventory_item_id FROM reservation_items c JOIN reservations cr ON cr.id = c.reservation_id WHERE ${holding} AND ${overlap}`).bind(...overlapParams(interval, '', hold)).all()).results;
  const conflictIds = new Set(conflicts.map(c => c.inventory_item_id));
  const includesToday = Boolean(today) && from <= today && today <= to;
  const grouped = new Map();
  for (const item of items) (grouped.get(item.product_id) || grouped.set(item.product_id, []).get(item.product_id)).push(item);
  return new Map([...grouped].map(([productId, list]) => [productId, summarize(list, conflictIds, {includesToday})]));
}
// The admin form's candidate list: every item of a product with whether it is free for [from, to].
/** @param {any} db @param {string} productId @param {{from?: string, to?: string, interval?: any, buffer?: number, exclude?: string, today?: string, hold?: string}} [options] */
export async function itemsForProduct(db, productId, {from, to, interval, buffer = 0, exclude = '', today, hold = ''} = {}) {
  const items = await listInventory(db, {product_id: productId});
  if (!from && !interval) return items.map(item => ({...item, available: !BLOCKED_ITEM.includes(item.status), conflicts: []}));
  const asked = interval || intervalOfDays(from, to, buffer);
  const conflicts = await listConflicts(db, items.map(i => i.id), asked, {exclude, hold});
  const includesToday = Boolean(today) && from <= today && today <= to;
  return items.map(item => {
    const own = conflicts.filter(c => c.inventory_item_id === item.id).map(({inventory_item_id, ...rest}) => rest);
    const outNow = includesToday && OUT_NOW.includes(item.status) && !own.length;
    return {...item, available: !BLOCKED_ITEM.includes(item.status) && !own.length && !outNow, conflicts: own};
  });
}

// --- Reservations ---------------------------------------------------------------------------------
function reservationId(now = new Date()) {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const random = crypto.getRandomValues(new Uint8Array(4));
  return `rsv-${now.toISOString().slice(0, 10).replaceAll('-', '')}-${[...random].map(b => alphabet[b % alphabet.length]).join('')}`;
}
async function attachItems(db, reservations) {
  if (!reservations.length) return reservations;
  const ids = reservations.map(r => r.id);
  const rows = (await db.prepare(`SELECT ri.reservation_id, ri.inventory_item_id, ri.product_id, i.size, i.status AS item_status
    FROM reservation_items ri LEFT JOIN inventory_items i ON i.id = ri.inventory_item_id
    WHERE ri.reservation_id IN (${placeholders(ids)}) ORDER BY ri.id`).bind(...ids).all()).results;
  const byReservation = new Map(ids.map(id => [id, []]));
  for (const {reservation_id, ...item} of rows) byReservation.get(reservation_id).push(item);
  return reservations.map(r => ({...r, items: byReservation.get(r.id)}));
}
export async function getReservation(db, id) {
  const row = await db.prepare('SELECT * FROM reservations WHERE id = ?').bind(id).first();
  return row ? (await attachItems(db, [row]))[0] : null;
}
/** @param {any} db @param {{from?: string, to?: string, status?: string[], notification?: string, q?: string, limit?: number}} [filters] */
export async function listReservations(db, {from, to, status = [], notification = '', q = '', limit = 200} = {}) {
  const where = [], params = [];
  if (from) { where.push('end_date >= ?'); params.push(from); }
  if (to) { where.push('start_date <= ?'); params.push(to); }
  if (status.length) { where.push(`status IN (${placeholders(status)})`); params.push(...status); }
  if (notification) { where.push('notification_status = ?'); params.push(notification); }
  if (q) { where.push('(customer_name LIKE ? OR customer_phone LIKE ? OR customer_facebook LIKE ? OR id LIKE ?)'); params.push(...Array(4).fill(`%${q}%`)); }
  const sql = `SELECT * FROM reservations${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY start_date DESC, created_at DESC LIMIT ?`;
  return attachItems(db, (await db.prepare(sql).bind(...params, limit).all()).results);
}

// Items must exist and be bookable at all; the period clash is checked separately so the 409 can say which.
async function requireBookableItems(db, itemIds) {
  const items = await getItems(db, itemIds);
  const found = new Map(items.map(i => [i.id, i]));
  const missing = itemIds.filter(id => !found.has(id));
  if (missing.length) throw new HttpError(400, 'validation_error', `Unknown inventory item: ${missing.join(', ')}.`, {fields: {items: 'unknown'}});
  const blocked = items.filter(i => BLOCKED_ITEM.includes(i.status));
  if (blocked.length) throw new HttpError(409, 'inventory_unavailable', `${blocked.map(i => `${i.id} (${i.status})`).join(', ')} cannot be reserved.`, {items: blocked.map(i => i.id)});
  return itemIds.map(id => found.get(id));
}
function conflictError(conflicts) {
  return new HttpError(409, 'inventory_conflict', 'Selected item is already reserved for this period.', {
    conflicts: conflicts.map(c => ({inventoryItemId: c.inventory_item_id, reservationId: c.reservation_id, from: c.start_date, to: c.end_date, status: c.status}))
  });
}
// INSERT that silently does nothing when the item is already held for the period. Executed inside a
// batch (one transaction), so two overlapping requests cannot both succeed even if both pre-checks passed.
function guardedItemInsert(db, reservation, item, {interval, guard, hold = ''}) {
  const sql = `INSERT INTO reservation_items (reservation_id, inventory_item_id, product_id) SELECT ?, ?, ?` + (guard
    ? ` WHERE NOT EXISTS (SELECT 1 FROM reservation_items c JOIN reservations cr ON cr.id = c.reservation_id WHERE c.inventory_item_id = ? AND ${holding} AND ${overlap})`
    : '');
  const params = [reservation.id, item.id, item.product_id];
  if (guard) params.push(item.id, ...overlapParams(interval, reservation.id, hold));
  return db.prepare(sql).bind(...params);
}
// Keep the physical status in step with the booking: handing over marks items rented, getting
// them back (or cancelling a rental) frees them. Maintenance/inactive are never touched.
function itemStatusEffects(db, reservation, itemIds) {
  if (!itemIds.length) return [];
  const list = placeholders(itemIds);
  if (reservation.status === 'rented') return [db.prepare(`UPDATE inventory_items SET status = 'rented', updated_at = ${NOW} WHERE id IN (${list}) AND status IN ('available','reserved')`).bind(...itemIds)];
  if (['returned', 'cancelled'].includes(reservation.status)) return [db.prepare(`UPDATE inventory_items SET status = 'available', updated_at = ${NOW} WHERE id IN (${list}) AND status IN ('rented','reserved')
    AND NOT EXISTS (SELECT 1 FROM reservation_items x JOIN reservations xr ON xr.id = x.reservation_id WHERE x.inventory_item_id = inventory_items.id AND xr.status = 'rented' AND xr.id <> ?)`).bind(...itemIds, reservation.id)];
  return [];
}
const insertedAll = (results, offset, count) => results.slice(offset, offset + count).every(r => r.meta.changes === 1);

// Only a pending request (public form, or staff noting one down) may have no item yet.
function requireItemsUnlessRequest(itemIds, reservation) {
  const problem = itemsRequirement(itemIds, reservation);
  if (!problem) return;
  throw new HttpError(400, 'validation_error', problem === 'assign_item_before_status_change' ? 'Assign an inventory item before changing the status of a request.' : 'items must list at least one inventory item id.', {fields: {items: 'required'}});
}

/** @param {any} db @param {any} data @param {{buffer?: number, turnaround?: any, fitting?: any, today?: string, now?: string}} [context] */
export async function createReservation(db, data, {buffer = 0, turnaround = {}, fitting = {}, today = '', now = ''} = {}) {
  const hold = holdUntil({today, now, turnaround});
  // Every booking is a rental unless it says otherwise; the column will not take an empty string.
  data = {source: 'admin', purpose: 'rental', request_product_id: '', request_size: '', privacy_consent: 0, privacy_consent_at: '', items: [], ...data};
  // The moments are worked out once and stored, so the clash query never recomputes them.
  data = {...data, ...scheduleColumns(data, {turnaround, fitting})};
  requireItemsUnlessRequest(data.items, data);
  const items = await requireBookableItems(db, data.items);
  const guard = OCCUPYING.includes(data.status);
  const interval = requestedInterval(data, {buffer, turnaround, fitting});
  if (guard) {
    const conflicts = await listConflicts(db, data.items, interval, {hold});
    if (conflicts.length) throw conflictError(conflicts);
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const reservation = {...data, id: reservationId()};
    if (await db.prepare('SELECT 1 FROM reservations WHERE id = ?').bind(reservation.id).first()) continue;
    const results = await db.batch([
      db.prepare(`INSERT INTO reservations (id, customer_name, customer_phone, customer_facebook, start_date, end_date, status, note, ${EXTRA_COLUMNS.join(', ')}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${placeholders(EXTRA_COLUMNS)})`)
        .bind(reservation.id, data.customer_name, data.customer_phone, data.customer_facebook, data.start_date, data.end_date, data.status, data.note, ...EXTRA_COLUMNS.map(c => data[c] ?? '')),
      ...items.map(item => guardedItemInsert(db, reservation, item, {interval, guard, hold})),
      ...itemStatusEffects(db, reservation, data.items)
    ]);
    if (!insertedAll(results, 1, items.length)) {
      await db.prepare('DELETE FROM reservations WHERE id = ?').bind(reservation.id).run();
      throw conflictError(await listConflicts(db, data.items, interval, {hold}));
    }
    return getReservation(db, reservation.id);
  }
  throw new HttpError(500, 'id_collision', 'Could not allocate a reservation id; please retry.');
}

/** @param {any} db @param {string} id @param {any} patch @param {{buffer?: number, turnaround?: any, fitting?: any, today?: string, now?: string}} [context] */
export async function updateReservation(db, id, patch, {buffer = 0, turnaround = {}, fitting = {}, today = '', now = ''} = {}) {
  const hold = holdUntil({today, now, turnaround});
  const current = await getReservation(db, id);
  if (!current) return null;
  let next = {...current, ...patch, id};
  // The moment a rental comes back is written down, so its care window runs from the real return
  // rather than from when it was due; a booking taken back out of "returned" forgets it again.
  if (next.status === 'returned' && current.status !== 'returned' && !next.returned_at && today && now) next.returned_at = at(today, now);
  else if (next.status !== 'returned' && current.status === 'returned') next.returned_at = '';
  next = {...next, ...scheduleColumns(next, {turnaround, fitting})};
  const itemIds = patch.items ?? current.items.map(i => i.inventory_item_id);
  requireItemsUnlessRequest(itemIds, next);
  // The clash check reruns whenever the booking (re)claims its items: new items, new dates, or a
  // status change from a non-holding status back into a holding one.
  const guard = OCCUPYING.includes(next.status) && Boolean(patch.items || patch.start_date || patch.end_date || patch.start_time || patch.rental_days || !OCCUPYING.includes(current.status));
  const interval = requestedInterval(next, {buffer, turnaround, fitting});
  const items = await requireBookableItems(db, itemIds).catch(error => {
    // Items already on the booking may have gone into maintenance since; that must not block marking it returned.
    if (error.error === 'inventory_unavailable' && !patch.items && !guard) return current.items.map(i => ({id: i.inventory_item_id, product_id: i.product_id}));
    throw error;
  });
  if (guard) {
    const conflicts = await listConflicts(db, itemIds, interval, {exclude: id, hold});
    if (conflicts.length) throw conflictError(conflicts);
  }
  const update = row => db.prepare(`UPDATE reservations SET customer_name = ?, customer_phone = ?, customer_facebook = ?, start_date = ?, end_date = ?, status = ?, note = ?, ${EXTRA_COLUMNS.map(c => `${c} = ?`).join(', ')}, updated_at = ${NOW} WHERE id = ?`)
    .bind(row.customer_name, row.customer_phone, row.customer_facebook, row.start_date, row.end_date, row.status, row.note, ...EXTRA_COLUMNS.map(c => row[c] ?? ''), id);
  const clear = db.prepare('DELETE FROM reservation_items WHERE reservation_id = ?').bind(id);
  const results = await db.batch([
    update(next), clear,
    ...items.map(item => guardedItemInsert(db, next, item, {interval, guard, hold})),
    ...itemStatusEffects(db, next, itemIds)
  ]);
  if (!insertedAll(results, 2, items.length)) {
    // Another request took one of the items between the check and the write: put everything back.
    await db.batch([update(current), clear, ...current.items.map(item => guardedItemInsert(db, current, {id: item.inventory_item_id, product_id: item.product_id}, {interval, guard: false}))]);
    throw conflictError(await listConflicts(db, itemIds, interval, {exclude: id, hold}));
  }
  return getReservation(db, id);
}

// Staff pressed "confirm". A request gets a free item of the product it asked for (same size when
// one was asked for) assigned right now; a booking that already holds its items just changes status.
// Either way the period clash check inside updateReservation() runs again, so a item taken since
// the request came in answers 409 instead of silently double-booking.
/** @param {any} db @param {string} id @param {{buffer?: number, turnaround?: any, fitting?: any, today?: string, now?: string}} [context] */
export async function confirmReservation(db, id, {buffer = 0, turnaround = {}, fitting = {}, today = '', now = ''} = {}) {
  const current = await getReservation(db, id);
  if (!current) return null;
  if (current.status !== 'pending') throw new HttpError(409, 'not_pending', `Reservation ${id} is ${current.status}, not pending.`);
  const patch = {status: 'confirmed'};
  if (isRequest(current)) {
    const candidates = (await itemsForProduct(db, current.request_product_id, {interval: requestedInterval(current, {buffer, turnaround, fitting}), from: current.start_date, to: current.end_date, buffer, exclude: id, today, hold: holdUntil({today, now, turnaround})})).filter(i => i.available);
    const chosen = candidates.find(i => !current.request_size || i.size === current.request_size);
    if (!chosen) {
      throw new HttpError(409, 'inventory_unavailable', current.request_size && candidates.length
        ? `No free ${current.request_product_id} in size ${current.request_size} for ${current.start_date} – ${current.end_date}; other sizes are free.`
        : `No free ${current.request_product_id} for ${current.start_date} – ${current.end_date}.`, {product_id: current.request_product_id, size: current.request_size, otherSizes: candidates.map(i => i.size)});
    }
    patch.items = [chosen.id];
  }
  return updateReservation(db, id, patch, {buffer, turnaround, fitting, today, now});
}

// --- The handoff diary ------------------------------------------------------------------------------
// Single dates whose handoff hours differ from the ordinary week: a day off, a later start, or
// longer hours because the owner is not at their other job. A row wins over the weekly schedule.
/** @param {any} db @param {{from?: string, to?: string}} [range] */
export async function handoffExceptions(db, {from = '', to = ''} = {}) {
  const where = [], params = [];
  if (from) { where.push('date >= ?'); params.push(from); }
  if (to) { where.push('date <= ?'); params.push(to); }
  const sql = `SELECT date, closed, windows, note FROM handoff_exceptions${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY date`;
  const rows = (await db.prepare(sql).bind(...params).all()).results;
  const byDate = {};
  for (const row of rows) {
    let windows = [];
    // The column is written by this module, but a hand-edited row must not take the page down.
    try { const parsed = JSON.parse(row.windows); if (Array.isArray(parsed)) windows = parsed; } catch { windows = []; }
    byDate[row.date] = {date: row.date, closed: row.closed === 1, windows, note: row.note};
  }
  return byDate;
}
/** @param {any} db @param {string} date @param {{closed?: boolean, windows?: any[], note?: string}} entry */
export async function setHandoffException(db, date, {closed = false, windows = [], note = ''} = {}) {
  await db.prepare(`INSERT INTO handoff_exceptions (date, closed, windows, note) VALUES (?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET closed = excluded.closed, windows = excluded.windows, note = excluded.note, updated_at = ${NOW}`)
    .bind(date, closed ? 1 : 0, JSON.stringify(windows), note).run();
  return (await handoffExceptions(db, {from: date, to: date}))[date] || null;
}
/** @param {any} db @param {string} date */
export async function deleteHandoffException(db, date) {
  const {meta} = await db.prepare('DELETE FROM handoff_exceptions WHERE date = ?').bind(date).run();
  return meta.changes > 0;
}

// Everything a timeline needs for one product: its physical items, and the stretches each of them
// is already spoken for. Item ids stay inside the Worker; only counts are ever sent to a customer.
/** @param {any} db @param {string} productId @param {{from?: string, until?: string, size?: string, turnaround?: any, fitting?: any, hold?: string}} [options] */
export async function productSchedule(db, productId, {from = '', until = '', size = '', turnaround = {}, fitting = {}, hold = ''} = {}) {
  const items = (await listInventory(db, {product_id: productId})).filter(item => !size || item.size === size);
  const intervals = new Map(items.map(item => [item.id, []]));
  if (!items.length) return {items, intervals};
  const ids = items.map(item => item.id);
  const rows = (await db.prepare(`SELECT c.inventory_item_id, cr.status, cr.start_date, cr.end_date, cr.start_time, cr.rental_days, cr.returned_at, cr.start_at, cr.ready_at, cr.purpose
    FROM reservation_items c JOIN reservations cr ON cr.id = c.reservation_id
    WHERE c.inventory_item_id IN (${placeholders(ids)}) AND ${holding}
      AND ${EFFECTIVE_READY} > ? AND ${EFFECTIVE_START} < ?`)
    .bind(...ids, hold, hold, at(from, '00:00'), at(until, '00:00')).all()).results;
  for (const row of rows) {
    const interval = occupiedInterval(row, {turnaround, fitting});
    // Still out after it should have been ready: held until `hold`, and simply taken, not in care.
    if (row.status === 'rented' && hold && interval.ready < hold) {
      intervals.get(row.inventory_item_id)?.push({start: interval.start, ready: hold, end: hold});
      continue;
    }
    const end = row.returned_at || (row.rental_days > 0 ? dueAt(interval.start, row.rental_days) : interval.ready);
    intervals.get(row.inventory_item_id)?.push({...interval, end});
  }
  return {items, intervals};
}

// The bookings behind the staff timeline, with who and what they are. Unlike productSchedule() this
// also reads rentals that are already back while their care window runs, and rentals still out
// after they fell due, because both are what staff look at the timeline to find.
/** @param {any} db @param {{product_id?: string, item_id?: string, from: string, until: string}} range */
export async function inventoryTimeline(db, {product_id = '', item_id = '', from, until}) {
  const items = (await listInventory(db, product_id ? {product_id} : {})).filter(item => !item_id || item.id === item_id);
  const bookings = new Map(items.map(item => [item.id, []]));
  if (!items.length) return {items, bookings};
  const ids = items.map(item => item.id);
  const rows = (await db.prepare(`SELECT c.inventory_item_id, cr.id, cr.customer_name, cr.status, cr.purpose, cr.note, cr.start_date, cr.end_date, cr.start_time, cr.rental_days, cr.returned_at, cr.start_at, cr.ready_at
    FROM reservation_items c JOIN reservations cr ON cr.id = c.reservation_id
    WHERE c.inventory_item_id IN (${placeholders(ids)}) AND cr.status IN ('pending', 'confirmed', 'rented', 'returned')
      AND ((${READY_AS_PLANNED} > ? AND ${EFFECTIVE_START} < ?) OR cr.status = 'rented')
    ORDER BY ${EFFECTIVE_START}, cr.id`)
    .bind(...ids, from, until).all()).results;
  for (const {inventory_item_id, ...row} of rows) bookings.get(inventory_item_id)?.push(row);
  return {items, bookings};
}

// --- Public reservation requests ------------------------------------------------------------------
// Is a item of this product (in this size, if asked) free for the period? Same rule the admin
// form uses, so the customer sees "Có sẵn" only when staff could actually confirm.
/** @param {any} db @param {string} productId @param {{from?: string, to?: string, interval?: any, size?: string, buffer?: number, today?: string, hold?: string}} [options] */
export async function productFree(db, productId, {from, to, interval, size = '', buffer = 0, today, hold = ''} = {}) {
  const items = await itemsForProduct(db, productId, {from, to, interval, buffer, today, hold});
  return items.some(i => i.available && (!size || i.size === size));
}
// The same customer sending the same request twice (double tap, page reload) gets the first one back.
/** @param {any} db @param {any} data */
export async function findOpenRequest(db, {customer_phone, request_product_id, start_date, end_date}) {
  const row = await db.prepare("SELECT * FROM reservations WHERE source = 'public' AND status = 'pending' AND customer_phone = ? AND request_product_id = ? AND start_date = ? AND end_date = ? ORDER BY created_at DESC")
    .bind(customer_phone, request_product_id, start_date, end_date).first();
  return row ? (await attachItems(db, [row]))[0] : null;
}
// Per-IP throttle for the public form: how many requests this client made since `since` (ISO time).
export async function countPublicRequests(db, ipHash, since) {
  return db.prepare('SELECT COUNT(*) AS n FROM public_request_log WHERE ip_hash = ? AND created_at >= ?').bind(ipHash, since).first('n');
}
export async function logPublicRequest(db, ipHash, {keepSince}) {
  await db.batch([
    db.prepare('INSERT INTO public_request_log (ip_hash) VALUES (?)').bind(ipHash),
    db.prepare('DELETE FROM public_request_log WHERE created_at < ?').bind(keepSince)
  ]);
}

// --- Customer notification record -----------------------------------------------------------------
// Staff pressed "customer notified" (or "back to not sent"). Whether the message really went out on
// WhatsApp / Messenger / Zalo is never checked; this is the store's own bookkeeping.
export async function setNotification(db, id, {status, channel = '', note = ''}, now = new Date()) {
  if (!NOTIFICATION_STATUSES.includes(status)) throw new HttpError(400, 'validation_error', 'status must be not_sent or sent.', {fields: {status: 'invalid'}});
  const sent = status === 'sent';
  await db.prepare(`UPDATE reservations SET notification_status = ?, notification_channel = ?, notification_sent_at = ?, notification_note = ?, updated_at = ${NOW} WHERE id = ?`)
    .bind(status, sent ? channel : '', sent ? now.toISOString() : '', note, id).run();
  return getReservation(db, id);
}

// --- Dashboard and the in-admin notification centre -----------------------------------------------
// What staff should act on today. The same lists feed the dashboard cards and the bell in the header.
export async function alerts(db, today) {
  const [returnsToday, pickupsToday, newReservations, overdue, pendingNotifications] = await Promise.all([
    listReservations(db, {from: today, to: today, status: ['rented', 'confirmed', 'pending']}).then(list => list.filter(r => r.end_date === today)),
    listReservations(db, {from: today, to: today, status: ['pending', 'confirmed']}).then(list => list.filter(r => r.start_date === today)),
    // Bookings nobody has confirmed yet.
    listReservations(db, {status: ['pending']}),
    // Handed over, and the return date has passed.
    db.prepare("SELECT * FROM reservations WHERE status = 'rented' AND end_date < ? ORDER BY end_date, created_at").bind(today).all().then(r => attachItems(db, r.results)),
    // Confirmed, but the customer has not been told.
    db.prepare("SELECT * FROM reservations WHERE status = 'confirmed' AND notification_status = 'not_sent' ORDER BY start_date, created_at").all().then(r => attachItems(db, r.results))
  ]);
  return {today, returnsToday, pickupsToday, newReservations, overdue, pendingNotifications};
}
// What happens at the counter on one date, for the staff digest: confirmed pick-ups (rentals and
// fittings), rentals due back, requests nobody has confirmed yet, and -- given `today` -- rentals
// still out after their return date. A timed rental is due at its pick-up time, so both sort by it.
/** @param {any} db @param {string} date @param {{today?: string}} [options] */
export async function dayPlan(db, date, {today = ''} = {}) {
  const rows = sql => db.prepare(sql).bind(date).all().then(result => attachItems(db, result.results));
  const [pickups, returns, unconfirmed, overdue] = await Promise.all([
    rows("SELECT * FROM reservations WHERE status = 'confirmed' AND start_date = ? ORDER BY start_time, created_at"),
    rows("SELECT * FROM reservations WHERE status IN ('confirmed', 'rented') AND purpose = 'rental' AND end_date = ? ORDER BY start_time, created_at"),
    rows("SELECT * FROM reservations WHERE status = 'pending' AND start_date = ? ORDER BY start_time, created_at"),
    today ? db.prepare("SELECT * FROM reservations WHERE status = 'rented' AND end_date < ? ORDER BY end_date, created_at").bind(today).all().then(result => attachItems(db, result.results)) : []
  ]);
  return {date, pickups, returns, unconfirmed, overdue};
}
export async function dashboard(db, today) {
  const count = async (sql, ...params) => db.prepare(sql).bind(...params).first('n');
  const [items, rentedNow, maintenance, upcoming, lists] = await Promise.all([
    count("SELECT COUNT(*) AS n FROM inventory_items WHERE status <> 'inactive'"),
    count("SELECT COUNT(*) AS n FROM reservations WHERE status = 'rented'"),
    count("SELECT COUNT(*) AS n FROM inventory_items WHERE status = 'maintenance'"),
    count("SELECT COUNT(*) AS n FROM reservations WHERE status IN ('pending','confirmed') AND start_date >= ?", today),
    alerts(db, today)
  ]);
  return {items, rentedNow, maintenance, upcoming, ...lists};
}

// --- Web Push subscriptions -----------------------------------------------------------------------
// One row per admin device. Upserting on the endpoint keeps a re-subscribing browser at one row.
export async function listPushSubscriptions(db) {
  return (await db.prepare('SELECT * FROM push_subscriptions ORDER BY created_at').all()).results;
}
export async function savePushSubscription(db, {endpoint, p256dh, auth, label = ''}) {
  await db.prepare(`INSERT INTO push_subscriptions (endpoint, p256dh, auth, label) VALUES (?, ?, ?, ?)
    ON CONFLICT (endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, label = excluded.label, failures = 0`).bind(endpoint, p256dh, auth, label).run();
  return db.prepare('SELECT * FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).first();
}
export async function deletePushSubscription(db, endpoint) {
  const {meta} = await db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).run();
  return meta.changes > 0;
}
export async function recordPushResult(db, endpoint, {ok, gone = false}, now = new Date()) {
  if (gone) return deletePushSubscription(db, endpoint);
  if (ok) await db.prepare(`UPDATE push_subscriptions SET last_sent_at = ?, failures = 0 WHERE endpoint = ?`).bind(now.toISOString(), endpoint).run();
  else await db.prepare(`UPDATE push_subscriptions SET failures = failures + 1 WHERE endpoint = ?`).bind(endpoint).run();
  return true;
}
