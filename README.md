# Tiemora

**Tiemora is an open-source catalog-first storefront, booking, ordering and inventory platform for small businesses.**

Vietnam-first workflows. Cloudflare-native infrastructure.

> Tiemora Core (this repository) is MIT-licensed and works on its own: clone, configure, deploy.
> It has no dependency on any hosted service other than your own Cloudflare account.

## What is Tiemora?

Small shops usually start with a beautiful catalog and a chat app. Tiemora keeps that workflow and adds just enough structure around it:

- a **catalog** written as folders of `product.yaml` + photos, published as a fast static site, with two product types: **rental** (booked by date) and **sale / pre-order** (bought by quantity);
- **availability by date** for rental items, and **capacity** (time slots, daily limits, stock) for sale / pre-order items;
- a **booking request form** and an **order form** customers can send without an account, with the contact channel they prefer (Zalo, WhatsApp, Messenger, phone);
- an **admin** for staff: dashboard, inventory, bookings (pending → confirmed → rented → returned), orders (pending → confirmed → preparing → ready → out for delivery → completed), customer-notification helpers and push notifications on their phones.

Nothing talks to WhatsApp, Zalo or Messenger APIs. Staff open a click-to-chat link or copy a message, send it from their own account, and mark the booking or order as notified. This keeps the platform free to run and simple to reason about.

## Features

| Area | What you get |
|---|---|
| Catalog | YAML product definitions, multilingual names and descriptions (vi / en / ja / zh), price and discount, category (or category list), tags, sizes, colours, images and videos, recursive folder scan, duplicate-id detection, `catalog.json` generation, automatic image optimisation |
| Storefront | Product grid and detail dialog, responsive, four languages, live stock status, date search, booking request form, sale order form with options / add-ons / quantity, privacy consent, Cloudflare Turnstile |
| Rental / booking | Start and end dates (inclusive), per-size availability, buffer days between rentals, pending requests that hold no stock until staff confirm, statuses `pending / confirmed / rented / returned / cancelled` |
| Sale / local-store (v0.3) | Product options and add-ons, quantity, card message, pickup / delivery / dine-in, table metadata, opening hours, time slots or ASAP, daily capacity, total or daily stock, staff sold-out switches and deadlines, statuses `pending / confirmed / preparing / ready / out_for_delivery / completed / cancelled` |
| Inventory | Products (catalog) and inventory items (physical copies, `product-id-01`, `-02`, …) are separate; item statuses `available / reserved / rented / maintenance / inactive` |
| Admin | Dashboard, inventory management, booking management, orders (list, detail, schedule, queue, staff-entered orders), Menu sold-out controls, confirm / hand over / return / cancel, maintenance, notification centre, read-only demo mode, settings; Vietnamese, English and Japanese UI |
| Customer contact helpers | WhatsApp click-to-chat with prefilled text, Messenger links, Zalo number + message copy, confirmation messages in four languages, preferred channel, "customer notified" record, shared by bookings and orders |
| Web Push | Admin devices subscribe from the settings page; a new booking request or order pushes to every device; VAPID and RFC 8291 encryption implemented on Web Crypto with no dependency |
| Privacy & security | Privacy policy page, mandatory consent, Turnstile, server-side validation, password or Cloudflare Access admin login, CSRF protection, per-IP throttle, session cookies, `ADMIN_READ_ONLY` demo mode |
| Cloudflare | One Worker, Static Assets, D1, migrations, Turnstile, Web Push, Wrangler, local development, free-plan friendly |

## Screenshots

Run `npm run dev` and open `http://localhost:8787/` (storefront) and `http://localhost:8787/admin/` (admin, password from `.dev.vars`). The repository ships with three fictional rental sample products (`examples/catalog/`) and three fictional sale sample products (`examples/sale/`), with matching demo data (`seed/demo.sql`, `seed/sale-demo.sql`). The default is the rental sample. Build the 12-product Phở reference demo with `npm run build:pho-demo`; its separate configuration and artwork live in `examples/pho-demo/`. Use the matching catalog before loading rental or generic sale seeds.

## Architecture

```
config/store.yaml     store name, languages, contact links, theme, booking limits, ordering  ─┐
examples/catalog/     rental product.yaml + media (your own go in catalog/)                  ─┤ npm run build
examples/sale/        sale / pre-order product.yaml + media                                  ─┤
                                                                                              ▼
dist/                 storefront + store.json + theme.css + catalog.json + media + admin/
                                                                                              │
Cloudflare Workers Static Assets ◄─────────────────────────────────────────────────────────────┘
        │  /api/*  /admin*
        ▼
worker/               routing, auth, Turnstile, Web Push, repository (SQL over D1), orders
        │
core/                 pure domain logic: catalog, booking rules, orders rules, inventory, notifications, i18n, config
        │
Cloudflare D1         inventory_items · reservations · reservation_items · orders · order_items · public_request_log · push_subscriptions
```

- `core/` has no Cloudflare or browser dependency and is unit-tested directly.
- `worker/db.mjs` is the repository; it only needs the D1 prepared-statement interface, which `tests/d1-shim.mjs` re-implements over `node:sqlite`. Porting to SQLite or PostgreSQL means writing that adapter.
- `storefront/` and `admin/` are plain HTML/CSS/JS with no build step of their own.

See [docs/architecture.md](docs/architecture.md).

## Quick Start

### Prerequisites

- Node.js 22.12 or newer (24 recommended; tests use `node:sqlite`)
- npm
- A Cloudflare account (free plan is enough)
- Wrangler (installed as a dev dependency; `npx wrangler …`)

### Local setup

```sh
git clone https://github.com/siska-tech/tiemora.git
cd tiemora
npm install
cp .dev.vars.example .dev.vars      # set ADMIN_PASSWORD
npm run dev                          # build → migrate local D1 → wrangler dev
```

Open `http://localhost:8787/`. The admin lives at `http://localhost:8787/admin/`. To load the demo bookings into the local database, run `npm run db:seed:local` in another terminal.

### Cloudflare setup

```sh
npm run login                        # once
npm run db:create                    # creates the D1 database "tiemora"; paste the database_id into wrangler.jsonc
npm run db:migrate                   # applies migrations/ to the remote database
npx wrangler secret put ADMIN_PASSWORD
```

### Turnstile and Web Push (optional)

Both need a key in three places (a var in `wrangler.jsonc`, a Cloudflare Secret and `.dev.vars`).
`npm run setup:*` creates the keys and writes all three; no secret is printed or pasted by hand.

```sh
npm run setup:turnstile -- --domain yourshop.example   # creates (or reuses) the widget
npm run setup:vapid -- --subject mailto:you@example.com
npm run setup:status                                   # what is configured, locally and on Cloudflare
```

Add `--dry-run` to see the changes first, `--local` to write only `.dev.vars`, and `--force` to replace
keys already in use (rotating VAPID signs every admin device out of push). Then `npm run deploy`:
the vars only reach the Worker with the next deploy.

### Build and deploy

```sh
npm run check                        # lint + typecheck + test + build
npm run deploy                       # build + wrangler deploy
```

Full walk-through: [docs/deployment-cloudflare.md](docs/deployment-cloudflare.md).

## Product Catalog

One folder per product, anywhere under the catalog directory:

```
catalog/
└─ dresses/
   └─ red-classic/
      ├─ product.yaml
      ├─ cover.jpg
      ├─ 02.jpg
      └─ demo.mp4
```

```yaml
id: dress-0001
name:
  vi: Váy đỏ cổ điển
  en: Classic Red Dress
category: dresses
price:
  rental: 300000
sizes: [S, M, L]
inventory:
  managed: true      # live stock from the admin's inventory items
```

Point `catalog.dir` in `config/store.yaml` at your folder (the default uses `examples/catalog`; `npm run build:pho-demo` selects the separate food demo). Details: [docs/catalog.md](docs/catalog.md).

## Booking & Inventory

- A **product** is the catalog entry. An **inventory item** is one physical copy: `dress-0001-01`, `dress-0001-02`, … registered in the admin.
- A public **request** is a `pending` booking that names a product (and size) but holds no item. Staff press **Confirm**: stock is re-checked and a free item is assigned. Then **Hand over** (`rented`) and **Returned** (item back to `available`).
- Two bookings clash when their inclusive date ranges overlap, optionally padded by `booking.bufferDays`. Clashes are rejected at the API and again inside the database transaction.

Details: [docs/booking.md](docs/booking.md), [docs/inventory.md](docs/inventory.md).

## Orders (sale / local-store, v0.3)

- A `type: sale` product is sold by quantity, not booked by date. A customer picks option groups (size, tone, …) and add-ons, writes an optional card message, chooses **pickup**, **delivery** or enabled **dine-in**, a day and a time slot (or enabled ASAP), and sends an order.
- Capacity is counted, not itemised: a time slot holds N orders, a day holds N orders, a product sells N units (`ordering.stock` in `product.yaml`). Every limit is optional.
- Staff manage orders in the admin: list, detail, day schedule, status flow `pending → confirmed → preparing → ready → (out_for_delivery) → completed / cancelled`, and the same notification helpers as bookings.
- Rental and sale products can live in the same catalog; the admin shows the modules the catalog needs.

Multi-item orders are repriced on the server. Daily stock, opening hours, table validation and staff sold-out controls support local shops. The existing cart UI ships with a provisional state contract; mixed fulfillment remains deferred.

Details: [docs/orders.md](docs/orders.md). Upgrade and scope: [v0.3.0 release notes](docs/releases/v0.3-result.md).

## Admin

`/admin/` is a small hash-routed app behind a password login (or Cloudflare Access). Dashboard, inventory, bookings, notification centre (bell), settings (push notifications, store configuration summary). Vietnamese, English and Japanese; the starting language comes from `admin.defaultLanguage`.

## Cloudflare Deployment

Everything runs on one Worker with Static Assets and one D1 database. `wrangler.jsonc` ships with a placeholder `database_id` and empty keys; nothing in the repository identifies a real account. See [docs/deployment-cloudflare.md](docs/deployment-cloudflare.md).

## Configuration

All store-specific values live in [config/store.yaml](config/store.yaml): name, tagline, description, hero, announcement, languages, currency, time zone, phone country code, contact channels, category labels, theme colours, booking limits, ordering (sale / pre-order fulfillment, dates, capacity, options, add-ons, card message), admin language. The build validates the file and publishes it as `/store.json`. Secrets never go there. Reference: [docs/configuration.md](docs/configuration.md).

## Security

- Admin: HMAC-signed session cookie (HttpOnly, SameSite=Strict) or Cloudflare Access JWT; optional bearer token for scripts.
- Writes require `X-Requested-With: fetch` and a same-origin `Origin` / `Sec-Fetch-Site` (CSRF).
- Public form: server-side validation of every field, Turnstile when configured, per-IP throttle (hashed IPs), duplicate-request folding, privacy consent required.
- Content Security Policy on the admin pages; `dist/` never contains YAML, config secrets or originals.
- Report vulnerabilities privately: see [SECURITY.md](SECURITY.md).

## Roadmap

**Supported now** — Catalog · Rental / booking · Sale / pre-order · Orders · Inventory · Admin · Customer contact helpers · Web Push · Read-only demo mode · Cloudflare deployment

**Future** — Dine-in · Workshop / class bookings · Appointments · Unified fulfillment vocabulary · Theme system · Setup wizard (Tiemora Studio) · Other database adapters

Only the items under "Supported now" are implemented today.

## Contributing

Issues and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE). Flag icons in `storefront/assets/flags/` are MIT-licensed (see the LICENSE file in that folder).
