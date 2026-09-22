# Phở demo — final report

The validation pass for `Flower Demo → Core v0.2.0 → Phở Demo`. Written for the Tiemora core team.

## 1. Overview

**Phở Góc Phố** is a fictional small phở shop in Hanoi: morning-to-noon service, mostly local
regulars, eat-in and takeaway, cash or QR at the counter, no POS. It runs on Tiemora Core v0.2.0
with an additive extension for food ordering — twelve menu items, four languages (Vietnamese
first), a mobile-first storefront built for a low-end Android on a mobile network.

The KPI was not the site. It was how little of Core had to change. **The v0.2 Orders domain was
roughly 85% reusable**, and everything that did change defaults to the old behaviour.

## 2. Storefront flow

Menu (12 items, 5 categories) → product dialog with options, add-ons and quantity, priced live →
add to cart → sticky cart bar → cart review → fulfillment → when → customer → consent → submit.
Plain HTML/CSS/JS, no framework, scripts deferred, images built to WebP at three sizes.

## 3. Cart flow

`storefront/cart.js` holds selection intent only. An item is identified by product + stable options
+ sorted add-ons, so two identical bowls merge into a quantity and a bowl with extra chilli stays
separate. Persisted in `localStorage` under `tiemora-cart-v1`; a corrupt or wrong-version payload
resets to empty rather than throwing. No customer data is ever stored there.

Checkout posts `items[]`. **The server reprices every line** from the live catalog and store config
— unit prices, option deltas, add-ons, stock, capacity, fulfillment — so a tampered cart buys
nothing. Single-item payloads from before the cart still work.

## 4. Dine-in flow

`dine_in` is a third fulfillment type, off by default. A dine-in order carries `table_number`,
validated against `ordering.tables` (`{min: 1, max: 24}` in this demo) in the Worker and stored
canonically. Dine-in guests are not asked for a name, a phone number or a contact channel: they are
already in the room. Pickup and delivery still require all three.

## 5. QR flow

A sticker on each table opens `/?mode=dine_in&table=12`.

- `mode=dine_in` preselects the dine-in card — it no longer falls through to pickup
- a table inside the configured range is filled in **read-only**
- a table outside the range is **ignored**: the field opens up and the guest types a real one
- the number is checked again in the Worker, which is the only check that counts

The URL is treated as a hint from an editable source throughout.

## 6. Pickup flow

Reused from v0.2 unchanged: six 15-minute slots from 10:30 to 12:00, 8 orders each, 80 per day.
Slots outside `openingHours` are refused server-side, as are orders on a closed day.

**Gap: there is no ASAP option.** Takeaway customers pick a slot. This is the one acceptance item
this pass did not deliver, and it is listed as a v0.3 candidate rather than faked.

## 7. Kitchen / Admin flow

- **Order Queue** (`#/orders/queue`) — lanes for pending / confirmed / preparing / ready. Each card
  shows the order id, the time it was ordered, table or pickup slot, every line with its options and
  add-ons, the kitchen note, and the buttons that move it along. Completing an order removes it from
  the board.
- **Menu** (`#/menu`) — a sold-out switch per product. Refused in read-only demo mode like every
  other admin write.
- **Orders**, **Schedule**, **Dashboard**, **Settings** — reused from v0.2. The schedule gained a
  dine-in column.
- Rental Inventory and Bookings stay hidden: the existing module detection sees a sale-only catalog.

## 8. Reused from v0.2 unchanged

Sale product model, `price.sale`, options, add-ons, quantity, line pricing, pickup, order window and
deadline, **time-slot and daily capacity**, order statuses, admin orders list/detail/edit/status,
Web Push, customer notification helpers, privacy consent, Turnstile, CSRF, admin auth, rate limiting,
read-only demo mode, module detection, and the four-language storefront and admin.

Capacity is the standout: 15 minutes of configuration, zero code.

## 9. Core changes

All additive; each defaults to v0.2 behaviour.

| Area | Change |
|---|---|
| `core/orders/rules.mjs` | `dine_in` in `FULFILLMENT_TYPES`; `openingHoursError`; `tableNumberError` + `normalizeTableNumber` |
| `core/config/store.mjs` | `ordering.fulfillment.dine_in`, `ordering.tables`, `ordering.openingHours`, `messageCard.title` |
| `core/catalog/collect.mjs` | per-product `fulfillment.dine_in` |
| `core/notifications/orders.mjs` | dine-in labels and the table in order summaries, four languages |
| `worker/orders.mjs` | `items[]` with server-side repricing; dine-in validation and its relaxed contact rules; opening-hours check; table range; sold-out override; `GET`/`PATCH /api/admin/products` |
| `worker/orders-db.mjs` | `table_number`; `soldOutProducts` / `setProductSoldOut` |
| `migrations/0007_dine_in.sql` | `dine_in` + `table_number`, as a **new** migration — 0006 shipped in v0.2.0 and is left untouched |
| `migrations/0008_product_availability.sql` | the staff sold-out switch |
| `storefront/cart.js` (new) | generic cart state |
| `storefront/order.js` | cart UI, dine-in fields, QR handling, fulfillment-dependent validation, payment note |
| `admin/admin.js` | Order Queue, Menu sold-out screen, dine-in labels and schedule column |

## 10. Demo changes

`config/store.yaml` (name, contact, categories, palette, hero, copy, hours, tables, slots, options,
add-ons), `examples/pho-demo/` (12 products with covers), hero and logo art, and `docs/pho-demo/`.
Nothing food-specific was written into Core.

## 11. Tests

`npm run check` green: **128 tests**, lint, typecheck, build. v0.2 had 106; all of them still pass.

The 18 added:

- **Cart** — add, merge identical, separate variants, quantity, remove, totals, persistence, corrupt-payload reset; two products combined into one order through the UI
- **Multi-item orders** — every line repriced server-side, one bad line rejects the whole order
- **Dine-in** — valid order, valid table, non-numeric table, out-of-range table, table 0, leading zeros normalised, order without name or phone, pickup still requiring both
- **QR** — table parsed from the URL and shown read-only, out-of-range table ignored and then refused with a message naming the range, a full dine-in order reaching the Worker with its table and no contact details
- **Opening hours** — open, closed day, slot outside hours
- **Table range config** — defaults, inverted range, non-mapping value
- **Order Queue** — lanes, card contents, `pending → confirmed → preparing → ready → completed`
- **Sold out** — switch off, storefront shows it, order refused, switch back on, order accepted; validation, 404, rental products refused, unauthenticated refused, read-only mode refused
- **Migration** — a populated v0.2.0 database upgraded by `0007` keeps its orders *and* their lines, gets its indexes back, and accepts `dine_in` afterwards

Capacity, order status transitions, CSRF, admin auth and read-only mode were already covered by v0.2
tests, which were kept.

## 12. Performance

Plain HTML/CSS/JS, no framework added. Scripts are deferred and the cart is ~60 lines. Images are
built to WebP at card and thumb sizes alongside the original. The storefront makes one catalog
fetch, one store fetch and one `/api/orders/config` fetch. Nothing was added to the critical path
for the QR case, which lands on the same page as everyone else.

## 13. Setup time

~11 hours of Core work and ~4 hours of shop setup — of which **70 minutes was typing twelve menu
YAML files by hand**, the clearest argument for a Studio menu editor. Full breakdown in
[setup-log.md](setup-log.md).

## 14. Studio candidates

1. **Menu editor** — the single most repetitive task in the pass
2. **QR sheet generator** — one sticker per table from the configured range
3. Opening-hours grid, table range, capacity as form questions
4. Palette presets by trade
5. Translation assistance for the non-primary languages
6. One-button deploy

## 15. Core feedback

Full version in [core-feedback.md](core-feedback.md). The four Flower-era assumptions this demo
found in v0.2:

1. Every customer has a name, a phone and a contact channel — false for dine-in
2. **`ordering.stock` is a lifetime total** — `stock: 30` means thirty bowls *ever*. The sharpest
   remaining Flower assumption; the demo works around it with `stock: null` plus the sold-out switch
3. Sold-out is a count reaching zero, not something staff can declare
4. The admin schedule is a delivery board, not a kitchen board

## 16. v0.3 candidates

Written and tested here, so promoting them is a merge decision: `dine_in` + `table_number` +
`ordering.tables`; `openingHours`; Order Queue; sold-out switch; multi-item orders with server
repricing.

New work: **`ordering.stock.period: daily`** (closes assumption 2 above), ASAP pickup, QR sheet
generation.

Deliberately postponed: the cart state contract, until the Café demo says whether food and
merchandise share one cart.

## 17. Before the Café demo

Take `dine_in`, `table_number`, `openingHours`, the Order Queue, the sold-out switch and multi-item
orders back into Core first. The Café demo is meant to combine food ordering, merchandise and
workshops in one shop; if it starts from a Core that already has these, it can spend its budget on
the genuinely new question — **one cart or several, and what happens when one order mixes
fulfillment types** — instead of re-deriving dine-in.

Also decide `stock.period` before then. A café restocks pastries daily, so it will hit the lifetime
stock problem on day one.

## 18. Commits

Three, in this order:

1. `feat(secrets): one-command Turnstile and Web Push setup` — unrelated to this demo, committed
   on its own so the food-ordering delta stays measurable and so it can be cherry-picked into a
   Core branch by itself.
2. `feat(orders): dine-in, carts, opening hours and a kitchen queue` — the Core extension: core,
   worker, migrations 0007 and 0008, storefront, admin, and all 18 new tests.
3. `feat(demo): Phở Góc Phố, a local food shop on Core v0.2` — demo config, menu, art and these
   documents.

Commit 2 is the one a v0.3 branch would take. It could not be split further by file: the
`store.hero.layout: environmental` work from a separate hero stream is interleaved with the config
changes in `core/config/store.mjs`, `storefront/app.js` and `storefront/styles.css`, so it rode
along rather than being reconstructed after the fact. It is the only foreign change in that commit
and it touches nothing in the order domain.
