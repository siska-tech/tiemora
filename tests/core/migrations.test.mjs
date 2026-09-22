// migrations/*.sql apply in order to an empty database and produce the expected schema.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir} from 'node:fs/promises';
import {migratedDatabase} from '../d1-shim.mjs';

test('every migration applies from scratch, in order, and the tables the Worker needs exist', async () => {
  const files = (await readdir(new URL('../../migrations/', import.meta.url))).filter(f => f.endsWith('.sql')).sort();
  assert.deepEqual(files.map(f => f.slice(0, 4)), files.map((_, i) => String(i + 1).padStart(4, '0')), 'migrations are numbered consecutively');
  const db = await migratedDatabase();
  const tables = (await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").bind().all()).results.map(r => r.name);
  assert.deepEqual(tables, ['inventory_items', 'order_items', 'orders', 'public_request_log', 'push_subscriptions', 'reservation_items', 'reservations']);
  const columns = (await db.prepare('PRAGMA table_info(reservations)').bind().all()).results.map(c => c.name);
  for (const column of ['preferred_contact_channel', 'customer_whatsapp', 'customer_zalo_phone', 'customer_messenger_url', 'notification_status', 'source', 'request_product_id', 'request_size', 'privacy_consent', 'privacy_consent_at']) assert(columns.includes(column), column);
});
