# Phở demo implementation plan

## 1. Scope and decision rule

This branch is a reference implementation for a Vietnamese local-food storefront, not a core merge candidate. The guiding rule is: reuse Tiemora Core v0.2.0 wherever possible, and only add the smallest generic extension necessary for food-ordering flow.

This is the historical plan for `pho-demo`. See [core-feedback.md](core-feedback.md) and the [v0.3.0 release notes](../releases/v0.3-result.md) for the reconciled implementation status.

---

## 2. Investigation summary: what is already in v0.2

### A. v0.2 works as-is

These are the parts already supported by current main and are directly reusable for the Phở demo without changing the core domain model:

- Sale product model (`type: sale`)
- `price.sale`
- product `options` and `addons`
- fulfillment flags (`pickup`, `delivery`)
- order capacity counting by time slot and day
- `ordering.stock` per product (`sold-out` handling)
- deadlines / order window
- order status flow (`pending -> confirmed -> preparing -> ready -> completed / cancelled`)
- admin order management UI and API routes
- public order submission flow from storefront to admin
- web push and notification helpers
- read-only demo mode and admin auth / validation patterns
- multilingual storefront and admin strings (`vi`, `en`, with existing fallback support)

Evidence from the codebase:

- `core/orders/rules.mjs` defines status, pricing, date window, slots, and capacity
- `core/config/store.mjs` defines `ordering.fulfillment`, `dates`, `timeSlots`, `dailyCapacity`, `options`, `addons`, and `messageCard`
- `worker/orders.mjs` validates product + fulfillment + slot + capacity + stock in a single public/admin flow
- `storefront/order.js` demonstrates product dialog, option/add-on selection, quantity, date/slot selection, and customer form
- `admin/admin.js` already exposes order management and module detection for sale products

### Working reuse estimate

Provisional assessment:

- v0.2 Orders domain: ~80–90% reusable without change
- Flower pickup flow: yes, directly reusable
- Flower capacity: yes, directly reusable
- product options / add-ons: yes, directly reusable
- existing order statuses: yes, for the normal kitchen flow; they already cover the core ordering lifecycle

The main issue is not the backend status model itself; it is the missing food-specific fulfillment / queue / operational metadata around it.

---

## 3. Demo-config-only items (no core change)

These can be handled by configuration and content-only changes in the demo, without modifying core code:

- Store name and local branding
- menu catalog (12+ products)
- categories such as `pho-bo`, `pho-ga`, `mon-them`, `do-uong`, `combo`
- product copy in Vietnamese-first language
- selected product options per item (`size`, `noodles`, `herbs`, `spice`)
- add-ons like `egg`, `quẩy`, `extra noodles`, `extra beef`, `extra chicken`
- warm cream / wood / green / brick palette through `store.theme`
- hero copy and storefront messaging via `store.store.text`, `store.store.hero`, and catalog metadata
- pickup scheduling values, such as 15-minute windows or a small set of slots
- product sold-out state via existing `available` / sold-out semantics, if the product model is kept consistent
- demo store map / contact details / privacy wording

This is the preferred path for anything that is storefront-specific and not a true domain extension.

---

## 4. Core extension required

The following are not present in v0.2 as first-class concepts and need a minimal generic extension:

### 4.1 dine_in fulfillment

Current v0.2 only recognizes `pickup` and `delivery` in `FULFILLMENT_TYPES` in `core/orders/rules.mjs` and the public/admin validations in `worker/orders.mjs`.

A minimal extension is required for:

- `dine_in` as a valid fulfillment type
- `table_number` as order metadata
- special validation for dine-in customers (table range, optional name/phone)
- admin queue display with table numbers and ready/served labels

This should be implemented generically, not as a Phở-only hack.

### 4.2 table_number validation

This is required for QR-table orders with `/ ?mode=dine_in&table=12` or equivalent URL flow.

Required behavior:

- integer table number
- configured range
- server-side validation
- reject invalid values from URL parameter or request payload
- preserve the value in order data

### 4.3 opening hours support

The current core ordering model has dates and time slots, but no explicit store opening-hours rule set.

A minimal `openingHours` config extension is needed for:

- open/closed by weekday
- lunch window / morning window
- order acceptance windows that constrain pickup times and dine-in capacity
- validation before order creation

This should remain generic enough for local-food shops and cafes, not just Phở.

### 4.4 queue / kitchen view

The v0.2 admin already supports ordered statuses and a basic order list/schedule. However, it does not yet include a dedicated order queue optimized for kitchen work.

A generic queue view is required for:

- order number
- created time
- fulfillment type
- table or pickup window
- items / options / add-ons / quantity / notes
- status controls (`confirm`, `preparing`, `ready`, `complete`, `cancel`)

This should be promoted as a generic food-ordering admin capability rather than a one-off Phở feature.

### 4.5 sold-out admin toggle / availability override

The current product model already supports `available` and sold-out logic in catalog-level flows, but the admin experience is currently oriented around rental inventory and product availability rather than a food-specific operational toggle.

A generic admin field or UI toggle for a sale product’s availability is needed for the demo and is a likely reusable improvement for future food and cafe ordering.

---

## 5. Demo-specific implementation (keep out of core)

These are expected to stay in the Phở demo and should not be promoted to core without further validation:

- storefront theme and warm local-food styling
- Vietnamese-first copy and menu wording
- specific menu items (`Phở bò`, `Phở gà`, `Quẩy`, etc.)
- local-food hero and layout
- special restaurant copy and language tone
- QR dine-in entry route and UI assumptions
- specific queue card layout and kitchen wording
- local operational labels such as “Ăn tại quán” / “Mang về” / “Gọi món tại bàn”
- food-specific product metadata that is not reusable outside food/cafe contexts

The rule is simple: if it is obviously tied to a local restaurant workflow, keep it in the demo until the general pattern is proven elsewhere.

---

## 6. Future / explicit deferrals

These should be postponed and are explicitly not part of the first Phở demo implementation:

- online payment (MoMo / ZaloPay / VNPay)
- kitchen printer integration
- delivery driver tracking
- raw ingredient inventory
- staff scheduling
- loyalty systems
- workshops / appointments / reservation bundles
- inventory resource model abstraction
- generalized availability API across all retail domains

These are beyond the minimum viable local-food adaptation and should not be introduced prematurely.

---

## 7. Proposed implementation order

### Phase 1: config + catalog

- [x] create a Vietnamese-first shop config
- [x] register a 12+ item food catalog
- [x] assign categories and pricing
- [x] define options and add-ons per product
- [x] enable pickup + dine-in, keep delivery dormant or non-defaulted
- [x] set pickup slots and time window

### Phase 2: storefront demo flow

- [x] implement the menu and existing sale-order form flow
- [x] reuse existing sale order form patterns for options and add-ons
- [x] adapt the fulfillment form to expose dine-in and pickup
- [x] add QR table flow and table auto-fill logic
- [x] add reusable multi-item Cart state with localStorage persistence
- [x] submit Cart selections as one server-repriced Order
- [x] keep the existing mobile-oriented, low-bandwidth storefront structure

### Phase 3: core extension for food ordering

- [x] add `dine_in` fulfillment handling with `table_number`
- [x] validate table number server-side and client-side against a configured ordering.tables range
- [x] validate opening hours
- [x] add a dedicated Order Queue view with status controls (the schedule also gained a dine-in column)
- [x] expose sold-out controls in admin (Menu screen + product_availability)

### Phase 4: validation and regression checks

- [x] run all existing v0.2 tests
- [x] add a targeted dine-in order test
- [x] add opening-hours, queue, Cart, and multi-item order tests
- [x] add sold-out-admin tests with the implementation
- [x] run lint, typecheck, build, and the equivalent of `npm run check`

---

### Follow-up implementation completed

- **ASAP pickup** is implemented through `ordering.asap`, with same-day/open-hours validation and migration `0009_asap_orders.sql`.
- **Daily stock** is implemented through product `ordering.stockPeriod: daily`, with service-date stock checks in validation and SQL. The demo now configures per-day bowl counts.
- **QR sheet generation** and a **stable cart state contract** remain deferred.

## 8. A / B / C / D classification

### A. v0.2 already usable

- sale product model
- product option + add-on pricing
- pickup / delivery fulfillment model
- order dates + slot capacity
- stock / sold-out enforcement
- order status lifecycle
- admin orders UI and notification plumbing
- shared customer validation
- static storefront configuration + multilingual support

### B. Demo config only

- store name, brand, colors, hero copy
- categories and items
- local phrasing and translations
- product-level option variants
- pickup slots and sale settings
- menu availability and “demo mode” content

### C. Core extension required

- `dine_in` fulfillment and `table_number`
- QR-table parameter validation
- opening-hours validation
- order queue / kitchen workflow
- generic sold-out admin toggle
- generic fulfillment label / UI mapping improvements

### D. Future deferral

- online payment
- delivery tracking
- richer kitchen printer / POS integration
- ingredient-level inventory
- staff planning and loyalty systems
- other domain abstractions not yet proven by local-food use case

---

## 9. Recommended path before implementation

The next work item after this plan is not the storefront itself. It is to implement only the minimal generic extensions required for food ordering, then build the demo on top of them. That keeps the Phở demo honest as a validation pass for the `Flower Demo -> Core v0.2 -> Phở Demo` migration path.

This plan intentionally minimizes abstraction and keeps the object model close to the current Core v0.2 structure.
