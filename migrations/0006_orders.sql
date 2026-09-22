-- Orders for `type: sale` products (pre-orders, pickup / delivery). A separate model from rental
-- reservations: no physical inventory item is assigned, capacity is counted (orders per time slot,
-- orders per day, units per product) against the limits in config/store.yaml and product.yaml.
-- Product names, prices and option labels stay in catalog.json / store.json; the rows only keep the
-- ids the customer chose and the prices as they were at order time.
CREATE TABLE orders (
  id                       TEXT PRIMARY KEY,                                -- ord-YYYYMMDD-xxxx, doubles as the order number
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
  -- Fulfillment: how, which day (YYYY-MM-DD in the store's zone) and which time slot (id from config).
  fulfillment_type         TEXT NOT NULL CHECK (fulfillment_type IN ('pickup', 'delivery')),
  fulfillment_date         TEXT NOT NULL CHECK (fulfillment_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  time_slot                TEXT NOT NULL DEFAULT '',
  recipient_name           TEXT NOT NULL DEFAULT '',
  recipient_phone          TEXT NOT NULL DEFAULT '',
  delivery_address         TEXT NOT NULL DEFAULT '',
  delivery_note            TEXT NOT NULL DEFAULT '',
  message_card             TEXT NOT NULL DEFAULT '',
  note                     TEXT NOT NULL DEFAULT '',
  -- Money as it was when the order was placed (whole units of `currency`).
  subtotal                 INTEGER NOT NULL DEFAULT 0,
  delivery_fee             INTEGER NOT NULL DEFAULT 0,
  total                    INTEGER NOT NULL DEFAULT 0,
  currency                 TEXT NOT NULL DEFAULT 'VND',
  -- "Did we tell the customer?" bookkeeping, same as reservations (0002).
  notification_status      TEXT NOT NULL DEFAULT 'not_sent' CHECK (notification_status IN ('not_sent', 'sent')),
  notification_channel     TEXT NOT NULL DEFAULT '' CHECK (notification_channel IN ('', 'whatsapp', 'messenger', 'zalo', 'phone', 'copy', 'other')),
  notification_sent_at     TEXT NOT NULL DEFAULT '',
  notification_note        TEXT NOT NULL DEFAULT '',
  privacy_consent          INTEGER NOT NULL DEFAULT 0 CHECK (privacy_consent IN (0, 1)),
  privacy_consent_at       TEXT NOT NULL DEFAULT '',
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_orders_fulfillment  ON orders (fulfillment_date, time_slot, status);
CREATE INDEX idx_orders_status       ON orders (status);
CREATE INDEX idx_orders_notification ON orders (notification_status, status);

-- The lines of an order. options = JSON object {group: choiceId}, addons = JSON list of ids.
CREATE TABLE order_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id  TEXT NOT NULL,
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  options     TEXT NOT NULL DEFAULT '{}',
  addons      TEXT NOT NULL DEFAULT '[]',
  unit_price  INTEGER NOT NULL DEFAULT 0,
  line_total  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_order_items_order   ON order_items (order_id);
CREATE INDEX idx_order_items_product ON order_items (product_id);
