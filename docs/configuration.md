# Configuration

Everything that makes a Tiemora deployment *your* store is in `config/store.yaml`. The build validates it (`core/config/store.mjs`), reports bad values as warnings and falls back to defaults, then publishes it as `/store.json` (read by the storefront, the admin and the Worker) and `/theme.css`. **Never put secrets in it** — the file is public.

Set `TIEMORA_CONFIG=/path/to/other.yaml` to build with another file, and `TIEMORA_CATALOG=/path` to override the catalog directory. Set `TIEMORA_ASSETS=/path/to/public-artwork` to overlay that directory into `dist/assets/` at build time; include only publishable assets. The standard build uses only `storefront/assets/`.

`npm run build:pho-demo` selects `examples/pho-demo/store.yaml`, its catalog and its artwork together.

## Keys

### `store`

| Key | Type | Notes |
|---|---|---|
| `name` | string | Store name; used in titles, the header, messages to customers |
| `tagline` | localized | Short line under the name |
| `description` | localized | Meta description and hero paragraph |
| `logo` | path or null | e.g. `/assets/logo.webp` (place the file in `storefront/assets/`) |
| `logoStyle` | `mark` / `wordmark` | `mark` (default): a square symbol next to the store name; `wordmark`: the logo already contains the name and replaces the text |
| `hero.eyebrow` | localized or null | small kicker above the title (e.g. a campaign name); null shows the store name |
| `hero.title` | localized or null | `\n` = line break, `<em>…</em>` highlights; null uses the built-in headline |
| `hero.subtitle` | localized or null | italic line under the title |
| `hero.layout` | `split` / `environmental` | `split` (default): separate text and image; `environmental`: immersive scene with scroll zoom |
| `hero.fit` | `pan` / `cover` | `pan` (default): tall crop that slides sideways on scroll; `cover`: the image fills the frame |
| `hero.focus` | `"X% Y%"` or null | object-position for the cover fit |
| `hero.subject` | `"X% Y%"` or null | environmental layout: the point of the image the scroll zoom closes in on (phones pin the scene and zoom onto it; desktop pushes in gently); null uses `hero.focus` |
| `hero.image` | path or null | replaces the neutral hero illustration |
| `announcement` | localized or null | banner above the header |
| `values` | list of localized (max 3) | short claims under the hero |
| `text` | mapping of copy key → localized | overrides the storefront's built-in UI copy so a store can reword the page without touching code. Reaches all three copy tables: the page (`copy` in `storefront/app.js`: `bookCta`, `explore`, `heroNote`, `step1Title`, `footer`, …), the catalog cards (`catalogCopy` in `storefront/catalog.js`: `orderCta`, `perUnit`, `available`, …) and the order form (`orderCopy` in `storefront/order.js`: `cta`, `preorder`, `soldOut`, `pickup`, `fulfillmentTitle`, `terms`, …). A key is only taken by the table that owns it, so the defaults — written for a florist taking pre-orders — can be replaced wholesale by a shop that sells something else |

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
| `handoff.holidayCountry` | null | two-letter country code; the build lists its public holidays (see [booking.md](booking.md#public-holidays)) |
| `handoff.holidayDates` | [] | extra holiday dates written by hand (`YYYY-MM-DD`) |
| `handoff.holidayWindows` | all day | the handoff hours on a holiday; `[]` closes |
| `policy` | null | the store's rental terms (deposit, late return, damage): text or a language mapping, one term per line. Shown in a box above the consent checkbox on the booking form, and added to the confirmation message staff send |

Timed rentals, turnaround, handover hours and fittings are described in [booking.md](booking.md).


### `ordering`

Sale / pre-order products (`type: sale` in `product.yaml`). See [orders.md](orders.md) for the whole model.

| Key | Default | Notes |
|---|---|---|
| `fulfillment.pickup` / `delivery` | true / true | which ways are offered (at least one) |
| `fulfillment.dine_in` | false | eat-in orders: adds a table number to the order. Off unless the store asks for it |
| `fulfillment.deliveryFee` | 0 | added to delivery orders |
| `fulfillment.deliveryNote` | null | localized text under the delivery choice |
| `dates.from` / `dates.to` | null | explicit campaign window (YYYY-MM-DD); with both set the form offers only these days |
| `dates.minLeadDays` / `maxDaysAhead` | 1 / 14 | rolling window used when no campaign window is set |
| `deadline` | null | ISO date-time after which no public order is accepted |
| `dailyCapacity` | null | orders per day (null = no limit) |
| `timeSlots` | [] | `{id, start, end, capacity, label}`; `id` defaults to `HHMM-HHMM`, `capacity` null = no limit |
| `openingHours` | {} | weekday → list of `{start, end}` (`mon`…`sun`, or `0`–`6` with `0` = Sunday). A day that is absent or has an empty list is closed. Orders on a closed day, or in a slot that is not fully inside an interval, are refused. Leave empty for no restriction |
| `asap` | `{enabled: false, leadMinutes: null}` | "as soon as you can": an order with no time slot. Accepted only while the shop is open (per `openingHours`) and only for today. `leadMinutes` is what the customer is told to expect, not a promise the server enforces |
| `tables` | `{min: 1, max: 99}` | the table numbers a dine-in order may name. A number outside the range is refused, in the browser and again in the Worker. An inverted range falls back to the default |
| `options` | {} | `group → {label, choices: {id → {label, price}}}`; products list the ids they offer |
| `addons` | {} | `id → {label, price}` |
| `messageCard` | enabled, 200 chars | `enabled`, `maxLength`, `title` (localized; replaces the "Card message" heading, e.g. "Note for the kitchen"), `placeholder`, `templates: [{id, label, text}]` |

Limits are counted from active orders; nothing is shown as scarce unless a limit is configured.

### `admin.defaultLanguage`

`vi`, `en` or `ja` — the language the admin opens in before staff choose their own. The staff digest is written in it too.

### `admin.digest`

`today` / `tomorrow`: store-local times (`HH:MM`) at which every admin device subscribed to Web Push gets one notification. `today` lists that day's confirmed pick-ups and fittings, the rentals due back, requests not yet confirmed, and rentals already overdue. `tomorrow` lists the next day's. A day with nothing on it sends nothing. Both default to null (off). Needs the VAPID keys and the Cron Trigger in `wrangler.jsonc` (`*/30 * * * *`). Each run sends whichever digest falls due in its half hour.


## Where things are *not* configured here

| Setting | Where |
|---|---|
| Passwords, Turnstile secret, VAPID private key | Cloudflare Secrets / `.dev.vars` ([deployment](deployment-cloudflare.md)) |
| Turnstile site key, VAPID public key, Access, `ADMIN_READ_ONLY` | `wrangler.jsonc` `vars` |
| Worker name, D1 binding | `wrangler.jsonc` |
| Products | `catalog/**/product.yaml` ([catalog](catalog.md)) |
| Privacy policy wording | `storefront/privacy.html` (the store name and contact block are filled from this config; review the text for your jurisdiction) |
| UI strings | `storefront/*.js`, `admin/admin.js` (`copy`, `catalogCopy`, `bookingCopy`, `T`) |
