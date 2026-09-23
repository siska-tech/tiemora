-- "As soon as you can" orders: no time slot, the kitchen starts now. A slot is a promise about when
-- something will be ready, and a shop that makes food to order cannot always give one -- the customer
-- is standing at the counter. Kept as its own flag rather than a reserved `time_slot` value so a
-- store's own slot ids can never collide with it, and so an empty slot keeps meaning "no slot".
ALTER TABLE orders ADD COLUMN asap INTEGER NOT NULL DEFAULT 0 CHECK (asap IN (0, 1));
