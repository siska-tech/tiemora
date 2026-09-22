# Phở demo deployment

The demo runs on the generic Tiemora deployment path in [docs/deployment-cloudflare.md](../deployment-cloudflare.md).
Only the differences are recorded here.

`wrangler.jsonc` in this branch ships **placeholders**, not this deployment's values: the Worker name
is the one demo-specific entry (`pho`), while `database_id`, `TURNSTILE_SITE_KEY`, `VAPID_PUBLIC_KEY`
and `VAPID_SUBJECT` are blank on purpose so the branch carries no account identifiers. Fill them in
locally (or with `npm run setup:turnstile` / `npm run setup:vapid`) before deploying; do not commit
them back.

## Per-deployment values

| Setting | Where it comes from |
|---|---|
| `d1_databases[0].database_name` / `database_id` | `npm run db:create`, or the id of an existing D1 in the dashboard |
| Worker subdomain | the Cloudflare account's own `<subdomain>.workers.dev` |
| `ADMIN_PASSWORD` | `npx wrangler secret put ADMIN_PASSWORD` — typed into the terminal, never into a file |
| `ADMIN_SESSION_SECRET` (optional) | `npx wrangler secret put ADMIN_SESSION_SECRET` |

## Migrations

This branch adds two migrations on top of the v0.2.0 set:

- `0007_dine_in.sql` — `dine_in` as a fulfillment type and `table_number` on `orders`
- `0008_product_availability.sql` — the staff sold-out switch

```sh
npm run db:migrate            # wrangler d1 migrations apply <db> --remote
```

**If a database was migrated from an early state of this branch**, when `0006_orders.sql` had been
edited in place rather than followed by `0007`, wrangler considers 0006 applied and will not re-run
it. Check before deploying:

```sh
npx wrangler d1 execute <db> --remote --command "PRAGMA table_info(orders);"
```

`table_number` must be in the list and `fulfillment_type`'s CHECK must accept `dine_in`. If the
column is already there from the edited 0006, `0007` still applies cleanly: it rebuilds the table
from whatever columns exist and re-inserts the order lines, so no data is lost either way.

## After deploying

- `/` loads the menu
- `/api/orders/config` answers with `fulfillment.dine_in: true` and a `tables` range
- `/admin/` accepts the password set above
- a dine-in order placed through `/?mode=dine_in&table=12` arrives with its table
- a table number outside the configured range is refused
- `/admin/#/orders/queue` shows the order and its status buttons move it along
- `/admin/#/menu` switches a dish off and the storefront shows it sold out
