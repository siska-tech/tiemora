# Changelog

All notable changes to Tiemora Core are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
