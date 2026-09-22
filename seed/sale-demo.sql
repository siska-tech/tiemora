-- Tiemora Core v0.2 sale/order demo data. Fictional only: a handful of orders in different states
-- for the sample sale products in examples/sale/, so the Orders admin (list, detail, schedule,
-- dashboard) has something to show. Point config/store.yaml `catalog.dir` at `examples/sale` (or a
-- folder that includes it) before seeding, and apply after the migrations:
--   npm run db:seed:local   (or db:seed for the remote database)
-- Safe to run twice: existing rows are skipped (order lines are guarded by their order id).

-- 1. A new pre-order from the website, waiting for confirmation (pickup).
INSERT OR IGNORE INTO orders (id, status, source, customer_name, customer_phone, preferred_contact_channel, customer_zalo_phone,
  fulfillment_type, fulfillment_date, message_card, note, subtotal, delivery_fee, total, currency, privacy_consent, privacy_consent_at)
VALUES ('ord-demo-0001', 'pending', 'public', 'Nguyen Van A (demo)', '0900000001', 'zalo', '0900000001',
  'pickup', date('now', '+3 days'), '', '', 250000, 0, 250000, 'VND', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
INSERT INTO order_items (order_id, product_id, quantity, options, addons, unit_price, line_total)
SELECT 'ord-demo-0001', 'sample-gift-001', 1, '{"size":"small"}', '[]', 250000, 250000 WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE order_id = 'ord-demo-0001');

-- 2. A confirmed delivery order with a gift-wrap add-on, customer already notified on Messenger.
INSERT OR IGNORE INTO orders (id, status, source, customer_name, customer_phone, preferred_contact_channel, customer_messenger_url,
  fulfillment_type, fulfillment_date, recipient_name, recipient_phone, delivery_address, delivery_note, message_card, note,
  subtotal, delivery_fee, total, currency, notification_status, notification_channel, notification_sent_at, privacy_consent, privacy_consent_at)
VALUES ('ord-demo-0002', 'confirmed', 'public', 'Tran Thi B (demo)', '0900000002', 'messenger', 'https://m.me/example',
  'delivery', date('now', '+2 days'), 'Le Van C (demo)', '0900000003', 'Sample address, District 1, Ho Chi Minh City (fictional)', 'Call before arriving', 'Thank you!', '',
  320000, 30000, 350000, 'VND', 'sent', 'messenger', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
INSERT INTO order_items (order_id, product_id, quantity, options, addons, unit_price, line_total)
SELECT 'ord-demo-0002', 'sample-gift-001', 1, '{"size":"medium"}', '["giftwrap"]', 320000, 320000 WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE order_id = 'ord-demo-0002');

-- 3. A staff-entered order (customer called in), being prepared: two units.
INSERT OR IGNORE INTO orders (id, status, source, customer_name, customer_phone, preferred_contact_channel,
  fulfillment_type, fulfillment_date, note, subtotal, delivery_fee, total, currency, notification_status, notification_channel, notification_sent_at)
VALUES ('ord-demo-0003', 'preparing', 'admin', 'Sample Company (demo)', '0900000004', 'phone',
  'pickup', date('now', '+1 day'), 'Invoice to the company', 360000, 0, 360000, 'VND', 'sent', 'phone', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
INSERT INTO order_items (order_id, product_id, quantity, options, addons, unit_price, line_total)
SELECT 'ord-demo-0003', 'sample-product-002', 2, '{}', '[]', 180000, 360000 WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE order_id = 'ord-demo-0003');

-- 4. A pre-order picked up yesterday, completed.
INSERT OR IGNORE INTO orders (id, status, source, customer_name, customer_phone, preferred_contact_channel, customer_whatsapp,
  fulfillment_type, fulfillment_date, subtotal, delivery_fee, total, currency, notification_status, notification_channel, notification_sent_at, privacy_consent, privacy_consent_at)
VALUES ('ord-demo-0004', 'completed', 'public', 'Pham Thi D (demo)', '0900000005', 'whatsapp', '0900000005',
  'pickup', date('now', '-1 day'), 350000, 0, 350000, 'VND', 'sent', 'whatsapp', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
INSERT INTO order_items (order_id, product_id, quantity, options, addons, unit_price, line_total)
SELECT 'ord-demo-0004', 'sample-preorder-003', 1, '{"size":"large"}', '[]', 350000, 350000 WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE order_id = 'ord-demo-0004');

-- 5. A cancelled order: frees its stock, stays in the list for the record.
INSERT OR IGNORE INTO orders (id, status, source, customer_name, customer_phone, preferred_contact_channel, customer_zalo_phone,
  fulfillment_type, fulfillment_date, subtotal, delivery_fee, total, currency, privacy_consent, privacy_consent_at)
VALUES ('ord-demo-0005', 'cancelled', 'public', 'Do Van E (demo)', '0900000006', 'zalo', '0900000006',
  'pickup', date('now', '+4 days'), 180000, 0, 180000, 'VND', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
INSERT INTO order_items (order_id, product_id, quantity, options, addons, unit_price, line_total)
SELECT 'ord-demo-0005', 'sample-product-002', 1, '{}', '[]', 180000, 180000 WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE order_id = 'ord-demo-0005');
