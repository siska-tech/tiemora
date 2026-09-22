# Configuration

Everything that makes a Tiemora deployment *your* store is in `config/store.yaml`. The build validates it (`core/config/store.mjs`), reports bad values as warnings and falls back to defaults, then publishes it as `/store.json` (read by the storefront, the admin and the Worker) and `/theme.css`. **Never put secrets in it** — the file is public.

Set `TIEMORA_CONFIG=/path/to/other.yaml` to build with another file, and `TIEMORA_CATALOG=/path` to override the catalog directory.

## Keys

### `store`

| Key | Type | Notes |
|---|---|---|
| `name` | string | Store name; used in titles, the header, messages to customers |
| `tagline` | localized | Short line under the name |
| `description` | localized | Meta description and hero paragraph |
| `logo` | path or null | e.g. `/assets/logo.webp` (place the file in `storefront/assets/`) |
| `hero.title` | localized or null | `\n` = line break, `<em>…</em>` highlights; null uses the built-in headline |
| `hero.subtitle` | localized or null | reserved |
| `hero.image` | path or null | replaces the neutral hero illustration |
| `announcement` | localized or null | banner above the header |
| `values` | list of localized (max 3) | short claims under the hero |

A *localized* value is a string or a mapping by language code: `{vi: "…", en: "…"}`.

### `catalog.dir`

Folder scanned for products, relative to the project root. Default `catalog`. The demo uses `examples/catalog`. A missing folder falls back to the examples with a notice.

### Locale

| Key | Default | Notes |
|---|---|---|
| `languages` | `[vi, en]` | Subset of `vi, en, ja, zh`, in switcher order |
| `defaultLanguage` | first of `languages` | |
| `currency` | `VND` | ISO 4217; products may override |
| `timezone` | `Asia/Ho_Chi_Minh` | IANA; "today" for availability and the dashboard |
| `phoneCountryCode` | `"84"` | Prepended to local numbers for WhatsApp / Zalo links |

### `contact`

`facebook`, `messenger`, `mapUrl` must be `http(s)` URLs; `zalo` and `whatsapp` are phone numbers (or a `zalo.me` URL); `phone`, `email` strings; `address` localized. `null` hides a channel. The first configured chat channel (Messenger → WhatsApp → Zalo → Facebook) becomes the "message the store" button.

### `categories`

`category id → localized label`. Ids are the folder names / `category:` values in `product.yaml`. Unlisted categories are shown by id.

### `theme`

Six-digit hex colours: `primary`, `accent`, `paper` (background), `ink` (text), `muted`, `line`. Written to `/theme.css` as CSS custom properties used by both the storefront and the admin.

### `booking`

| Key | Default | Notes |
|---|---|---|
| `maxRentalDays` | 60 | longest public request |
| `maxDaysAhead` | 365 | how far ahead a public request may start |
| `bufferDays` | 0 | free days kept between one return and the next start (`RESERVATION_BUFFER_DAYS` overrides) |

### `admin.defaultLanguage`

`vi`, `en` or `ja` — the language the admin opens in before staff choose their own.

## Where things are *not* configured here

| Setting | Where |
|---|---|
| Passwords, Turnstile secret, VAPID private key | Cloudflare Secrets / `.dev.vars` ([deployment](deployment-cloudflare.md)) |
| Turnstile site key, VAPID public key, Access | `wrangler.jsonc` `vars` |
| Worker name, D1 binding | `wrangler.jsonc` |
| Products | `catalog/**/product.yaml` ([catalog](catalog.md)) |
| Privacy policy wording | `storefront/privacy.html` (the store name and contact block are filled from this config; review the text for your jurisdiction) |
| UI strings | `storefront/*.js`, `admin/admin.js` (`copy`, `catalogCopy`, `bookingCopy`, `T`) |
