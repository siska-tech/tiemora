# Orders (sale / pre-order)

Products with `type: sale` are sold by quantity, not booked by date. A customer picks options and add-ons, writes a card message, chooses **pickup** or **delivery**, a day and a time slot, and sends an order request. Staff confirm it in the admin, prepare it and hand it over or deliver it. The model sits next to rental bookings ([booking.md](booking.md)); a catalog can contain both kinds of product and the admin shows the modules the catalog needs.

## Model

| Entity | Where | Notes |
|---|---|---|
| Product (`type: sale`) | `product.yaml` | price, option ids, add-on ids, `fulfillment`, `ordering.stock`, `ordering.stockPeriod`, `ordering.deadline` ([catalog.md](catalog.md)) |
| Options / add-ons / time slots / limits | `config/store.yaml` `ordering:` | labels and default price deltas, slots with capacity, campaign window, deadline, daily capacity, card templates ([configuration.md](configuration.md)) |
| Order | D1 `orders` | who, how (pickup / delivery + recipient / address), when (date + slot), card message, totals at order time, notification record, consent |
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
| `POST /api/orders` | one line per order: `product_id, quantity, options, addons, fulfillment_type, fulfillment_date, time_slot, message_card, recipient_*, delivery_*, customer_name, customer_phone, preferred_contact_channel, privacy_consent: true` |

`POST` validates every field against the catalog and config, refuses a closed deadline (`409 deadline_passed`), a full slot or day (`409 capacity_full`) and missing stock (`409 sold_out`), runs Turnstile and the per-IP throttle, folds a duplicate (same phone, product, date, slot while pending) and pushes to admin devices. The insert is guarded in SQL (`INSERT … SELECT … WHERE count < capacity`) inside one transaction, so two customers cannot both take the last place. A `daily` stock product is counted, in the pre-check and in that guard, only against the orders for the same `fulfillment_date`.

### Time slots and ASAP

An order names *when* in one of two ways, never both. A **time slot** is a promise about a window,
picked from `ordering.timeSlots`. **ASAP** (`asap: true`, no slot) means the kitchen starts now; it
is accepted only when `ordering.asap.enabled` is on, only for today, and only while the current time
in the store's zone falls inside an `openingHours` interval. All three are checked in the Worker, so
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

## Admin pages

Orders list · order detail (status buttons, product lines, card message, fulfillment, contact + notification helpers, edit form) · schedule (pickups and deliveries per slot for a day) · staff order form. The dashboard and the bell show new orders, orders to notify and today's pickups / deliveries.

## Demo / read-only mode

`ADMIN_READ_ONLY=1` (wrangler var or `.dev.vars`) makes every admin write answer `403 read_only`; sign-in, reading and public orders keep working. The admin shows a banner.
