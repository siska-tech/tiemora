-- Tiemora demo data. Fictional only: sample products from examples/catalog/, a few inventory items,
-- one confirmed booking, one rental in progress and one pending request from the "public site".
-- Apply after the migrations:  npm run db:seed:local   (or db:seed for the remote database).
-- Safe to run twice: existing rows are skipped.

INSERT OR IGNORE INTO inventory_items (id, product_id, size, status, note) VALUES
  ('sample-rental-001-01', 'sample-rental-001', 'M', 'available', 'demo'),
  ('sample-rental-001-02', 'sample-rental-001', 'L', 'available', 'demo'),
  ('sample-rental-001-03', 'sample-rental-001', 'L', 'maintenance', 'demo: button missing'),
  ('sample-rental-002-01', 'sample-rental-002', 'Free', 'available', 'demo');

-- A confirmed booking next week, customer already notified via Zalo.
INSERT OR IGNORE INTO reservations (id, customer_name, customer_phone, customer_facebook, start_date, end_date, status, note,
  preferred_contact_channel, customer_zalo_phone, notification_status, notification_channel, notification_sent_at, source, privacy_consent, privacy_consent_at)
VALUES ('rsv-demo-0001', 'Nguyen Van A (demo)', '0900000001', '', date('now', '+7 days'), date('now', '+9 days'), 'confirmed', 'Demo booking',
  'zalo', '0900000001', 'sent', 'zalo', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'public', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
INSERT OR IGNORE INTO reservation_items (reservation_id, inventory_item_id, product_id) VALUES ('rsv-demo-0001', 'sample-rental-001-01', 'sample-rental-001');

-- A rental handed over yesterday and due back in two days (the item is out).
INSERT OR IGNORE INTO reservations (id, customer_name, customer_phone, customer_facebook, start_date, end_date, status, note,
  preferred_contact_channel, customer_whatsapp, notification_status, notification_channel, notification_sent_at, source, privacy_consent)
VALUES ('rsv-demo-0002', 'Tran Thi B (demo)', '0900000002', '', date('now', '-1 day'), date('now', '+2 days'), 'rented', 'Demo rental in progress',
  'whatsapp', '0900000002', 'sent', 'whatsapp', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'admin', 0);
INSERT OR IGNORE INTO reservation_items (reservation_id, inventory_item_id, product_id) VALUES ('rsv-demo-0002', 'sample-rental-002-01', 'sample-rental-002');
UPDATE inventory_items SET status = 'rented' WHERE id = 'sample-rental-002-01' AND status = 'available';

-- A pending request from the public booking form: names the product and size, holds no item yet.
-- Open it in /admin/ and press "Confirm" to see an item get assigned.
INSERT OR IGNORE INTO reservations (id, customer_name, customer_phone, customer_facebook, start_date, end_date, status, note,
  preferred_contact_channel, customer_messenger_url, source, request_product_id, request_size, privacy_consent, privacy_consent_at)
VALUES ('rsv-demo-0003', 'Le Van C (demo)', '0900000003', '', date('now', '+14 days'), date('now', '+16 days'), 'pending', 'Demo request from the website',
  'messenger', 'https://m.me/example', 'public', 'sample-rental-001', 'L', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
