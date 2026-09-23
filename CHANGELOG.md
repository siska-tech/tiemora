# Changelog

All notable changes to Tiemora Core are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

Rental improvements fed back from the first production rental store (Omotenashi, an ao dai rental shop in Hanoi). Everything is opt-in through `booking.*` in `config/store.yaml`; a store that sets none of it keeps whole-day bookings as before.

### Added
- **Timed rentals.** Customers pick a day, a pick-up time and a number of days. Rent is charged per 24 hours from collection, and the return is due at the same time of day. Bookings store `start_at` / `ready_at`, and the overlap rule works on those moments (migrations `0010`, `0011`). Bookings made before this upgrade are read as whole calendar days, so nothing they block changes.
- **Cheaper extra days** with an optional `price.additionalDay` per product (`core/booking/pricing.mjs`). It must be between 0 and the daily rate.
- **Turnaround.** `booking.turnaround` (`none` / `hours` / `overnight`) sets how long a returned item needs before it can go out again. A new `cleaning` item status marks an item that is back but not yet ready (migration `0012`).
- **Handover and opening hours.** `booking.handoff.weekly` and `booking.openingHours` set when the shop can hand items over and when it is open. Staff set single dates that differ in the admin (`#/inventory/handoff`, table `handoff_exceptions`). The storefront shows a continuous time axis per day (`GET /api/products/:id/timeline`), and every unavailable time gives its reason.
- **Fittings.** With `booking.fitting` enabled, a customer can book a short try-on visit. It holds one item for `minutes` + `bufferMinutes`, is free of charge, and uses the same bookings table (`purpose`, migration `0013`).
- **Availability timeline for staff.**
  - The inventory list has a "next 7 days" strip per item: HTML/CSS, one tappable cell per day drawn to scale, and a spoken description of each day for screen readers.
  - Each product and size shows how many items are free per day.
  - The detailed schedule (`#/inventory/schedule`) offers 7 / 14 / 30 days. 7 and 14 days are ECharts charts, one per product group, loaded and drawn only when scrolled into view. 30 days are summarised a day at a time, and every range has a text list.
  - Tapping a day or a bar shows the customer, rental or fitting, due back, actual return and ready again, and on a free day offers **Book this item**.
  - On screens up to 1100px each item is shown as a card.
  - Backed by `GET /api/admin/inventory/timeline` and `core/inventory/timeline.mjs`.
- The inventory list also shows today's stock summary, current and next booking per item, and public requests still waiting for an item.
- **24-hour rentals and public holidays.** A window may end at `24:00`, so a store can be open all day. `booking.handoff.holidayCountry` lists a country's public holidays at build time (`scripts/handoff-holidays.mjs`, [date-holidays](https://github.com/commenthol/date-holidays)), and they get `holidayWindows`: all day unless set. `holidayDates` adds dates by hand, and admin date exceptions still win.
- **Pick-up times by period.** The storefront picks a time from four six-hour periods and a grid of times. The continuous axis moves into a collapsible section. `store.text.handoffNotice` shows a localized note above the booking calendar.
- **Staff digest.** Set `admin.digest.today` / `tomorrow` (store-local times) and every subscribed admin device gets one push with that day's (or the next day's) pick-ups, fittings and returns, plus requests not yet confirmed and overdue rentals. It is sent by a Cron Trigger every 30 minutes (`worker/digest.mjs`, `triggers.crons` in `wrangler.jsonc`), and nothing is sent on an empty day.
- **Rental terms.** `booking.policy` (localized, one term per line) is shown above the consent box on the booking form and added to the confirmation message staff send.

### Changed
- Marking a rental `returned` records `returned_at`, and the item's care window runs from the actual return.
- A rental still out after its planned ready time holds its item until it could be back and cared for from now (now + turnaround). The admin form, the double-booking guard, the public calendar and the public time axis all apply this. Before, the item looked free again from its planned ready time.
- The care window after a timed rental is returned holds the item: it cannot be booked until `ready_at`, and the item is not offered as available today until then. Whole-day bookings from before migration 0011 still free their item on return.
- Rental prices on the storefront read "/ day".
- The public booking form no longer asks for a Messenger link. Customers who choose Messenger are asked to send their booking number to the shop's Messenger.
- ECharts 5 is a dev dependency. The build copies it to `dist/admin/vendor/`, because the admin's CSP allows same-origin scripts only.

### Fixed
- Turnstile never loaded on the booking and order forms when their container had `id="turnstile"`: the element became `window.turnstile`, and Turnstile's `api.js` then skipped installing itself. The container is now `booking-turnstile`, and both forms check for the API instead of the global.

## [0.3.0] - 2026-09-23

Local-store ordering, generalised from the Phở demo. See the [merge notes](docs/releases/v0.3-result.md) for scope and upgrade instructions.

### Added
- Dine-in fulfillment with canonical table numbers and a configurable table range; dine-in guests can order without contact details. QR URLs can preselect fulfillment and a valid table.
- Opening hours by weekday, checked in the store timezone; opt-in ASAP orders for today without a time slot, with an optional displayed lead time.
- Per-product `ordering.stockPeriod: daily`, enforced by service date in both validation and the SQL stock guard. The default remains `total`.
- Admin Order Queue with status actions and a Menu screen for staff sold-out switches, backed by `product_availability` and protected by admin authentication and read-only mode.
- Multi-item `items[]` orders with server-side pricing for every line; legacy single-item requests remain supported.
- Storefront cart implementation with selection persistence. Its storage/state contract remains provisional pending the Café demo; mixed fulfillment is deferred.
- Store copy overrides for catalog cards and order forms, a configurable message-card heading, and environmental hero layout.
- Turnstile and VAPID setup commands with local, dry-run and status modes.

### Fixed
- Restored carts notify subscribers on load so the cart bar reflects saved selections immediately.

### Compatibility
- Apply migrations `0007_dine_in.sql`, `0008_product_availability.sql` and `0009_asap_orders.sql` before deploying the Worker. Released migration `0006_orders.sql` is unchanged.
- Dine-in and ASAP default off, empty opening hours impose no restriction, and stock defaults to a lifetime total. Rental bookings remain a separate domain.
- Demo branding, menu, artwork and capacities are isolated under `examples/pho-demo/`, selected by `npm run build:pho-demo`. Core retains generic defaults. QR sheet generation and a stable cart contract are deferred.

## [0.2.0] - 2026-09-22

Sale / pre-order products and a generic Orders domain, generalised from a production flower-shop deployment of Tiemora Core. Rental support remains available and fully backward compatible; all v0.1.0 tests still pass.

### Added
- Catalog: `type: sale` products (inferred from `price.sale` when omitted), alongside `type: rental`; product option groups and add-ons with per-product price overrides; `fulfillment` (pickup / delivery) and `ordering` (preorder, stock, deadline) metadata; `category` may now be a list.
- Orders domain (`core/orders/rules.mjs`, `core/notifications/orders.mjs`, `migrations/0006_orders.sql`, `worker/orders.mjs`, `worker/orders-db.mjs`): quantity, option selections, add-ons, subtotal / delivery fee / total, customer information, preferred contact channel, privacy consent.
- Order statuses `pending / confirmed / preparing / ready / out_for_delivery / completed / cancelled`, with only the offered transitions accepted by the status endpoint. Rental booking statuses are unchanged and kept as a separate domain.
- Pickup and delivery fulfillment, time slots with per-slot capacity, daily capacity, per-product stock and ordering deadlines, configured under `ordering:` in `config/store.yaml`.
- Customer / contact validation shared between bookings and orders (`worker/customer.mjs`).
- Orders admin: order list with filters, order detail with status buttons and edit form, day schedule (pickups / deliveries per time slot), staff-entered orders, order confirmation notifications. Admin modules (Orders vs. Inventory / Bookings) now follow what the catalog contains.
- Order Web Push notifications for new orders, alongside the existing booking-request push.
- Read-only demo mode (`ADMIN_READ_ONLY`): admin writes are refused with a translated message while sign-in, browsing, public bookings and orders keep working.
- Extended store / theme configuration: `store.logoStyle` (mark / wordmark), `hero.eyebrow` / `hero.subtitle` / `hero.fit` / `hero.focus`, `store.text` copy overrides, semantic theme tokens for hover / selected states so no store-specific colour is hard-coded in the CSS.
- `examples/sale/` with three fictional, industry-neutral sale / pre-order sample products, and `seed/sale-demo.sql` with matching demo orders, kept separate from the rental sample catalog and seed.
- Docs: `docs/orders.md`; updates to `docs/catalog.md`, `docs/configuration.md`, `docs/architecture.md`.

### Changed
- `core/notifications/messages.mjs`: contact-detail extraction (`contactDetails`) split out so it is shared by booking and order notifications.

### Compatibility
- Rental catalog, availability, reservation requests, physical inventory, admin booking, Web Push and customer notifications from v0.1.0 are unchanged; existing `catalog.dir` and `config/store.yaml` files keep working without edits.
- `migrations/0006_orders.sql` is additive: existing v0.1.0 databases upgrade in place, and a fresh database applies all migrations from scratch.

## [0.1.0] - 2026-09-22

First public release of Tiemora Core, extracted from a production rental store and generalised.

### Added
- Folder-based product catalog (`product.yaml` + media) with multilingual fields, discounts, sizes, tags, cover/poster detection and image optimisation at build time.
- Storefront: product grid and detail, four languages (vi / en / ja / zh), live availability, date search, booking request form with contact-channel choice, privacy consent and Cloudflare Turnstile.
- Rental bookings with inclusive date ranges, buffer days, per-size availability and transactional double-booking protection on Cloudflare D1.
- Inventory items separate from products, with `available / reserved / rented / maintenance / inactive` statuses.
- Admin: dashboard, inventory, bookings (confirm / hand over / return / cancel), notification centre, customer-notification helpers (WhatsApp, Messenger, Zalo, copy), settings; vi / en / ja.
- Web Push to admin devices (VAPID + RFC 8291 on Web Crypto, no dependency) for new booking requests.
- Password or Cloudflare Access admin authentication, CSRF protection, per-IP throttle.
- `config/store.yaml` for every store-specific value, published as `/store.json` and `/theme.css`.
- Sample catalog (`examples/catalog/`), demo seed (`seed/demo.sql`), docs, CI, issue templates.
