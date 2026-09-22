# Orders (sale / pre-order / local-store)

Products with `type: sale` are sold by quantity, not booked by date. A customer picks options and add-ons, writes an optional note, chooses **pickup**, **delivery** or enabled **dine-in**, a day and a time slot (or enabled ASAP), and sends an order request. Staff confirm it in the admin, prepare it and hand it over or deliver it. The model sits next to rental bookings ([booking.md](booking.md)); a catalog can contain both kinds of product and the admin shows the modules the catalog needs.

## Model

| Entity | Where | Notes |
|---|---|---|
| Product (`type: sale`) | `product.yaml` | price, option ids, add-on ids, `fulfillment`, `ordering.stock`, `ordering.stockPeriod`, `ordering.deadline` ([catalog.md](catalog.md)) |
| Options / add-ons / time slots / limits | `config/store.yaml` `ordering:` | labels and default price deltas, slots with capacity, campaign window, deadline, daily capacity, card templates ([configuration.md](configuration.md)) |
| Order | D1 `orders` | who, how (pickup / delivery / dine-in + recipient / address / table), when (date + slot or ASAP), card message, totals at order time, notification record, consent |
| Order line | D1 `order_items` | product id, quantity, chosen option ids (JSON), add-on ids (JSON), unit and line price at order time |

Inventory is **capacity**, not items: a time slot takes N orders, a day takes N orders, a product sells N units. Every limit is optional; when it is not set nothing is enforced and nothing is shown as scarce.

## Statuses

`pending → confirmed → preparing → ready → completed`, with `out_for_delivery` between `ready` and `completed` for deliveries, and `cancelled` from any non-terminal status. Every status except `cancelled` counts against capacity and stock (a pending order already holds its slot so the shop cannot accept more than it can make). `POST /api/admin/orders/:id/status` only accepts the offered transitions; `PATCH` accepts any status for corrections.

## Pricing

`unit price = price.sale + Σ option deltas + Σ add-on prices`, `line = unit × quantity`, `total = Σ lines + delivery fee (delivery only)`. A product's own `{id, price}` entry wins over the store-wide delta for that id; a skipped option group takes the product's first choice. The Worker prices every line itself; the storefront's running total is a preview.

## Public API

| Route | Purpose |
|---|---|
| `GET /api/orders/config` | the window (`dates.list`), time slots, `capacity[date].slots[id] = {used, capacity, remaining, open}`, `asap` (`{enabled, leadMinutes, openNow}`), `products[id] = {stock, stockPeriod, sold, remaining, soldOut, soldOutByStaff, deadlinePassed}` (plus `byDate[date]` for a `daily` stock product, one summary per orderable day), option / add-on labels, card templates, delivery fee, Turnstile state |
| `POST /api/orders` | `items: [{product_id, quantity, options, addons}]` (1-50 lines), plus shared `fulfillment_type, fulfillment_date, time_slot, asap, table_number, message_card, recipient_*, delivery_*, customer_name, customer_phone, preferred_contact_channel, privacy_consent: true`; legacy top-level single-item fields remain accepted |

`POST` validates every field against the catalog and config, refuses a closed deadline (`409 deadline_passed`), a full slot or day (`409 capacity_full`) and missing stock (`409 sold_out`), runs Turnstile and the per-IP throttle, folds a duplicate (same phone, product, date, slot while pending) and pushes to admin devices. The insert is guarded in SQL (`INSERT … SELECT … WHERE count < capacity`) inside one transaction, so two customers cannot both take the last place. A `daily` stock product is counted, in the pre-check and in that guard, only against the orders for the same `fulfillment_date`.

### Multi-item and dine-in orders

Every line is validated and repriced from the live catalog. One invalid line rejects the whole
order. All items share one fulfillment type, service date and timing choice; mixed fulfillment
and combined booking checkout are deferred. The shipped storefront cart persists selection intent
only; its storage/state contract remains provisional pending another demo.

Dine-in requires store and product support plus a numeric table in `ordering.tables`.
Table numbers are canonicalized (`"007"` becomes `"7"`) and do not reserve a seat.
Customer name, phone and contact channel are optional for dine-in; public pickup/delivery
retain their requirements. Privacy consent and anti-abuse checks still apply.
`/?mode=dine_in&table=12` preselects fulfillment and a valid table. URL values are hints:
an out-of-range table is ignored by the form and server-side table validation remains authoritative.

### Time slots and ASAP

An order names *when* in one of two ways, never both. A **time slot** is a promise about a window,
picked from `ordering.timeSlots`. **ASAP** (`asap: true`, no slot) means the kitchen starts now; it
is accepted only when `ordering.asap.enabled` is on, only for today, and only while the current time
in the store's zone falls inside an `openingHours` interval (empty hours impose no restriction). All three are checked in the Worker, so
a form that offers the choice too eagerly still cannot place the order.

ASAP orders count against `dailyCapacity` like any other order, but against no slot capacity — they
have no slot. In the admin they appear in the schedule's unslotted column and in the Order Queue
like everything else.

### Stock and sold-out

A product leaves the menu in two ways, and they do not compete:

- **Counted out.** `ordering.stock` with `stockPeriod: total` counts every unit ever ordered;
  with `stockPeriod: daily` it counts only the units ordered for the same day, so the count
  refills each morning. A shop that restocks daily and leaves the period at `total` will sell out
  permanently once the count is reached.
- **Switched off.** Staff flip a product off in `/admin/#/menu` (`PATCH /api/admin/products/:id`,
  stored in `product_availability`). This only ever takes a product off the menu; it never puts a
  counted-out one back on, so the count stays the single source of truth for units.

## Admin API

`GET /api/admin/orders` (filters `from, to, slot, fulfillment, status, notification, q`), `GET /api/admin/orders/schedule?date=` (orders per slot with capacity), `POST /api/admin/orders` (staff-entered order, no consent or window check), `GET / PATCH / DELETE /api/admin/orders/:id`, `POST …/status`, `POST …/notification`. The detail response carries the confirmation text in every language and the contact links, like bookings.

`GET /api/admin/products` lists sale-product availability; `PATCH /api/admin/products/:id`
accepts `{sold_out: true}` or `{sold_out: false}`. These require admin authentication; writes
also use the normal CSRF and read-only-mode protections.

## Admin pages

Orders list · order detail (status buttons, product lines, card message, fulfillment, contact + notification helpers, edit form) · schedule (pickups and deliveries per slot for a day) · staff order form. The Order Queue (`#/orders/queue`) groups pending, confirmed, preparing and ready orders with status actions; terminal orders leave the board. The Menu (`#/menu`) manages staff sold-out switches. Dine-in orders also appear in the schedule. The dashboard and the bell show new orders, orders to notify and today's pickups / deliveries.

## Demo / read-only mode

`ADMIN_READ_ONLY=1` (wrangler var or `.dev.vars`) makes every admin write answer `403 read_only`; sign-in, reading and public orders keep working. The admin shows a banner.
