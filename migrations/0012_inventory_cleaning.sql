-- A garment that has come back is not yet a garment that can go out: it is being washed and
-- pressed. That is its own physical state, distinct from `rented` (with a customer) and from
-- `available` (ready to go). `available` is the "ready" state -- a second name for the same thing
-- would only give staff two ways to say it -- and `returned` stays a booking status, not an item one.
--
-- `status` carries a CHECK constraint from 0001 and SQLite cannot widen one in place, so the table
-- is rebuilt. reservation_items references inventory_items without a cascade, so its rows are set
-- aside and put back once the new table is in place; nothing else points at inventory_items.
-- Stores that never set an item to `cleaning` are unaffected: the widened CHECK accepts everything
-- it accepted before.

CREATE TABLE reservation_items_backup AS SELECT * FROM reservation_items;
DELETE FROM reservation_items;

CREATE TABLE inventory_items_new (
  id         TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  size       TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'available'
             CHECK (status IN ('available', 'reserved', 'rented', 'cleaning', 'maintenance', 'inactive')),
  note       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO inventory_items_new (id, product_id, size, status, note, created_at, updated_at)
  SELECT id, product_id, size, status, note, created_at, updated_at FROM inventory_items;

DROP TABLE inventory_items;
ALTER TABLE inventory_items_new RENAME TO inventory_items;

CREATE INDEX idx_inventory_items_product ON inventory_items (product_id);
CREATE INDEX idx_inventory_items_status  ON inventory_items (status);

INSERT INTO reservation_items (id, reservation_id, inventory_item_id, product_id, created_at)
  SELECT id, reservation_id, inventory_item_id, product_id, created_at FROM reservation_items_backup;
DROP TABLE reservation_items_backup;
