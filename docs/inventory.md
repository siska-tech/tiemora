# Inventory

Tiemora separates **what you sell** from **what you own**.

- A **product** is a catalog entry (`product.yaml`): name, price, photos, sizes. It lives in Git and is published as `catalog.json`.
- An **inventory item** is one physical copy of a product, registered by staff in the admin and stored in D1. Its id is the product id plus a two-digit sequence: `sample-rental-001-01`, `sample-rental-001-02`, … The admin suggests the next free number.

Only products with `inventory: {managed: true}` have items; for the rest the storefront shows the hand-written `available` flag.

## Item statuses

| Status | Meaning | Bookable? | Counted in stock? |
|---|---|---|---|
| `available` | On the shelf | yes | yes |
| `reserved` | Set aside (manual) | for other dates, yes; today it counts as out | yes |
| `rented` | With a customer (set automatically when a booking is handed over) | for other dates, yes; today it counts as out | yes |
| `maintenance` | Being cleaned or repaired | no | yes (shown as unavailable) |
| `inactive` | Retired, lost, sold | no | no (not even in the total) |

Handing a booking over sets its items to `rented`; returning or cancelling sets them back to `available` unless they are in `maintenance` or `inactive`, which staff manage by hand.

## Admin

- **Inventory** (`#/inventory`): list with product thumbnail, item id, size, status and note; change status and note inline; delete an item that was never booked (otherwise set it to `inactive`).
- **Next 7 days** (in the inventory list): each item has one cell per day. The cell shows the day's pieces to scale, plus a symbol for what held it longest (■ rented, ▣ booked, ◆ fitting, ▒ in care, ▓ maintenance, × out of service, ○ free, with a small ○ when part of the day is still free). Its accessible name spells out every piece with its times. Tapping a cell opens who holds the item, when it is due back and when it is ready again, or offers **Book this item** on a free day. Above the list, each product and size shows how many pieces are free all day (+ part of the day). On screens up to 1100px each item is a card, and the booking details, note, booking list and delete are behind **More**.
- **Availability** (`#/inventory/schedule?product_id&item_id&days=7|14|30`): the detailed schedule. 7 and 14 days are ECharts charts (one per product and size, created only when scrolled into view and disposed on navigation) that scroll sideways inside the card. 30 days are shown a day at a time. **Show as a list** holds the same schedule as text. A rental and its care window are separate segments, so an item that is back but not yet ready reads as *in care* until its turnaround ends.
- **Add item** (`#/inventory/new`): choose a product, get the next id suggested, pick the size (from the product's sizes) and a note (shelf, condition).
- Booking forms only offer items that are free for the chosen dates; **Pick a free item** chooses the first one.

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/inventory?product_id=&status=` | list |
| POST | `/api/admin/inventory` | `{id, product_id, size?, note?, status?}` — `id` must start with `product_id-` and the product must exist in the catalog |
| GET / PATCH / DELETE | `/api/admin/inventory/:id` | `{status?, size?, note?}`; DELETE refuses items that appear in a booking |
| GET | `/api/admin/inventory/timeline?from&days&product_id&item_id` | segments per item over `days` (1–31, default 7) from `from` (default today), day summaries and per-product free counts; includes customer names, admin only |
| GET | `/api/products/:id/inventory?from&to&exclude=` | items of one product with `available` and the clashing bookings for the period (admin only) |

## Seeding

- `seed/demo.sql` — the sample store: four items, a confirmed booking, a rental in progress and a pending request. `npm run db:seed:local` / `npm run db:seed`.
- `npm run generate:seed` — writes `seed/inventory.sql` with one `available` item per managed product in *your* catalog (a starting point; adjust quantities in the admin).

Both use `INSERT OR IGNORE`, so re-running them never overwrites items you added later.
