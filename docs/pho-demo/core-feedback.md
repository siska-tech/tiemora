# Core feedback from the Phở demo

Written for whoever scopes v0.3. The question this branch was built to answer is not "is the phở
site nice" but **how much of Tiemora Core v0.2.0 survived contact with a local food shop**.

Short answer: the order domain survived almost intact. What did not survive was a handful of
assumptions that came from the Flower demo — a shop that sells scheduled, counted, delivered
things — meeting a shop that serves unscheduled, uncounted, eaten-here things.

---

## 1. Reused from v0.2 without change

These needed no code change at all:

| Capability | Note |
|---|---|
| `type: sale` product model, `price.sale` | Phở bowls are sale products. Nothing food-specific was added to the model. |
| Product `options` and `addons`, with per-product overrides | Size / noodles / herbs / spice map onto option groups exactly. Per-product option sets were already supported. |
| Quantity and line pricing | `priceOrderLine` needed nothing. |
| Time-slot capacity and daily capacity | **The clearest win.** "8 orders per 15 minutes" is the same shape as "8 bouquets per slot". 15 minutes of configuration, zero code. |
| Order status lifecycle | `pending → confirmed → preparing → ready → completed / cancelled` is already a kitchen flow. `preparing` and `ready` needed no renaming. |
| Pickup fulfillment | Reused as-is for takeaway. |
| Order window / dates / deadline | Reused. |
| Admin orders list, detail, edit, status transitions | Reused. |
| Web Push for new orders | Reused; the payload picked up the table for free. |
| Customer notification helpers (WhatsApp / Messenger / Zalo / phone / copy) | Reused. |
| Shared customer validation | Reused, with one branch added (see §3). |
| Privacy consent, Turnstile, CSRF, admin auth, rate limiting, read-only demo mode | Reused. The new sold-out route is covered by read-only mode without special-casing. |
| Multilingual storefront and admin | Reused; `vi`/`en`/`ja`/`zh` intact. |

**Estimate: the v0.2 Orders domain was ~85% reusable.** The 15% is §3 and §4 below, and it is
additive: every change defaults to the v0.2 behaviour, so a Flower deployment sees nothing new.

## 2. How the Flower-era additions held up

The v0.2 features that came *from* the Flower demo, tested a second time:

- **Pickup** — reused directly for takeaway, once ASAP was added beside it (§4.7).
- **Time-slot capacity** — reused directly. Best-travelling feature in the release.
- **Options / add-ons** — reused directly. Per-product option sets mattered more here than for
  flowers (a drink has ice and sweetness, a bowl has noodles and herbs), and v0.2 already did it.
- **Order statuses** — reused directly.
- **Delivery** — not exercised. Left on in Core, switched off in the demo config.

## 3. Flower-specific assumptions still in v0.2

These are the places where v0.2 assumed a florist. Each one cost time in this pass.

1. **Every customer has a name, a phone number and a contact channel.**
   True when someone collects a bouquet later. False for a guest sitting at table 12 — the food is
   walked to them. v0.2 made all three mandatory on the public path. Now branched on fulfillment.

2. **`ordering.stock` was a lifetime total.** *(fixed on this branch)*
   `stockSummary` counted every active order ever placed, and `completed` is an active status. For a
   campaign ("40 bouquets for Tết") that is right. For a phở shop, `stock: 30` meant *thirty bowls
   ever* — the 31st refused forever, with no way back short of editing YAML and rebuilding. This was
   the sharpest Flower assumption left in the release, and it was fixed rather than worked around:
   `ordering.stockPeriod: daily` counts units against the day the order is for, in the pre-check and
   in the SQL guard alike, so tomorrow starts full again. The default stays `total`, which is
   exactly what v0.2 did.

3. **Sold-out is a number, not a switch.**
   Running out of beef at 09:40 is an event, not a count reaching zero. v0.2 had no way for staff to
   say so. Fixed here (§4.6).

4. **The admin schedule is a delivery board, not a kitchen board.**
   v0.2's schedule groups a day by time slot, which suits a florist packing a morning's deliveries.
   A cook needs the opposite axis: what is waiting, what is on the stove, what is ready. Fixed here
   (§4.4) as a separate view rather than by changing the schedule.

5. **The message-card field.**
   Kept as-is and reused as the "note for the kitchen" (no coriander, extra lime). It works, but the
   name is florist-shaped. Renaming it is cosmetic and was not worth a migration; a configurable
   `messageCard.title` (added in this branch) covers the need.

## 4. Food-specific requirements, and what each one cost

### 4.1 `dine_in` fulfillment — *generic, promote*
A third fulfillment type. It describes **where the handover happens**, not what is being sold, which
is why it belongs in Core rather than in a food module. Defaults to off, so nothing changes for
existing stores.

### 4.2 `table_number` — *generic, promote*
Order metadata, not a reserved resource: nothing is held by it, no availability is computed from it.
Validated server-side against a configured `ordering.tables` range (`{min, max}`), stored canonically
(`"007"` and `"7"` are one table). A café, a bar, a bakery with seating all want exactly this.

### 4.3 Opening hours — *generic, promote*
`ordering.openingHours` as weekday → intervals, enforced before an order is written: a closed day is
`closed_day`, a slot outside the intervals is `closed_hours`. A store with no `openingHours` stays
unrestricted. This is not food-specific at all — a florist has opening hours too, v0.2 just never
asked.

### 4.4 Order Queue — *generic, promote*
Lanes for pending / confirmed / preparing / ready, one card per order carrying everything a cook
reads off it, with the status buttons on the card. Terminal states are not lanes: a completed order
leaves the screen. Nothing on it is phở-specific; a bakery or a café would use it unchanged.

### 4.5 Daily stock — *generic, promote*
`ordering.stockPeriod: daily` makes `stock` a per-service-day count instead of a lifetime one,
enforced against `fulfillment_date` in the pre-check and in the `INSERT … SELECT … WHERE` guard, so
two customers cannot both take the last bowl of a day. Nothing about it is food-specific: a bakery,
a café and a shop that hand-makes a few of something each morning all want it. The default is
unchanged, so no existing store moves.

### 4.6 Staff sold-out switch — *generic, promote*
`product_availability` (one row per product staff switched off) plus `GET`/`PATCH
/api/admin/products` and a Menu screen. It only ever takes a product **off** the menu — it never
resurrects one the stock count already exhausted — which keeps it from becoming a second, competing
source of truth. Covered by read-only demo mode for free.

### 4.7 ASAP — *generic, promote*
`ordering.asap` is the order with no time slot: the kitchen starts now. It is the third Flower
assumption this demo tripped over — v0.2 assumed every order names a window, because a florist
always knows when a bouquet is due. A shop that cooks to order often cannot say. Guarded by the
store switch, by "today only", and by the wall clock against `openingHours`, all re-checked server
side. Off by default.

### 4.8 Storefront copy overrides — *generic, promote*
`store.text` reached only the page copy; the catalog cards and the order form were hard-coded, so
every product read "Nhận đặt trước / 予約受付中" and the CTA said "Pre-order" no matter what the shop
sells. The override now reaches all three tables, each taking only the keys it owns. This is the
least glamorous change in the pass and possibly the most reusable: it is what lets a demo be a
different kind of shop rather than a florist with new photos.

### 4.9 Cart — *generic, but hold*
See §7. Multi-item ordering is not food-specific, and the server-side repricing it forced is a
straight improvement, but the state contract should be proven once more before it moves into Core.

## 5. Should go back to Core in v0.3

In the order I would take them:

1. **`dine_in` + `table_number` + `ordering.tables`** — smallest, most clearly generic, fully tested here.
2. **Opening hours** — every store has them; the validation is 12 lines.
3. **Order Queue** — the highest-value screen added in this pass, and not food-specific.
4. **Sold-out switch** — needed by any made-to-order shop.
5. **Multi-item orders (`items[]`) with server-side repricing** — already in the Worker on this
   branch and backward-compatible with single-item payloads. Worth promoting on its own merits even
   if the cart UI waits.
6. **`ordering.stockPeriod: daily`** — the fix for §3.2. Small, defaulted to the old behaviour, and
   the thing that makes `stock` usable for any shop that restocks.
7. **`ordering.asap`** — the order with no slot, for any shop that makes things to order.
8. **`store.text` reaching the catalog and order-form copy** — one-line change per file, and the
   difference between reskinning a florist and configuring a shop.
9. **QR fulfillment context in the storefront** (`?mode=…`) — the mechanism is generic; the dine-in
   reading of it is the only specific part.

## 6. Stays in the demo

- The store name, menu, prices, product images, hero art, palette
- All Vietnamese-first copy and the local wording ("Ăn tại quán", "Mang về", "Gọi món tại bàn")
- The choice to not ask dine-in guests for a name — a café with table service might want to
- The 15-minute pickup slot grid, the per-bowl daily counts and the specific capacity numbers
- The four-language set

## 7. Cart: promote now or wait?

**Wait for one more demo.** The parts that are already proven generic:

- item identity = `productId` + stable options + sorted add-ons
- quantity merging, the `tiemora-cart-v1` localStorage schema, the subscribe/snapshot contract
- the checkout payload (`items[]`) and the server being authoritative for every price

The parts that are not yet proven: whether a shop selling both food and merchandise wants **one**
cart or two, and how the cart should behave when the two have different fulfillment types. That is
exactly what the Café demo will answer. Promoting the state contract before then risks freezing the
wrong shape. The Worker-side half (`items[]`, repricing) has no such doubt and should go now (§5.5).

## 8. Defer to the Café demo

- Whether one cart can hold food and merchandise together
- Mixed fulfillment in a single order (eat one thing here, take another away)
- ASAP pickup (§9) — a café needs it more than a phở shop does
- Menu scheduling (breakfast menu / all-day menu)

## 9. Defer to the Workshop demo

- Anything that reserves a *seat* rather than a *slot count*
- Per-person pricing and attendee lists
- Combining an order with a booking in one checkout

## 10. v0.3 candidates, ranked

| | Item | Why | Size |
|---|---|---|---|
| 1 | `dine_in`, `table_number`, `ordering.tables` | Proven here, additive, defaults off | S |
| 2 | `ordering.openingHours` | Every store has them | S |
| 3 | Order Queue | Highest operational value added in this pass | M |
| 4 | Staff sold-out switch | Any made-to-order shop | S |
| 5 | Multi-item orders + server repricing | Backward compatible, already written | M |
| 6 | ~~`ordering.stock.period: daily`~~ | **Done on this branch** as `ordering.stockPeriod`. Listed here because it is a Core change a v0.3 branch takes with the rest. | M |
| 7 | ASAP pickup alongside scheduled slots | The one real gap this demo left open | M |
| 8 | QR sheet generation for tables | Small, and every dine-in shop needs it | S |
| 9 | Cart state contract | After the Café demo confirms the shape | M |

Items 1–6 are written and tested on this branch; promoting them is a merge decision, not new work.
Items 7–8 are new work. Item 9 is a decision to postpone deliberately.
