-- Rentals run on the clock, not only on the calendar.
--
-- A booking now says when it is collected (`start_date` + `start_time`), for how many 24-hour days
-- (`rental_days`), and -- once the garment is back -- when it actually returned (`returned_at`).
-- `start_at` and `ready_at` are the stretch during which the booking keeps its item out of
-- circulation: from collection until the item has been cared for and can go out again. They are
-- written out rather than computed in SQL so the overlap check stays a single indexed query.
--
-- Everything is additive. Rows written before this migration keep rental_days = 0 and empty
-- moments, and are read as whole-calendar-day bookings exactly as they always were: the upgrade
-- never widens or narrows what an existing booking blocks, and no price is recalculated.
ALTER TABLE reservations ADD COLUMN rental_days INTEGER NOT NULL DEFAULT 0 CHECK (rental_days >= 0);
ALTER TABLE reservations ADD COLUMN returned_at TEXT NOT NULL DEFAULT '';
ALTER TABLE reservations ADD COLUMN start_at    TEXT NOT NULL DEFAULT '';
ALTER TABLE reservations ADD COLUMN ready_at    TEXT NOT NULL DEFAULT '';

CREATE INDEX idx_reservations_interval ON reservations (start_at, ready_at);

-- When somebody is at the shop to hand a rental over is a different question from whether the
-- garment is free. The ordinary week lives in the store configuration; a single date that differs --
-- a day off, a late start, longer hours because the owner is not at their other job -- is kept here
-- so staff can change it from the admin without a rebuild. A row wins over the weekly schedule.
-- `windows` is a JSON array of {"start":"HH:MM","end":"HH:MM"}; with closed = 1 it is ignored.
CREATE TABLE handoff_exceptions (
  date       TEXT PRIMARY KEY CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  closed     INTEGER NOT NULL DEFAULT 0 CHECK (closed IN (0, 1)),
  windows    TEXT NOT NULL DEFAULT '[]',
  note       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
