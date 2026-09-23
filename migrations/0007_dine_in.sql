-- Dine-in orders: a third fulfillment type next to pickup / delivery, and the table the customer
-- sits at. A table number is order metadata, not inventory: nothing is reserved by it, it only tells
-- staff where to carry the bowl. Stores that never enable `ordering.fulfillment.dine_in` are
-- unaffected -- the column stays '' and the widened CHECK accepts everything it accepted before.
--
-- `fulfillment_type` carries a CHECK constraint from 0006, and SQLite cannot widen one in place, so
-- the table is rebuilt. order_items references orders with ON DELETE CASCADE, which means DROP TABLE
-- orders would empty it: the lines are copied aside first and put back once the new table is in place.

CREATE TABLE order_items_backup AS SELECT * FROM order_items;

CREATE TABLE orders_new (
  id                       TEXT PRIMARY KEY,
  status                   TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled')),
  source                   TEXT NOT NULL DEFAULT 'public' CHECK (source IN ('admin', 'public')),
  customer_name            TEXT NOT NULL,
  customer_phone           TEXT NOT NULL DEFAULT '',
  preferred_contact_channel TEXT NOT NULL DEFAULT ''
                           CHECK (preferred_contact_channel IN ('', 'messenger', 'zalo', 'whatsapp', 'phone', 'other')),
  customer_whatsapp        TEXT NOT NULL DEFAULT '',
  customer_messenger_url   TEXT NOT NULL DEFAULT '',
  customer_zalo_phone      TEXT NOT NULL DEFAULT '',
  fulfillment_type         TEXT NOT NULL CHECK (fulfillment_type IN ('pickup', 'delivery', 'dine_in')),
  fulfillment_date         TEXT NOT NULL CHECK (fulfillment_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  time_slot                TEXT NOT NULL DEFAULT '',
  -- '' for pickup / delivery; a whole number as text for dine-in (the range comes from config).
  table_number             TEXT NOT NULL DEFAULT '',
  recipient_name           TEXT NOT NULL DEFAULT '',
  recipient_phone          TEXT NOT NULL DEFAULT '',
  delivery_address         TEXT NOT NULL DEFAULT '',
  delivery_note            TEXT NOT NULL DEFAULT '',
  message_card             TEXT NOT NULL DEFAULT '',
  note                     TEXT NOT NULL DEFAULT '',
  subtotal                 INTEGER NOT NULL DEFAULT 0,
  delivery_fee             INTEGER NOT NULL DEFAULT 0,
  total                    INTEGER NOT NULL DEFAULT 0,
  currency                 TEXT NOT NULL DEFAULT 'VND',
  notification_status      TEXT NOT NULL DEFAULT 'not_sent' CHECK (notification_status IN ('not_sent', 'sent')),
  notification_channel     TEXT NOT NULL DEFAULT '' CHECK (notification_channel IN ('', 'whatsapp', 'messenger', 'zalo', 'phone', 'copy', 'other')),
  notification_sent_at     TEXT NOT NULL DEFAULT '',
  notification_note        TEXT NOT NULL DEFAULT '',
  privacy_consent          INTEGER NOT NULL DEFAULT 0 CHECK (privacy_consent IN (0, 1)),
  privacy_consent_at       TEXT NOT NULL DEFAULT '',
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO orders_new (
  id, status, source, customer_name, customer_phone, preferred_contact_channel,
  customer_whatsapp, customer_messenger_url, customer_zalo_phone,
  fulfillment_type, fulfillment_date, time_slot, table_number,
  recipient_name, recipient_phone, delivery_address, delivery_note, message_card, note,
  subtotal, delivery_fee, total, currency,
  notification_status, notification_channel, notification_sent_at, notification_note,
  privacy_consent, privacy_consent_at, created_at, updated_at
)
SELECT
  id, status, source, customer_name, customer_phone, preferred_contact_channel,
  customer_whatsapp, customer_messenger_url, customer_zalo_phone,
  fulfillment_type, fulfillment_date, time_slot, '',
  recipient_name, recipient_phone, delivery_address, delivery_note, message_card, note,
  subtotal, delivery_fee, total, currency,
  notification_status, notification_channel, notification_sent_at, notification_note,
  privacy_consent, privacy_consent_at, created_at, updated_at
FROM orders;

DROP TABLE orders;
ALTER TABLE orders_new RENAME TO orders;

CREATE INDEX idx_orders_fulfillment  ON orders (fulfillment_date, time_slot, status);
CREATE INDEX idx_orders_status       ON orders (status);
CREATE INDEX idx_orders_notification ON orders (notification_status, status);

-- The cascade emptied order_items when the old table went away; put the lines back.
DELETE FROM order_items;
INSERT INTO order_items (id, order_id, product_id, quantity, options, addons, unit_price, line_total, created_at)
  SELECT id, order_id, product_id, quantity, options, addons, unit_price, line_total, created_at FROM order_items_backup;
DROP TABLE order_items_backup;
