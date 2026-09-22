# Changelog

All notable changes to Tiemora Core are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
