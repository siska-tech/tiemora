-- Staff-controlled sold-out for sale products. `ordering.stock` in product.yaml is a count that only
-- changes when the catalog is rebuilt, which suits a campaign ("40 bouquets for Tet") but not a
-- kitchen: a shop that ran out of beef at 09:40 needs one tap, not a deploy. This table holds only
-- the override, so a product with no row behaves exactly as it did before.
CREATE TABLE product_availability (
  product_id TEXT PRIMARY KEY,                  -- the catalog id; no foreign key, the catalog is a file
  sold_out   INTEGER NOT NULL DEFAULT 0 CHECK (sold_out IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
