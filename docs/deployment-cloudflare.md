# Deploying to Cloudflare

Tiemora runs as one Cloudflare Worker with Static Assets and one D1 database. The free plan is enough for a small store. This guide goes from a fresh clone to a live site.

## Resources you will create

| Resource | Purpose | Created by |
|---|---|---|
| Worker `tiemora` | API + admin gate; serves `dist/` as static assets | `npm run deploy` |
| D1 database `tiemora` | inventory, bookings, orders, push subscriptions | `npm run db:create` |
| Turnstile widget (optional) | spam protection on the booking form | `npm run turnstile:create` or the dashboard |
| Secrets | admin password and the other keys below | `npx wrangler secret put …` |
| Cloudflare Access application (optional) | SSO in front of `/admin` | Zero Trust dashboard |

## 1. Prerequisites

- Node.js 22.12+ and npm
- A Cloudflare account
- `npm install` in the project (installs Wrangler)
- `npm run login` (`wrangler login`) once

## 2. Configure the store

Edit `config/store.yaml`: name, languages, contact channels, colours. Put your products under `catalog/` and set `catalog.dir: catalog`. See [configuration.md](configuration.md) and [catalog.md](catalog.md).

## 3. Create the database

```sh
npm run db:create
```

Copy the printed `database_id` into `wrangler.jsonc` (`d1_databases[0].database_id`, replacing `YOUR_D1_DATABASE_ID`). Then apply the migrations:

```sh
npm run db:migrate            # remote
```

Migrations are numbered SQL files in `migrations/`; the runner applies pending files in order to new or existing databases. Back up an existing database before upgrading. For v0.3.0 to v0.4.0, apply pending `0010`–`0013` before deploying the Worker; see the [v0.4.0 upgrade notes](releases/v0.4-result.md). Migrations contain no demo data. Optional demo data: `npm run db:seed` (fictional bookings — do not use on a real store).

## 4. Secrets

```sh
npx wrangler secret put ADMIN_PASSWORD
```

Optional secrets, each enabling a feature together with its public counterpart in `wrangler.jsonc` `vars`:

| Secret | Pair with | Enables |
|---|---|---|
| `TURNSTILE_SECRET_KEY` | `TURNSTILE_SITE_KEY` | Turnstile on the booking form |
| `VAPID_PRIVATE_KEY` | `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` | Web Push to admin devices |
| `ADMIN_SESSION_SECRET` | — | independent session signing key (otherwise derived from the password) |
| `ADMIN_API_TOKEN` | — | `Authorization: Bearer` for scripts |

Locally the same names go in `.dev.vars` (copy `.dev.vars.example`; the file is git-ignored).

## 5. Turnstile (optional)

```sh
npm run setup:turnstile -- --domain yourshop.example
```

The script creates a *Managed* widget (or reuses the one with that name and adds the domain), then writes the **site key** to `wrangler.jsonc` → `vars.TURNSTILE_SITE_KEY` and `.dev.vars`, and uploads the **secret** as `TURNSTILE_SECRET_KEY` — the secret is piped to `wrangler`, never printed. `--dry-run` previews, `--local` stops at `.dev.vars`, `--name` picks a different widget. Creating the widget in the dashboard by hand works too; the same two values are needed. Until both exist the form works without the widget and shows a warning aimed at the store owner.

## 6. Web Push (optional)

```sh
npm run setup:vapid -- --subject mailto:you@example.com
```

The script generates the pair, writes `VAPID_PUBLIC_KEY` and `VAPID_SUBJECT` to `wrangler.jsonc` `vars` (and `.dev.vars`), and uploads `VAPID_PRIVATE_KEY` as a secret. `npm run vapid:generate` still prints a pair if you would rather place the values yourself. After deploying, open `/admin/#/settings` on each phone and press **Enable on this device** (on iPhone, add the admin to the home screen first). Rotating the keys invalidates every subscription, so the script asks for `--force` before replacing a key that is in use.

`npm run setup:status` shows which of the two features has its var, its Cloudflare secret and its `.dev.vars` entry in place.

## 7. Cloudflare Access (optional)

Create a Zero Trust Access application for `/admin` and `/api/admin` on your domain, then set `ACCESS_TEAM_DOMAIN` (the `<team>` in `<team>.cloudflareaccess.com`) and `ACCESS_AUD` (the application audience tag) in `wrangler.jsonc` `vars`. The Worker verifies the `Cf-Access-Jwt-Assertion` JWT itself; the password login is disabled in this mode.

## 8. Local development

```sh
cp .dev.vars.example .dev.vars
npm run dev                   # build → migrate local D1 → wrangler dev on http://localhost:8787
npm run db:seed:local         # optional demo data
```

Local D1 state lives in `.wrangler/state/`. On Windows, stop `wrangler dev` before rebuilding (`dist/` is in use).

## 9. Build and deploy

```sh
npm run check                 # lint + typecheck + tests + build
npm run deploy:check          # wrangler deploy --dry-run
npm run deploy                # build + wrangler deploy
```

The Worker is reachable at `https://tiemora.<your-subdomain>.workers.dev` (rename `name` in `wrangler.jsonc` to change it) or on a custom domain via the dashboard (Workers → Settings → Domains & Routes). Add the domain to your Turnstile widget.

## 10. Recommended hardening

- WAF rate-limiting rules on `/api/admin/login` and `/api/reservation-requests`.
- Cloudflare Access for the admin if more than one person needs it.
- Keep `observability.enabled` on to see Worker logs in the dashboard.

## Environment variables at a glance

| Name | Where | Required | Purpose |
|---|---|---|---|
| `ADMIN_PASSWORD` | secret | yes (unless Access) | admin login |
| `ADMIN_SESSION_SECRET` | secret | no | session cookie signing |
| `ADMIN_API_TOKEN` | secret | no | bearer token for scripts |
| `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` | vars | no | Cloudflare Access mode |
| `TURNSTILE_SITE_KEY` | vars | no | Turnstile widget |
| `TURNSTILE_SECRET_KEY` | secret | no | Turnstile verification |
| `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` | vars | no | Web Push identity |
| `VAPID_PRIVATE_KEY` | secret | no | Web Push signing |
| `RESERVATION_BUFFER_DAYS` | vars | no | overrides `booking.bufferDays` |
| `STORE_TIMEZONE` | vars | no | overrides `timezone` |
