// migrations/*.sql apply in order to an empty database and produce the expected schema.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir, readFile} from 'node:fs/promises';
import {TestD1, migratedDatabase} from '../d1-shim.mjs';
import {occupiedInterval} from '../../core/booking/schedule.mjs';

test('0010-0013 preserve a populated v0.3 database and legacy booking intervals', async () => {
  const root = new URL('../../', import.meta.url);
  const folder = new URL('migrations/', root);
  const files = (await readdir(folder)).filter(f => f.endsWith('.sql')).sort();
  const db = new TestD1();
  for (const file of files.filter(f => f.slice(0, 4) <= '0009')) await db.exec(await readFile(new URL(file, folder), 'utf8'));
  for (const seed of ['seed/demo.sql', 'seed/sale-demo.sql']) await db.exec(await readFile(new URL(seed, root), 'utf8'));
  const tables = ['inventory_items', 'reservations', 'reservation_items', 'orders', 'order_items'];
  const before = new Map();
  for (const table of tables) {
    const rows = (await db.prepare(`SELECT * FROM ${table} ORDER BY id`).all()).results;
    assert.ok(rows.length > 0, `${table} has existing data`);
    before.set(table, rows);
  }
  for (const file of files.filter(f => f.slice(0, 4) >= '0010' && f.slice(0, 4) <= '0013')) await db.exec(await readFile(new URL(file, folder), 'utf8'));
  for (const table of tables) {
    const rows = (await db.prepare(`SELECT * FROM ${table} ORDER BY id`).all()).results;
    const original = before.get(table);
    assert.equal(rows.length, original.length, `${table}: row count preserved`);
    for (const [index, row] of rows.entries()) {
      const old = original[index];
      assert.deepEqual(Object.fromEntries(Object.keys(old).map(key => [key, row[key]])), old, `${table}: existing columns preserved`);
      if (table === 'reservations') {
        assert.equal(row.start_time, '');
        assert.equal(row.rental_days, 0);
        assert.equal(row.returned_at, '');
        assert.equal(row.start_at, '');
        assert.equal(row.ready_at, '');
        assert.equal(row.purpose, 'rental');
        assert.deepEqual(occupiedInterval(row, {turnaround: {strategy: 'overnight'}}), occupiedInterval(old), 'legacy holds stay unchanged');
      }
    }
  }
  assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results, []);
  assert.equal((await db.prepare('PRAGMA integrity_check').first()).integrity_check, 'ok');
  const indexes = (await db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'inventory_items' AND name LIKE 'idx_%' ORDER BY name").all()).results.map(row => row.name);
  assert.deepEqual(indexes, ['idx_inventory_items_product', 'idx_inventory_items_status']);
  assert.deepEqual((await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND (name LIKE '%_backup' OR name LIKE '%_new')").all()).results, []);
  await db.prepare("UPDATE inventory_items SET status = 'cleaning' WHERE id = 'sample-rental-001-01'").run();
  assert.equal(await db.prepare("SELECT status FROM inventory_items WHERE id = 'sample-rental-001-01'").first('status'), 'cleaning');
});

test('every migration applies from scratch, in order, and the tables the Worker needs exist', async () => {
  const files = (await readdir(new URL('../../migrations/', import.meta.url))).filter(f => f.endsWith('.sql')).sort();
  assert.deepEqual(files.map(f => f.slice(0, 4)), files.map((_, i) => String(i + 1).padStart(4, '0')), 'migrations are numbered consecutively');
  const db = await migratedDatabase();
  const tables = (await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").bind().all()).results.map(r => r.name);
  assert.deepEqual(tables, ['handoff_exceptions', 'inventory_items', 'order_items', 'orders', 'product_availability', 'public_request_log', 'push_subscriptions', 'reservation_items', 'reservations']);
  const columns = (await db.prepare('PRAGMA table_info(reservations)').bind().all()).results.map(c => c.name);
  for (const column of ['preferred_contact_channel', 'customer_whatsapp', 'customer_zalo_phone', 'customer_messenger_url', 'notification_status', 'source', 'request_product_id', 'request_size', 'privacy_consent', 'privacy_consent_at']) assert(columns.includes(column), column);
});

// 0006 shipped as v0.2.0 and is already applied on live shops, so dine-in arrives as its own
// migration. 0007 rebuilds `orders` to widen a CHECK constraint, and order_items hangs off it with
// ON DELETE CASCADE: this is the test that the lines survive the rebuild.
test('0007 upgrades a v0.2.0 database to dine-in without losing orders or their lines', async () => {
  const folder = new URL('../../migrations/', import.meta.url);
  const db = new TestD1();
  const files = (await readdir(folder)).filter(f => f.endsWith('.sql')).sort();
  for (const file of files.filter(f => !f.startsWith('0007'))) await db.exec(await readFile(new URL(file, folder), 'utf8'));

  await db.prepare("INSERT INTO orders (id, customer_name, fulfillment_type, fulfillment_date, time_slot, subtotal, total) VALUES ('ord-20260101-aaaa', 'Mai', 'pickup', '2026-01-01', '1030', 90000, 90000)").bind().run();
  for (const [product, price] of [['pho-bo-tai', 45000], ['pho-ga', 45000]]) {
    await db.prepare('INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total) VALUES (?, ?, 1, ?, ?)').bind('ord-20260101-aaaa', product, price, price).run();
  }
  await assert.rejects(db.prepare("INSERT INTO orders (id, customer_name, fulfillment_type, fulfillment_date) VALUES ('ord-20260101-bbbb', 'Linh', 'dine_in', '2026-01-01')").bind().run(), 'dine_in is refused before 0007');

  await db.exec(await readFile(new URL('0007_dine_in.sql', folder), 'utf8'));

  const orders = (await db.prepare('SELECT id, fulfillment_type, table_number FROM orders').bind().all()).results;
  assert.deepEqual(orders, [{id: 'ord-20260101-aaaa', fulfillment_type: 'pickup', table_number: ''}], 'the existing order survives with an empty table');
  const items = (await db.prepare('SELECT product_id FROM order_items ORDER BY id').bind().all()).results.map(r => r.product_id);
  assert.deepEqual(items, ['pho-bo-tai', 'pho-ga'], 'the cascade did not eat the order lines');

  await db.prepare("INSERT INTO orders (id, customer_name, fulfillment_type, fulfillment_date, table_number, subtotal, total) VALUES ('ord-20260101-bbbb', 'Linh', 'dine_in', '2026-01-01', '12', 45000, 45000)").bind().run();
  assert.equal(await db.prepare("SELECT table_number FROM orders WHERE id = 'ord-20260101-bbbb'").bind().first('table_number'), '12');

  const indexes = (await db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'orders' AND name LIKE 'idx_%' ORDER BY name").bind().all()).results.map(r => r.name);
  assert.deepEqual(indexes, ['idx_orders_fulfillment', 'idx_orders_notification', 'idx_orders_status'], 'the rebuild put the indexes back');
  const leftovers = (await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND (name LIKE '%_backup' OR name LIKE '%_new')").bind().all()).results;
  assert.deepEqual(leftovers, [], 'no scaffolding table is left behind');
});
