-- Rental pricing is per 24 hours, so a booking names the window it is picked up in. The garment is
-- due back in the same window on end_date, which makes the period exactly
-- (end_date - start_date) x 24h. Bookings made before this migration keep '' and are read as
-- "no window agreed"; nothing recalculates them.
ALTER TABLE reservations ADD COLUMN start_time TEXT NOT NULL DEFAULT ''
  CHECK (start_time = '' OR start_time GLOB '[0-9][0-9]:[0-9][0-9]');
