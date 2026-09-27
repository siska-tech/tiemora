# Architecture

Tiemora Core is one Cloudflare Worker, a static site and a D1 database. This page explains where each responsibility lives and where the boundaries are.

## Layers

```
┌──────────────────────────────────────────────────────────────────────────┐
│ storefront/  (index.html, app.js, catalog.js, gallery.js, booking.js,    │  browser
│               cart.js, order.js)                                         │
│ admin/       (index.html, admin.js, login.*, sw.js, manifest)            │
├──────────────────────────────────────────────────────────────────────────┤
│ worker/      index.mjs   routing, admin page gating, security headers    │  Cloudflare
│              api.mjs     HTTP handlers, input validation, responses      │
│              orders.mjs / orders-db.mjs  sale orders: handlers, SQL      │
│              customer.mjs  contact validation shared by both flows     │
│              auth.mjs    password sessions, Cloudflare Access, tokens    │
│              db.mjs      repository: every SQL statement                 │
│              push.mjs    Web Push (VAPID + aes128gcm)                    │
│              digest.mjs  the scheduled staff digest (Cron Trigger)       │
│              public-requests.mjs  Turnstile + per-IP throttle            │
│              catalog.mjs / store.mjs  read catalog.json / store.json     │
├──────────────────────────────────────────────────────────────────────────┤
│ core/        catalog/    product.yaml scanning and validation            │  pure JS
│              booking/    dates, statuses, overlap, availability summary, │
│                          handoff / turnaround schedule, rental pricing   │
│              orders/     sale statuses, pricing, windows, capacity       │
│              inventory/  item statuses, ids, availability timelines      │
│              notifications/ messages, phone numbers, chat links          │
│              i18n/       localized values and language fallbacks         │
│              config/     store.yaml schema, theme.css, HTML tokens       │
├──────────────────────────────────────────────────────────────────────────┤
│ scripts/     build.mjs, generate-catalog.mjs, images.mjs, seeds, setup   │  Node
└──────────────────────────────────────────────────────────────────────────┘
```

Rules of thumb:

- `core/` imports nothing from `worker/`, `scripts/` or the browser. It is tested directly with `node --test`.
- `worker/` may import `core/`. Cloudflare-specific objects (`env.DB`, `env.ASSETS`, `ctx.waitUntil`, Turnstile, push services) appear only here.
- The storefront and admin talk to the Worker over `/api/*` and read `/catalog.json` and `/store.json` as static files.

## Data

| Where | What | Source of truth |
|---|---|---|
| `config/store.yaml` → `dist/store.json`, `dist/theme.css` | Store identity, languages, contact, theme, booking limits | Git |
| `catalog/**/product.yaml` → `dist/catalog.json` | Product master data and media list | Git |
| D1 `inventory_items` | Physical copies of products and their status | Database |
| D1 `reservations`, `reservation_items` | Bookings, contact preferences, notification record, consent | Database |
| D1 `handoff_exceptions` | Single dates whose handover hours differ from the weekly schedule | Database |
| D1 `orders`, `order_items` | Sale / pre-orders: fulfillment, time slot, card message, prices at order time, notification record, consent | Database |
| D1 `product_availability` | Staff sold-out switches per sale product | Database |
| D1 `public_request_log` | Hashed client IPs for the public form throttle (pruned daily) | Database |
| D1 `push_subscriptions` | Admin devices' Web Push subscriptions | Database |

Product names, prices and photos are never copied into the database; rows reference products by id.

## Request flow

1. `wrangler.jsonc` routes `/api/*`, `/admin` and `/admin/*` to the Worker (`assets.run_worker_first`). Everything else is served by Static Assets.
2. `worker/index.mjs` gates `/admin/*` behind `authenticate()` and adds security headers; `/api/*` goes to `handleApi()`.
3. `api.mjs` matches a route, checks authentication and CSRF, validates input with the helpers in `util.mjs`, calls the repository and returns JSON.
4. `db.mjs` runs SQL. The one invariant enforced in SQL: an item can be in only one occupying reservation (`pending / confirmed / rented`) for overlapping dates. Inserts run inside `db.batch()` with a `WHERE NOT EXISTS` guard, so concurrent requests cannot both succeed.
5. For a public request, `push.mjs` notifies admin devices via `ctx.waitUntil()` after the response is sent.

## The database boundary

`worker/db.mjs` only uses:

```js
db.prepare(sql).bind(...params).all()      // -> {results}
db.prepare(sql).bind(...params).first(col) // -> row | value | null
db.prepare(sql).bind(...params).run()      // -> {meta: {changes}}
db.batch([statements])                     // one transaction
```

That is Cloudflare D1's interface, and `tests/d1-shim.mjs` implements it over `node:sqlite` in about forty lines. Running Tiemora on another SQLite host or PostgreSQL means providing an object with these four calls (and adjusting the few SQLite-specific expressions such as `strftime`). Domain rules that do not need SQL already live in `core/`.

## Configuration boundary

Nothing store-specific is written in code. `config/store.yaml` is validated by `core/config/store.mjs` and published as `/store.json`; the Worker reads it through the assets binding (`worker/store.mjs`) with `RESERVATION_BUFFER_DAYS` / `STORE_TIMEZONE` environment overrides. Secrets (`ADMIN_PASSWORD`, `TURNSTILE_SECRET_KEY`, `VAPID_PRIVATE_KEY`, …) are environment bindings only.

## Tiemora Core and Tiemora Studio

Tiemora Core is the open-source platform in this repository and is complete on its own. A separate GUI setup tool (Tiemora Studio) and commercial setup services may exist in the future; Core does not depend on them and never will. Anything Core needs is `git clone`, a text editor and a Cloudflare account.

## Tests

| Folder | Runs against | Covers |
|---|---|---|
| `tests/core/` | plain Node | catalog scan, config, booking/inventory rules, handoff and turnaround schedule, rental pricing, availability timelines, orders rules, notifications, holidays, images, seeds, migrations, secret setup |
| `tests/worker/` | Worker + `node:sqlite` shim | API, auth, CSRF, availability, public requests, orders, rental regressions, the staff digest, Turnstile, Web Push |
| `tests/ui/` | jsdom + Worker | storefront and admin pages end to end |

`npm run check` = `lint` + `typecheck` + `test` + `build`, which is what CI runs without any secret.
