-- Reservation requests from the public site (POST /api/reservation-requests).
-- A request is a normal reservations row with status = 'pending', source = 'public' and NO
-- reservation_items: it names the product (and size) the customer wants but holds no item.
-- Staff confirm it in /admin/, which is when a free inventory item is assigned and the booking
-- starts to occupy stock.
ALTER TABLE reservations ADD COLUMN source TEXT NOT NULL DEFAULT 'admin'
  CHECK (source IN ('admin', 'public'));
ALTER TABLE reservations ADD COLUMN request_product_id TEXT NOT NULL DEFAULT '';
ALTER TABLE reservations ADD COLUMN request_size       TEXT NOT NULL DEFAULT '';

-- One row per accepted public request, keyed by a hash of the client IP, for the per-IP throttle.
-- Only the hash is stored; rows older than a day are pruned on each write.
CREATE TABLE public_request_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_public_request_log_ip ON public_request_log (ip_hash, created_at);
