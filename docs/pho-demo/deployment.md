# Phở demo deployment

The demo runs on the generic Tiemora deployment path in [docs/deployment-cloudflare.md](../deployment-cloudflare.md).
Only the differences are recorded here.

`wrangler.jsonc` is the generic Core configuration (Worker name `tiemora`, placeholder D1 id,
empty public keys). Copy it to the ignored `wrangler.local.jsonc` for a deployment, then set
its Worker name, database id and public keys. Do not commit deployment-specific values.

Build and run the demo explicitly:

```sh
npm run build:pho-demo
npx wrangler d1 migrations apply tiemora --local --config wrangler.local.jsonc
npx wrangler dev --config wrangler.local.jsonc
```

For remote deployment, apply migrations with `--remote --config wrangler.local.jsonc`,
then run `npm run build:pho-demo` and `npx wrangler deploy --config wrangler.local.jsonc`.
Use the same `--config wrangler.local.jsonc` for secret commands. `npm run deploy` builds
the generic store, so use the explicit sequence above for the demo. The setup helpers
currently target the standard Wrangler file; use Wrangler directly for this local configuration.

## Per-deployment values

| Setting | Where it comes from |
|---|---|
| `d1_databases[0].database_name` / `database_id` | `npm run db:create`, or the id of an existing D1 in the dashboard |
| Worker subdomain | the Cloudflare account's own `<subdomain>.workers.dev` |
| `ADMIN_PASSWORD` | `npx wrangler secret put ADMIN_PASSWORD --config wrangler.local.jsonc` — typed into the terminal, never into a file |
| `ADMIN_SESSION_SECRET` (optional) | `npx wrangler secret put ADMIN_SESSION_SECRET --config wrangler.local.jsonc` |

## Migrations

This branch adds three migrations on top of the v0.2.0 set:

- `0007_dine_in.sql` — `dine_in` as a fulfillment type and `table_number` on `orders`
- `0008_product_availability.sql` — the staff sold-out switch
- `0009_asap_orders.sql` - the explicit ASAP flag on orders

Apply all three before deploying the updated Worker. Back up an existing remote database first.

```sh
npx wrangler d1 migrations apply tiemora --remote --config wrangler.local.jsonc
```

**If a database was migrated from an early state of this branch**, when `0006_orders.sql` had been
edited in place rather than followed by `0007`, wrangler considers 0006 applied and will not re-run
it. Check before deploying:

```sh
npx wrangler d1 execute tiemora --remote --config wrangler.local.jsonc --command "PRAGMA table_info(orders);"
```

`table_number` must be in the list and `fulfillment_type`'s CHECK must accept `dine_in`. If the
column is already there from an edited 0006, do not assume a lossless upgrade: `0007` copies the
released v0.2 columns and initializes `table_number` to an empty string. Back up and inspect that
experimental database, and plan how to preserve its table values before applying the migration.
The tested upgrade path is the released v0.2 schema; existing orders and their lines are preserved.
After all migrations, `PRAGMA table_info(orders)` must also include `asap`.

## After deploying

- `/` loads the menu
- `/api/orders/config` answers with `fulfillment.dine_in: true` and a `tables` range
- `/admin/` accepts the password set above
- a dine-in order placed through `/?mode=dine_in&table=12` arrives with its table
- a table number outside the configured range is refused
- ASAP orders have `asap: 1` and an empty time slot; closed-hours and future-day ASAP requests are refused
- daily stock for one service date does not exhaust the next date
- `/admin/#/orders/queue` shows the order and its status buttons move it along
- `/admin/#/menu` switches a dish off and the storefront shows it sold out
