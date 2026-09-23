-- A fitting is not a rental. The customer comes at an agreed time, tries the garment on and hands it
-- straight back, so it holds one piece for the length of the appointment instead of whole days, and
-- nothing is charged for it. It is the same booking table -- same statuses, same inventory, same
-- handover hours -- with the purpose written down, so staff see one diary rather than two.
--
-- Additive: every existing row is a rental and is read exactly as before.
ALTER TABLE reservations ADD COLUMN purpose TEXT NOT NULL DEFAULT 'rental'
  CHECK (purpose IN ('rental', 'fitting'));

CREATE INDEX idx_reservations_purpose ON reservations (purpose, start_date);
