// Repository for sale / pre-orders (migration 0006). Same D1 surface as db.mjs. The invariant
// enforced in SQL: the guarded INSERTs only succeed while the time slot, the day and the product's
// stock still have room, so two customers racing for the last slot cannot both get it.
import {HttpError} from './util.mjs';
import {ORDER_STATUSES, ACTIVE_ORDER_STATUSES} from '../core/orders/rules.mjs';
import {NOTIFICATION_STATUSES} from '../core/notifications/messages.mjs';

export {ORDER_STATUSES, ACTIVE_ORDER_STATUSES};
const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";
const placeholders = list => list.map(() => '?').join(',');
const active = `status IN (${ACTIVE_ORDER_STATUSES.map(s => `'${s}'`).join(',')})`;
const COLUMNS = ['customer_name', 'customer_phone', 'preferred_contact_channel', 'customer_whatsapp', 'customer_messenger_url', 'customer_zalo_phone',
  'fulfillment_type', 'fulfillment_date', 'time_slot', 'table_number', 'recipient_name', 'recipient_phone', 'delivery_address', 'delivery_note', 'message_card', 'note',
  'subtotal', 'delivery_fee', 'total', 'currency', 'status', 'source', 'privacy_consent', 'privacy_consent_at'];
const NUMERIC = new Set(['subtotal', 'delivery_fee', 'total', 'privacy_consent']);
const DEFAULTS = {customer_phone: '', preferred_contact_channel: '', customer_whatsapp: '', customer_messenger_url: '', customer_zalo_phone: '', time_slot: '', table_number: '', recipient_name: '', recipient_phone: '', delivery_address: '', delivery_note: '', message_card: '', note: '', subtotal: 0, delivery_fee: 0, total: 0, currency: 'VND', status: 'pending', source: 'admin', privacy_consent: 0, privacy_consent_at: ''};

function orderId(now = new Date()) {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const random = crypto.getRandomValues(new Uint8Array(4));
  return `ord-${now.toISOString().slice(0, 10).replaceAll('-', '')}-${[...random].map(b => alphabet[b % alphabet.length]).join('')}`;
}
const parse = (value, fallback) => { try { return JSON.parse(value) ?? fallback; } catch { return fallback; } };
function attachItems(db, orders) {
  if (!orders.length) return Promise.resolve(orders);
  const ids = orders.map(o => o.id);
  return db.prepare(`SELECT * FROM order_items WHERE order_id IN (${placeholders(ids)}) ORDER BY id`).bind(...ids).all().then(({results}) => {
    const by = new Map(ids.map(id => [id, []]));
    for (const {order_id, ...item} of results) by.get(order_id).push({...item, options: parse(item.options, {}), addons: parse(item.addons, [])});
    return orders.map(o => ({...o, items: by.get(o.id)}));
  });
}
export async function getOrder(db, id) {
  const row = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
  return row ? (await attachItems(db, [row]))[0] : null;
}
/** @param {any} db @param {{from?: string, to?: string, slot?: string, fulfillment?: string, status?: string[], notification?: string, q?: string, limit?: number}} [filters] */
export async function listOrders(db, {from = '', to = '', slot = '', fulfillment = '', status = [], notification = '', q = '', limit = 300} = {}) {
  const where = [], params = [];
  if (from) { where.push('fulfillment_date >= ?'); params.push(from); }
  if (to) { where.push('fulfillment_date <= ?'); params.push(to); }
  if (slot) { where.push('time_slot = ?'); params.push(slot); }
  if (fulfillment) { where.push('fulfillment_type = ?'); params.push(fulfillment); }
  if (status.length) { where.push(`status IN (${placeholders(status)})`); params.push(...status); }
  if (notification) { where.push('notification_status = ?'); params.push(notification); }
  if (q) { where.push('(customer_name LIKE ? OR customer_phone LIKE ? OR recipient_name LIKE ? OR recipient_phone LIKE ? OR id LIKE ?)'); params.push(...Array(5).fill(`%${q}%`)); }
  const sql = `SELECT * FROM orders${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY fulfillment_date, time_slot, created_at LIMIT ?`;
  return attachItems(db, (await db.prepare(sql).bind(...params, limit).all()).results);
}

// --- Capacity counts -------------------------------------------------------------------------------
// Active orders per day and per (day, slot) for [from, to]: {[date]: {total, slots: {[slot]: n}}}.
export async function countCapacity(db, from, to) {
  const {results} = await db.prepare(`SELECT fulfillment_date AS date, time_slot AS slot, COUNT(*) AS n FROM orders WHERE ${active} AND fulfillment_date >= ? AND fulfillment_date <= ? GROUP BY fulfillment_date, time_slot`).bind(from, to).all();
  const out = {};
  for (const row of results) {
    const day = out[row.date] || (out[row.date] = {total: 0, slots: {}});
    day.total += row.n;
    if (row.slot) day.slots[row.slot] = (day.slots[row.slot] || 0) + row.n;
  }
  return out;
}
// Units sold per product across every active order (a campaign product's stock is a total).
export async function soldByProduct(db) {
  const {results} = await db.prepare(`SELECT i.product_id, SUM(i.quantity) AS n FROM order_items i JOIN orders o ON o.id = i.order_id WHERE o.${active} GROUP BY i.product_id`).all();
  return new Map(results.map(r => [r.product_id, r.n]));
}
// The same count split by the day the order is for, so a product whose stock refills each morning
// can be measured against its own date: {[date]: {[product_id]: units}}.
export async function soldByProductAndDate(db, from, to) {
  const {results} = await db.prepare(`SELECT o.fulfillment_date AS date, i.product_id, SUM(i.quantity) AS n FROM order_items i JOIN orders o ON o.id = i.order_id
    WHERE o.${active} AND o.fulfillment_date >= ? AND o.fulfillment_date <= ? GROUP BY o.fulfillment_date, i.product_id`).bind(from, to).all();
  const out = {};
  for (const row of results) (out[row.date] || (out[row.date] = {}))[row.product_id] = row.n;
  return out;
}

// --- Create ------------------------------------------------------------------------------------------
// `limits` carries what the handler resolved from config: slot capacity, daily capacity and per-product stock.
/** @param {any} db @param {any} data @param {{slotCapacity?: number|null, dailyCapacity?: number|null, stock?: any}} [limits] */
export async function createOrder(db, data, {slotCapacity = null, dailyCapacity = null, stock = {}} = {}) {
  const row = {...DEFAULTS, ...data};
  if (!ORDER_STATUSES.includes(row.status)) throw new HttpError(400, 'validation_error', 'Invalid status.', {fields: {status: 'invalid'}});
  const items = Array.isArray(data.items) ? data.items : [];
  if (!items.length) throw new HttpError(400, 'validation_error', 'An order needs at least one line.', {fields: {items: 'required'}});
  const guard = ACTIVE_ORDER_STATUSES.includes(row.status);
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = orderId();
    if (await db.prepare('SELECT 1 FROM orders WHERE id = ?').bind(id).first()) continue;
    // The order row goes in only while the slot and the day have room; each line only while the product has stock.
    const conditions = [], params = [id, ...COLUMNS.map(c => NUMERIC.has(c) ? Number(row[c] ?? 0) : String(row[c] ?? ''))];
    if (guard && slotCapacity !== null && row.time_slot) { conditions.push(`(SELECT COUNT(*) FROM orders WHERE ${active} AND fulfillment_date = ? AND time_slot = ?) < ?`); params.push(row.fulfillment_date, row.time_slot, slotCapacity); }
    if (guard && dailyCapacity !== null) { conditions.push(`(SELECT COUNT(*) FROM orders WHERE ${active} AND fulfillment_date = ?) < ?`); params.push(row.fulfillment_date, dailyCapacity); }
    const insertOrder = db.prepare(`INSERT INTO orders (id, ${COLUMNS.join(', ')}) SELECT ?, ${placeholders(COLUMNS)}${conditions.length ? ' WHERE ' + conditions.join(' AND ') : ''}`).bind(...params);
    // Lines are inserted only when the order row made it in (so a refused order raises no foreign-key
    // error inside the batch) and, with a stock limit, only while the product still has enough units.
    const batchQuantity = {};
    const insertItems = items.map(item => {
      // A limit is a plain number (counted over every active order) or {limit, daily: true}, which
      // counts only the orders for this same fulfillment date.
      const raw = guard ? stock[item.product_id] ?? null : null;
      const limit = raw === null ? null : typeof raw === 'number' ? raw : raw.limit ?? null;
      const daily = raw !== null && typeof raw === 'object' && raw.daily === true;
      const remainingLimit = limit === null ? null : limit - (batchQuantity[item.product_id] || 0);
      batchQuantity[item.product_id] = (batchQuantity[item.product_id] || 0) + item.quantity;
      const values = [id, item.product_id, item.quantity, JSON.stringify(item.options || {}), JSON.stringify(item.addons || []), item.unit_price, item.line_total];
      const where = ['EXISTS (SELECT 1 FROM orders WHERE id = ?)'], extra = /** @type {any[]} */ ([id]);
      if (remainingLimit !== null) {
        where.push(`(SELECT COALESCE(SUM(i.quantity), 0) FROM order_items i JOIN orders o ON o.id = i.order_id WHERE o.${active}${daily ? ' AND o.fulfillment_date = ?' : ''} AND i.product_id = ? AND o.id <> ?) + ? <= ?`);
        if (daily) extra.push(row.fulfillment_date);
        extra.push(item.product_id, id, item.quantity, remainingLimit);
      }
      return db.prepare(`INSERT INTO order_items (order_id, product_id, quantity, options, addons, unit_price, line_total) SELECT ?, ?, ?, ?, ?, ?, ? WHERE ${where.join(' AND ')}`).bind(...values, ...extra);
    });
    const results = await db.batch([insertOrder, ...insertItems]);
    if (results[0].meta.changes !== 1) throw new HttpError(409, 'capacity_full', 'This time slot is full. Please choose another one.', {fulfillment_date: row.fulfillment_date, time_slot: row.time_slot});
    const short = items.filter((item, i) => results[i + 1].meta.changes !== 1);
    if (short.length) {
      await db.prepare('DELETE FROM orders WHERE id = ?').bind(id).run();
      throw new HttpError(409, 'sold_out', 'This product is sold out.', {product_id: short[0].product_id});
    }
    return getOrder(db, id);
  }
  throw new HttpError(500, 'id_collision', 'Could not allocate an order id; please retry.');
}

// --- Update ------------------------------------------------------------------------------------------
// Staff edits: status, contact, fulfillment details, note. Lines and prices are not edited in place
// (cancel and re-create instead), and capacity is not re-checked: staff know their bench.
const EDITABLE = COLUMNS.filter(c => !['source', 'privacy_consent', 'privacy_consent_at', 'subtotal', 'total', 'currency'].includes(c));
export async function updateOrder(db, id, patch) {
  const current = await getOrder(db, id);
  if (!current) return null;
  const keys = Object.keys(patch).filter(k => EDITABLE.includes(k));
  if (keys.length) {
    const next = {...current, ...patch};
    if ('delivery_fee' in patch) next.total = current.subtotal + Number(patch.delivery_fee || 0);
    const set = [...keys, ...('delivery_fee' in patch ? ['total'] : [])];
    await db.prepare(`UPDATE orders SET ${set.map(k => `${k} = ?`).join(', ')}, updated_at = ${NOW} WHERE id = ?`).bind(...set.map(k => next[k]), id).run();
  }
  return getOrder(db, id);
}
export async function setOrderNotification(db, id, {status, channel = '', note = ''}, now = new Date()) {
  if (!NOTIFICATION_STATUSES.includes(status)) throw new HttpError(400, 'validation_error', 'status must be not_sent or sent.', {fields: {status: 'invalid'}});
  const sent = status === 'sent';
  await db.prepare(`UPDATE orders SET notification_status = ?, notification_channel = ?, notification_sent_at = ?, notification_note = ?, updated_at = ${NOW} WHERE id = ?`)
    .bind(status, sent ? channel : '', sent ? now.toISOString() : '', note, id).run();
  return getOrder(db, id);
}
// The same customer sending the same order twice (double tap, reload) gets the first one back.
export async function findOpenOrder(db, {customer_phone, fulfillment_date, time_slot, items}) {
  const canonical = lines => [...(lines || [])].map(item => ({product_id: item.product_id, quantity: item.quantity, options: item.options || {}, addons: [...(item.addons || [])].sort()})).sort((a, b) => `${a.product_id}${JSON.stringify(a.options)}${a.addons.join(',')}`.localeCompare(`${b.product_id}${JSON.stringify(b.options)}${b.addons.join(',')}`));
  const expected = JSON.stringify(canonical(items));
  const {results} = await db.prepare(`SELECT * FROM orders WHERE source = 'public' AND status = 'pending' AND customer_phone = ? AND fulfillment_date = ? AND time_slot = ? ORDER BY created_at DESC`)
    .bind(customer_phone, fulfillment_date, time_slot || '').all();
  for (const row of await attachItems(db, results)) if (JSON.stringify(canonical(row.items)) === expected) return row;
  return null;
}

// --- Dashboard / alerts --------------------------------------------------------------------------------
export async function orderAlerts(db, today) {
  const [newOrders, todayOrders, pendingNotifications, upcoming] = await Promise.all([
    listOrders(db, {status: ['pending']}),
    listOrders(db, {from: today, to: today, status: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery']}),
    db.prepare("SELECT * FROM orders WHERE status <> 'pending' AND status <> 'cancelled' AND notification_status = 'not_sent' ORDER BY fulfillment_date, created_at").all().then(r => attachItems(db, r.results)),
    db.prepare(`SELECT COUNT(*) AS n FROM orders WHERE ${active} AND status <> 'completed' AND fulfillment_date > ?`).bind(today).first('n')
  ]);
  return {
    newOrders,
    orderPickupsToday: todayOrders.filter(o => o.fulfillment_type === 'pickup'),
    orderDeliveriesToday: todayOrders.filter(o => o.fulfillment_type === 'delivery'),
    orderNotifications: pendingNotifications,
    upcomingOrders: upcoming
  };
}

// --- Staff sold-out override ---------------------------------------------------------------------------
// One row per product staff switched off by hand. Absent row = whatever the catalog says.
export async function soldOutProducts(db) {
  const {results} = await db.prepare('SELECT product_id FROM product_availability WHERE sold_out = 1').all();
  return new Set(results.map(r => r.product_id));
}
/** @param {any} db @param {string} productId @param {boolean} soldOut */
export async function setProductSoldOut(db, productId, soldOut) {
  await db.prepare(`INSERT INTO product_availability (product_id, sold_out, updated_at) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ON CONFLICT (product_id) DO UPDATE SET sold_out = excluded.sold_out, updated_at = excluded.updated_at`).bind(productId, soldOut ? 1 : 0).run();
  return {product_id: productId, sold_out: soldOut};
}
