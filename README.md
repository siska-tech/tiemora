# Tiemora

**Tiemora is an open-source catalog-first storefront, booking and inventory platform for small businesses.**

Vietnam-first workflows. Cloudflare-native infrastructure.

> Tiemora Core (this repository) is MIT-licensed and works on its own: clone, configure, deploy.
> It has no dependency on any hosted service other than your own Cloudflare account.

## What is Tiemora?

Small shops usually start with a beautiful catalog and a chat app. Tiemora keeps that workflow and adds just enough structure around it:

- a **catalog** written as folders of `product.yaml` + photos, published as a fast static site;
- **availability by date** for the physical items you actually own;
- a **booking request form** customers can send without an account, with the contact channel they prefer (Zalo, WhatsApp, Messenger, phone);
- an **admin** for staff: dashboard, inventory, bookings (pending → confirmed → rented → returned), customer-notification helpers and push notifications on their phones.

Nothing talks to WhatsApp, Zalo or Messenger APIs. Staff open a click-to-chat link or copy a message, send it from their own account, and mark the booking as notified. This keeps the platform free to run and simple to reason about.

## Features

| Area | What you get |
|---|---|
| Catalog | YAML product definitions, multilingual names and descriptions (vi / en / ja / zh), price and discount, category, tags, sizes, colours, images and videos, recursive folder scan, duplicate-id detection, `catalog.json` generation, automatic image optimisation |
| Storefront | Product grid and detail dialog, responsive, four languages, live stock status, date search, booking request form, privacy consent, Cloudflare Turnstile |
| Rental / booking | Start and end dates (inclusive), per-size availability, buffer days between rentals, pending requests that hold no stock until staff confirm, statuses `pending / confirmed / rented / returned / cancelled` |
| Inventory | Products (catalog) and inventory items (physical copies, `product-id-01`, `-02`, …) are separate; item statuses `available / reserved / rented / maintenance / inactive` |
| Admin | Dashboard, inventory management, booking management, confirm / hand over / return / cancel, maintenance, notification centre, settings; Vietnamese, English and Japanese UI |
| Customer contact helpers | WhatsApp click-to-chat with prefilled text, Messenger links, Zalo number + message copy, confirmation messages in four languages, preferred channel, "customer notified" record |
| Web Push | Admin devices subscribe from the settings page; a new booking request pushes to every device; VAPID and RFC 8291 encryption implemented on Web Crypto with no dependency |
| Privacy & security | Privacy policy page, mandatory consent, Turnstile, server-side validation, password or Cloudflare Access admin login, CSRF protection, per-IP throttle, session cookies |
| Cloudflare | One Worker, Static Assets, D1, migrations, Turnstile, Web Push, Wrangler, local development, free-plan friendly |

## Screenshots

Run `npm run dev` and open `http://localhost:8787/` (storefront) and `http://localhost:8787/admin/` (admin, password from `.dev.vars`). The repository ships with three fictional sample products and demo bookings.

## Architecture

```
config/store.yaml     store name, languages, contact links, theme, booking limits  ─┐
examples/catalog/     product.yaml + media (your own go in catalog/)               ─┤ npm run build
                                                                                    ▼
dist/                 storefront + store.json + theme.css + catalog.json + media + admin/
                                                                                    │
Cloudflare Workers Static Assets ◄──────────────────────────────────────────────────┘
        │  /api/*  /admin*
        ▼
worker/               routing, auth, Turnstile, Web Push, repository (SQL over D1)
        │
core/                 pure domain logic: catalog, booking rules, inventory, notifications, i18n, config
        │
Cloudflare D1         inventory_items · reservations · reservation_items · public_request_log · push_subscriptions
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

### Turnstile (optional, recommended)

```sh
npm run turnstile:create             # or create a widget in the dashboard; add your domain
# sitekey  -> wrangler.jsonc vars.TURNSTILE_SITE_KEY
npx wrangler secret put TURNSTILE_SECRET_KEY
```

### Web Push / VAPID (optional)

```sh
npm run vapid:generate
# VAPID_PUBLIC_KEY, VAPID_SUBJECT -> wrangler.jsonc vars
npx wrangler secret put VAPID_PRIVATE_KEY
```

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

Point `catalog.dir` in `config/store.yaml` at your folder (the demo uses `examples/catalog`). Details: [docs/catalog.md](docs/catalog.md).

## Booking & Inventory

- A **product** is the catalog entry. An **inventory item** is one physical copy: `dress-0001-01`, `dress-0001-02`, … registered in the admin.
- A public **request** is a `pending` booking that names a product (and size) but holds no item. Staff press **Confirm**: stock is re-checked and a free item is assigned. Then **Hand over** (`rented`) and **Returned** (item back to `available`).
- Two bookings clash when their inclusive date ranges overlap, optionally padded by `booking.bufferDays`. Clashes are rejected at the API and again inside the database transaction.

Details: [docs/booking.md](docs/booking.md), [docs/inventory.md](docs/inventory.md).

## Admin

`/admin/` is a small hash-routed app behind a password login (or Cloudflare Access). Dashboard, inventory, bookings, notification centre (bell), settings (push notifications, store configuration summary). Vietnamese, English and Japanese; the starting language comes from `admin.defaultLanguage`.

## Cloudflare Deployment

Everything runs on one Worker with Static Assets and one D1 database. `wrangler.jsonc` ships with a placeholder `database_id` and empty keys; nothing in the repository identifies a real account. See [docs/deployment-cloudflare.md](docs/deployment-cloudflare.md).

## Configuration

All store-specific values live in [config/store.yaml](config/store.yaml): name, tagline, description, hero, announcement, languages, currency, time zone, phone country code, contact channels, category labels, theme colours, booking limits, admin language. The build validates the file and publishes it as `/store.json`. Secrets never go there. Reference: [docs/configuration.md](docs/configuration.md).

## Security

- Admin: HMAC-signed session cookie (HttpOnly, SameSite=Strict) or Cloudflare Access JWT; optional bearer token for scripts.
- Writes require `X-Requested-With: fetch` and a same-origin `Origin` / `Sec-Fetch-Site` (CSRF).
- Public form: server-side validation of every field, Turnstile when configured, per-IP throttle (hashed IPs), duplicate-request folding, privacy consent required.
- Content Security Policy on the admin pages; `dist/` never contains YAML, config secrets or originals.
- Report vulnerabilities privately: see [SECURITY.md](SECURITY.md).

## Roadmap

**v0.x (this release)** — Catalog · Rental · Booking · Inventory · Admin · Customer contact helpers · Web Push · Cloudflare deployment

**Future** — Sale (purchase) products · Workshop / class bookings · Appointments · Pre-orders · Theme system · Setup wizard (Tiemora Studio) · Other database adapters

Only the v0.x items are implemented today.

## Contributing

Issues and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE). Flag icons in `storefront/assets/flags/` are MIT-licensed (see the LICENSE file in that folder).
