-- Tiemora: physical inventory items and reservations.
-- Product master data (names, prices, images) stays in product.yaml / catalog.json;
-- this database only holds what changes day to day: the physical items and their bookings.

-- One row per physical item. id = <product_id>-<2 digit sequence>, e.g. sample-rental-001-01.
CREATE TABLE inventory_items (
  id         TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  size       TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'available'
             CHECK (status IN ('available', 'reserved', 'rented', 'maintenance', 'inactive')),
  note       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_inventory_items_product ON inventory_items (product_id);
CREATE INDEX idx_inventory_items_status  ON inventory_items (status);

-- A booking. Dates are inclusive ISO calendar days (YYYY-MM-DD) in the store's local time.
CREATE TABLE reservations (
  id                TEXT PRIMARY KEY,
  customer_name     TEXT NOT NULL,
  customer_phone    TEXT NOT NULL DEFAULT '',
  customer_facebook TEXT NOT NULL DEFAULT '',
  start_date        TEXT NOT NULL CHECK (start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  end_date          TEXT NOT NULL CHECK (end_date   GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'confirmed', 'rented', 'returned', 'cancelled')),
  note              TEXT NOT NULL DEFAULT '',
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (start_date <= end_date)
);
CREATE INDEX idx_reservations_dates  ON reservations (start_date, end_date);
CREATE INDEX idx_reservations_status ON reservations (status);

-- The items inside a reservation (one reservation can hold several).
-- product_id is copied from inventory_items so lists never need the catalog to group by product.
CREATE TABLE reservation_items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id    TEXT NOT NULL REFERENCES reservations (id) ON DELETE CASCADE,
  inventory_item_id TEXT NOT NULL REFERENCES inventory_items (id),
  product_id        TEXT NOT NULL,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (reservation_id, inventory_item_id)
);
CREATE INDEX idx_reservation_items_item ON reservation_items (inventory_item_id);
