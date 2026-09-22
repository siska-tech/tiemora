// The repository: every SQL statement lives here. Handlers in api.mjs validate input and shape
// responses; the domain rules (statuses, overlap, availability summary) come from core/booking and
// core/inventory. The one invariant this module enforces in SQL: an inventory item can only be in
// one active reservation at a time, where two reservations clash when
//   existing.start_date <= requested.end_date AND existing.end_date >= requested.start_date
// (inclusive calendar days, optionally padded by a buffer of free days between rentals).
//
// `db` is anything that speaks the D1 prepared-statement interface:
//   db.prepare(sql).bind(...params).{all()|first(column?)|run()} and db.batch([statements])
// Cloudflare D1 does natively; tests/d1-shim.mjs implements the same surface over node:sqlite, and
// a SQLite/PostgreSQL adapter for another host only has to provide these five calls.
import {HttpError} from './util.mjs';
import {paddedPeriod} from '../core/booking/dates.mjs';
import {RESERVATION_STATUSES, OCCUPYING, isRequest, itemsRequirement, summarize} from '../core/booking/rules.mjs';
import {ITEM_STATUSES, BLOCKED_ITEM, OUT_NOW} from '../core/inventory/statuses.mjs';
import {NOTIFICATION_STATUSES} from '../core/notifications/messages.mjs';

export {ITEM_STATUSES, RESERVATION_STATUSES, OCCUPYING, BLOCKED_ITEM, isRequest, summarize};
// Customer contact details (migration 0002) and the public-request fields (0003) saved with a
// booking. The notification_* columns are written only by setNotification(), so editing a booking
// never clears "sent".
const EXTRA_COLUMNS = ['preferred_contact_channel', 'customer_whatsapp', 'customer_messenger_url', 'customer_zalo_phone', 'source', 'request_product_id', 'request_size', 'privacy_consent', 'privacy_consent_at'];

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";
const placeholders = list => list.map(() => '?').join(',');
const occupying = `cr.status IN (${OCCUPYING.map(s => `'${s}'`).join(',')})`;
// Params: buffered end, buffered start, excluded reservation id.
const overlap = `cr.start_date <= ? AND cr.end_date >= ? AND cr.id <> ?`;

const padded = paddedPeriod;

// --- Inventory ------------------------------------------------------------------------------------
/** @param {any} db @param {{product_id?: string, status?: string}} [filters] */
export async function listInventory(db, {product_id, status} = {}) {
  const where = [], params = [];
  if (product_id) { where.push('product_id = ?'); params.push(product_id); }
  if (status) { where.push('status = ?'); params.push(status); }
  const sql = `SELECT * FROM inventory_items${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY product_id, id`;
  return (await db.prepare(sql).bind(...params).all()).results;
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
/** @param {any} db @param {string[]} itemIds @param {string} from @param {string} to @param {{buffer?: number, exclude?: string}} [options] */
export async function listConflicts(db, itemIds, from, to, {buffer = 0, exclude = ''} = {}) {
  if (!itemIds.length) return [];
  const {start, end} = padded(from, to, buffer);
  const sql = `SELECT c.inventory_item_id, cr.id AS reservation_id, cr.start_date, cr.end_date, cr.status, cr.customer_name
    FROM reservation_items c JOIN reservations cr ON cr.id = c.reservation_id
    WHERE c.inventory_item_id IN (${placeholders(itemIds)}) AND ${occupying} AND ${overlap}
    ORDER BY cr.start_date`;
  return (await db.prepare(sql).bind(...itemIds, end, start, exclude).all()).results;
}
// Availability of every managed product for [from, to]; two queries however many products there are.
/** @param {any} db @param {string} from @param {string} to @param {{buffer?: number, today?: string}} [options] */
export async function availabilityByProduct(db, from, to, {buffer = 0, today} = {}) {
  const {start, end} = padded(from, to, buffer);
  const items = (await db.prepare("SELECT id, product_id, status FROM inventory_items WHERE status <> 'inactive'").all()).results;
  const conflicts = (await db.prepare(`SELECT DISTINCT c.inventory_item_id FROM reservation_items c JOIN reservations cr ON cr.id = c.reservation_id WHERE ${occupying} AND ${overlap}`).bind(end, start, '').all()).results;
  const conflictIds = new Set(conflicts.map(c => c.inventory_item_id));
  const includesToday = Boolean(today) && from <= today && today <= to;
  const grouped = new Map();
  for (const item of items) (grouped.get(item.product_id) || grouped.set(item.product_id, []).get(item.product_id)).push(item);
  return new Map([...grouped].map(([productId, list]) => [productId, summarize(list, conflictIds, {includesToday})]));
}
// The admin form's candidate list: every item of a product with whether it is free for [from, to].
/** @param {any} db @param {string} productId @param {{from?: string, to?: string, buffer?: number, exclude?: string, today?: string}} [options] */
export async function itemsForProduct(db, productId, {from, to, buffer = 0, exclude = '', today} = {}) {
  const items = await listInventory(db, {product_id: productId});
  if (!from) return items.map(item => ({...item, available: !BLOCKED_ITEM.includes(item.status), conflicts: []}));
  const conflicts = await listConflicts(db, items.map(i => i.id), from, to, {buffer, exclude});
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
function guardedItemInsert(db, reservation, item, {buffer, guard}) {
  const {start, end} = padded(reservation.start_date, reservation.end_date, buffer);
  const sql = `INSERT INTO reservation_items (reservation_id, inventory_item_id, product_id) SELECT ?, ?, ?` + (guard
    ? ` WHERE NOT EXISTS (SELECT 1 FROM reservation_items c JOIN reservations cr ON cr.id = c.reservation_id WHERE c.inventory_item_id = ? AND ${occupying} AND ${overlap})`
    : '');
  const params = [reservation.id, item.id, item.product_id];
  if (guard) params.push(item.id, end, start, reservation.id);
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

/** @param {any} db @param {any} data @param {{buffer?: number, today?: string}} [context] */
export async function createReservation(db, data, {buffer = 0} = {}) {
  data = {source: 'admin', request_product_id: '', request_size: '', privacy_consent: 0, privacy_consent_at: '', items: [], ...data};
  requireItemsUnlessRequest(data.items, data);
  const items = await requireBookableItems(db, data.items);
  const guard = OCCUPYING.includes(data.status);
  if (guard) {
    const conflicts = await listConflicts(db, data.items, data.start_date, data.end_date, {buffer});
    if (conflicts.length) throw conflictError(conflicts);
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const reservation = {...data, id: reservationId()};
    if (await db.prepare('SELECT 1 FROM reservations WHERE id = ?').bind(reservation.id).first()) continue;
    const results = await db.batch([
      db.prepare(`INSERT INTO reservations (id, customer_name, customer_phone, customer_facebook, start_date, end_date, status, note, ${EXTRA_COLUMNS.join(', ')}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${placeholders(EXTRA_COLUMNS)})`)
        .bind(reservation.id, data.customer_name, data.customer_phone, data.customer_facebook, data.start_date, data.end_date, data.status, data.note, ...EXTRA_COLUMNS.map(c => data[c] ?? '')),
      ...items.map(item => guardedItemInsert(db, reservation, item, {buffer, guard})),
      ...itemStatusEffects(db, reservation, data.items)
    ]);
    if (!insertedAll(results, 1, items.length)) {
      await db.prepare('DELETE FROM reservations WHERE id = ?').bind(reservation.id).run();
      throw conflictError(await listConflicts(db, data.items, data.start_date, data.end_date, {buffer}));
    }
    return getReservation(db, reservation.id);
  }
  throw new HttpError(500, 'id_collision', 'Could not allocate a reservation id; please retry.');
}

/** @param {any} db @param {string} id @param {any} patch @param {{buffer?: number, today?: string}} [context] */
export async function updateReservation(db, id, patch, {buffer = 0} = {}) {
  const current = await getReservation(db, id);
  if (!current) return null;
  const next = {...current, ...patch, id};
  const itemIds = patch.items ?? current.items.map(i => i.inventory_item_id);
  requireItemsUnlessRequest(itemIds, next);
  // The clash check reruns whenever the booking (re)claims its items: new items, new dates, or a
  // status change from a non-holding status back into a holding one.
  const guard = OCCUPYING.includes(next.status) && Boolean(patch.items || patch.start_date || patch.end_date || !OCCUPYING.includes(current.status));
  const items = await requireBookableItems(db, itemIds).catch(error => {
    // Items already on the booking may have gone into maintenance since; that must not block marking it returned.
    if (error.error === 'inventory_unavailable' && !patch.items && !guard) return current.items.map(i => ({id: i.inventory_item_id, product_id: i.product_id}));
    throw error;
  });
  if (guard) {
    const conflicts = await listConflicts(db, itemIds, next.start_date, next.end_date, {buffer, exclude: id});
    if (conflicts.length) throw conflictError(conflicts);
  }
  const update = row => db.prepare(`UPDATE reservations SET customer_name = ?, customer_phone = ?, customer_facebook = ?, start_date = ?, end_date = ?, status = ?, note = ?, ${EXTRA_COLUMNS.map(c => `${c} = ?`).join(', ')}, updated_at = ${NOW} WHERE id = ?`)
    .bind(row.customer_name, row.customer_phone, row.customer_facebook, row.start_date, row.end_date, row.status, row.note, ...EXTRA_COLUMNS.map(c => row[c] ?? ''), id);
  const clear = db.prepare('DELETE FROM reservation_items WHERE reservation_id = ?').bind(id);
  const results = await db.batch([
    update(next), clear,
    ...items.map(item => guardedItemInsert(db, next, item, {buffer, guard})),
    ...itemStatusEffects(db, next, itemIds)
  ]);
  if (!insertedAll(results, 2, items.length)) {
    // Another request took one of the items between the check and the write: put everything back.
    await db.batch([update(current), clear, ...current.items.map(item => guardedItemInsert(db, current, {id: item.inventory_item_id, product_id: item.product_id}, {buffer, guard: false}))]);
    throw conflictError(await listConflicts(db, itemIds, next.start_date, next.end_date, {buffer, exclude: id}));
  }
  return getReservation(db, id);
}

// Staff pressed "confirm". A request gets a free item of the product it asked for (same size when
// one was asked for) assigned right now; a booking that already holds its items just changes status.
// Either way the period clash check inside updateReservation() runs again, so a item taken since
// the request came in answers 409 instead of silently double-booking.
/** @param {any} db @param {string} id @param {{buffer?: number, today?: string}} [context] */
export async function confirmReservation(db, id, {buffer = 0, today} = {}) {
  const current = await getReservation(db, id);
  if (!current) return null;
  if (current.status !== 'pending') throw new HttpError(409, 'not_pending', `Reservation ${id} is ${current.status}, not pending.`);
  const patch = {status: 'confirmed'};
  if (isRequest(current)) {
    const candidates = (await itemsForProduct(db, current.request_product_id, {from: current.start_date, to: current.end_date, buffer, exclude: id, today})).filter(i => i.available);
    const chosen = candidates.find(i => !current.request_size || i.size === current.request_size);
    if (!chosen) {
      throw new HttpError(409, 'inventory_unavailable', current.request_size && candidates.length
        ? `No free ${current.request_product_id} in size ${current.request_size} for ${current.start_date} – ${current.end_date}; other sizes are free.`
        : `No free ${current.request_product_id} for ${current.start_date} – ${current.end_date}.`, {product_id: current.request_product_id, size: current.request_size, otherSizes: candidates.map(i => i.size)});
    }
    patch.items = [chosen.id];
  }
  return updateReservation(db, id, patch, {buffer});
}

// --- Public reservation requests ------------------------------------------------------------------
// Is a item of this product (in this size, if asked) free for the period? Same rule the admin
// form uses, so the customer sees "Có sẵn" only when staff could actually confirm.
/** @param {any} db @param {string} productId @param {{from?: string, to?: string, size?: string, buffer?: number, today?: string}} [options] */
export async function productFree(db, productId, {from, to, size = '', buffer = 0, today} = {}) {
  const items = await itemsForProduct(db, productId, {from, to, buffer, today});
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
