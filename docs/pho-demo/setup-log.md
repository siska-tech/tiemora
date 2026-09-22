# Phở demo setup log

What it took to stand up a Vietnamese local-food shop on Tiemora Core v0.2.0, step by step. Each
step records what had to change in Core, what was demo content, what a shop owner would still do by
hand, what a future Tiemora Studio could do for them, and roughly how long it took.

Times are for someone who already knows the codebase. A shop owner starting from a Studio would
spend the "manual work" time only.

## Baseline

- Branch: `pho-demo`, from `main` at Tiemora `0.2.0`
- Node.js `v24.21.0`, catalog root `examples/pho-demo/`
- Store: **Phở Góc Phố**, Vietnamese-first (`vi`, `en`, `ja`, `zh`)
- Checks at the end of the pass: `npm run check` green — 132 tests, lint, typecheck, build

---

## 1. Setup

| | |
|---|---|
| **Core change** | None. `npm install`, `npm run dev` and the local D1 worked unchanged. |
| **Demo change** | Branch `pho-demo` off `main`. |
| **Manual work** | Copy `.dev.vars.example`, set `ADMIN_PASSWORD`. |
| **Studio candidate** | Whole step: a shop should never see a repo. |
| **Time** | 10 min |

## 2. Config

| | |
|---|---|
| **Core change** | `ordering.openingHours` (weekday → intervals) and `ordering.tables` (`min`/`max` for dine-in) added to `core/config/store.mjs`, both optional and defaulted. |
| **Demo change** | `config/store.yaml`: name, contact, 5 categories, warm palette, Vietnamese-first hero and section copy, 4 languages. |
| **Manual work** | Writing the copy in all four languages; deciding opening hours and the table range. |
| **Studio candidate** | Opening hours, table range and palette are form fields, not YAML. Machine translation for the non-primary languages with the owner approving. |
| **Time** | 90 min (most of it copywriting) |

## 3. Menu registration

| | |
|---|---|
| **Core change** | `core/catalog/collect.mjs` reads `fulfillment.dine_in` per product. |
| **Demo change** | 12 products under `examples/pho-demo/`, each `type: sale` with `price.sale`, category, options, add-ons, `fulfillment: {pickup, dine_in}` and a cover image. |
| **Manual work** | 12 YAML files by hand. This is the single most repetitive part of the whole pass. |
| **Studio candidate** | **Strongest candidate in this log.** A menu editor with per-item option/add-on pickers, and duplicate-from-existing (the seven phở bowls differ in three fields). |
| **Time** | 70 min |

## 4. Theme

| | |
|---|---|
| **Core change** | None for colour. (`store.hero.layout: environmental` was added in this branch but belongs to a separate hero work stream, not to food ordering.) |
| **Demo change** | `theme` block: deep green, brick red, warm cream, wood ink. Hero and logo art. |
| **Manual work** | Picking five hex values that read as a street eatery rather than a chain. |
| **Studio candidate** | Palette presets by trade ("local eatery", "café", "florist") with live preview. |
| **Time** | 30 min |

## 5. Cart

| | |
|---|---|
| **Core change** | New `storefront/cart.js`: generic cart state (item identity = product + options + sorted add-ons, quantity merging, `localStorage` persistence, subscribe). `worker/orders.mjs` accepts `items[]` and reprices every line server-side; single-item payloads still work. No migration — `order_items` already held one row per line. |
| **Demo change** | Sticky cart bar and cart review list styling in `storefront/styles.css`. |
| **Manual work** | None. |
| **Studio candidate** | None — this is Core work, not shop setup. |
| **Time** | 150 min |

## 6. dine_in

| | |
|---|---|
| **Core change** | `dine_in` in `FULFILLMENT_TYPES`; `table_number` on `orders` (migration `0007_dine_in.sql`); `tableNumberError` / `normalizeTableNumber` in `core/orders/rules.mjs`; dine-in labels in `core/notifications/orders.mjs`; dine-in makes name, phone and contact channel optional in `worker/orders.mjs` and in the storefront form. |
| **Demo change** | `fulfillment.dine_in: true` in `config/store.yaml` and on all 12 products; Vietnamese labels ("Ăn tại quán" / "Mang về"). |
| **Manual work** | Deciding that dine-in guests are not asked for a name or a phone number. |
| **Studio candidate** | A "how do customers get their food?" step that turns on the right fulfillment types. |
| **Time** | 120 min |

## 7. QR table

| | |
|---|---|
| **Core change** | `?mode=dine_in&table=N` handling in `storefront/order.js`: the mode preselects the dine-in card, a valid table is filled in read-only, an out-of-range table is ignored and the field opens up. The number is validated against `ordering.tables` on the client and again in the Worker. |
| **Demo change** | None beyond the labels. |
| **Manual work** | Printing the stickers. Nothing generates them yet. |
| **Studio candidate** | **Generate the QR sheet** — one PNG/PDF per table from the configured range. Obvious, small, and every dine-in shop needs it. |
| **Time** | 60 min |

## 8. Opening hours

| | |
|---|---|
| **Core change** | `openingHoursError(date, slot, openingHours)` in `core/orders/rules.mjs`, called before an order is written. A closed weekday is rejected as `closed_day`, a slot outside the intervals as `closed_hours`. A shop with no `openingHours` is unrestricted, so v0.2 stores are unaffected. |
| **Demo change** | 10:00–13:00 every day in `config/store.yaml`. |
| **Manual work** | None once configured. |
| **Studio candidate** | A weekly hours grid, with holidays. |
| **Time** | 45 min |

## 9. Capacity

| | |
|---|---|
| **Core change** | **None** for order capacity — v0.2 time-slot and daily capacity were reused as-is. Per-product daily stock (`ordering.stockPeriod: daily`) was added separately, because v0.2's `stock` never refilled. |
| **Demo change** | Six 15-minute pickup slots (10:30–12:00), 8 orders per slot, 80 per day, and a per-bowl daily count (30 each, 15 for the specials, drinks unlimited). Order window set to `minLeadDays: 0` so a guest at a table can order for today. |
| **Manual work** | Choosing the numbers. |
| **Studio candidate** | "How many orders can you handle per 15 minutes?" as one question. |
| **Time** | 15 min for capacity — the clearest reuse win in the log — plus 60 min for daily stock. |

## 10. Admin

| | |
|---|---|
| **Core change** | **Order Queue** (`#/orders/queue`): lanes for pending / confirmed / preparing / ready, each card carrying order id, ordered-at time, table or pickup slot, lines with options and add-ons, the note, and the status buttons. **Menu** (`#/menu`): a sold-out switch per sale product, backed by `product_availability` (migration `0008`) and `GET`/`PATCH /api/admin/products`. Both appear only when the catalog has sale products, via the existing module detection. |
| **Demo change** | None — both views are generic. |
| **Manual work** | None. |
| **Studio candidate** | None. |
| **Time** | 180 min |

## 11. Testing

| | |
|---|---|
| **Core change** | 22 new tests for food ordering: table number range, opening hours, cart state, multi-item repricing, QR parsing and rejection, dine-in without contact details, queue transitions, the sold-out switch (including read-only demo mode), and the `0007` upgrade from a populated v0.2 database. |
| **Demo change** | None. |
| **Manual work** | None. |
| **Studio candidate** | None. |
| **Time** | 120 min |

## 12. Deployment

| | |
|---|---|
| **Core change** | None. |
| **Demo change** | Worker name `pho` in `wrangler.jsonc`; everything else left as placeholders so the branch carries no account identifiers. See [deployment.md](deployment.md). |
| **Manual work** | `npm run db:create`, paste the id, `npm run db:migrate`, `wrangler secret put ADMIN_PASSWORD`, deploy. Turnstile and VAPID via `npm run setup:*`. |
| **Studio candidate** | The whole step — a shop owner should press one button. |
| **Time** | 40 min |

---

## Totals

| | |
|---|---|
| Core work (cart, dine_in, QR, hours, admin, tests) | ~11 hours |
| Demo setup that a shop owner would face today | ~4 hours, of which **70 min is typing 12 menu YAML files** |
| Steps needing **no** Core change at all | capacity, theme colours, pickup slots, categories, pricing |

## Known gaps

- ~~Pickup is scheduled only~~ — fixed: `ordering.asap` adds an "as soon as you can" choice, on by default for dine-in.
- **No QR sheet generator.** Table stickers are made by hand.
- ~~`ordering.stock` is a lifetime total~~ — fixed on this branch with `ordering.stockPeriod: daily`. The menu now carries real per-day counts (30 bowls, 15 of each special), and the sold-out switch handles the rest.
