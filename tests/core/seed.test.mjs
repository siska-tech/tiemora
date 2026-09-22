// scripts/generate-seed.mjs and seed/demo.sql, applied to a freshly migrated database.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {seedSql} from '../../scripts/generate-seed.mjs';
import {migratedDatabase} from '../d1-shim.mjs';

test('the generated seed creates one item per managed product and can be run twice', async () => {
  const products = [
    {id: 'sample-rental-001', name: {vi: "Trang phục 'mẫu'"}, sizes: ['M', 'L'], inventory: {managed: true}},
    {id: 'sample-rental-002', name: {vi: 'Không quản lý'}, inventory: {managed: false}},
    {id: 'sample-rental-003', name: 'Chưa có cờ'},
    {id: 'sample-rental-004', name: {vi: 'Một cỡ'}, inventory: {managed: true}}
  ];
  const sql = seedSql(products);
  assert.match(sql, /INSERT OR IGNORE/);
  const db = await migratedDatabase();
  await db.exec(sql);
  await db.exec(sql);
  const rows = (await db.prepare('SELECT id, product_id, size, status, note FROM inventory_items ORDER BY id').all()).results;
  assert.deepEqual(rows, [
    {id: 'sample-rental-001-01', product_id: 'sample-rental-001', size: 'M', status: 'available', note: 'seed'},
    {id: 'sample-rental-004-01', product_id: 'sample-rental-004', size: '', status: 'available', note: 'seed'}
  ]);
  assert.doesNotMatch(seedSql([]), /INSERT/);
});

test('seed/demo.sql applies to an empty database twice and leaves the documented demo state', async () => {
  const sql = await readFile(new URL('../../seed/demo.sql', import.meta.url), 'utf8');
  const db = await migratedDatabase();
  await db.exec(sql);
  await db.exec(sql);
  const items = (await db.prepare('SELECT id, status FROM inventory_items ORDER BY id').all()).results;
  assert.deepEqual(items, [
    {id: 'sample-rental-001-01', status: 'available'}, {id: 'sample-rental-001-02', status: 'available'},
    {id: 'sample-rental-001-03', status: 'maintenance'}, {id: 'sample-rental-002-01', status: 'rented'}
  ]);
  const reservations = (await db.prepare('SELECT id, status, source, request_product_id, privacy_consent FROM reservations ORDER BY id').all()).results;
  assert.deepEqual(reservations, [
    {id: 'rsv-demo-0001', status: 'confirmed', source: 'public', request_product_id: '', privacy_consent: 1},
    {id: 'rsv-demo-0002', status: 'rented', source: 'admin', request_product_id: '', privacy_consent: 0},
    {id: 'rsv-demo-0003', status: 'pending', source: 'public', request_product_id: 'sample-rental-001', privacy_consent: 1}
  ]);
  assert.equal(await db.prepare('SELECT COUNT(*) AS n FROM reservation_items').bind().first('n'), 2);
  assert.equal(await db.prepare('SELECT COUNT(*) AS n FROM push_subscriptions').bind().first('n'), 0);
});
