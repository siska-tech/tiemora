# Contributing to Tiemora

Thanks for helping. Tiemora Core is a small codebase on purpose; the best contributions keep it that way.

## Before you start

- Open an issue for anything bigger than a bug fix so we can agree on the approach.
- Check the [roadmap](README.md#roadmap): workshop / class bookings, appointments beyond fittings, a unified fulfillment vocabulary, a theme system and other database adapters are planned but not yet in scope for Core.
- Anything that depends on a paid API (WhatsApp Cloud API, Zalo OA, Messenger Platform) or on a hosted service stays out of Core.

## Development

```sh
npm install
cp .dev.vars.example .dev.vars
npm run dev            # storefront + admin + API on http://localhost:8787
npm run check          # lint + typecheck + test + build (what CI runs)
```

- `npm test` runs `node --test`; the Worker is exercised against `node:sqlite` through `tests/d1-shim.mjs`, the pages in jsdom. Node 22.12+ is required.
- Keep domain logic in `core/` free of Cloudflare and browser APIs. Cloudflare-specific code lives in `worker/`.
- Storefront and admin scripts are plain browser JavaScript with no build step; keep them that way.
- User-facing strings exist in vi, en, ja and zh (storefront) and vi, en, ja (admin). Add all of them when you add a string.

## Pull requests

- One topic per PR, with tests for behaviour changes.
- Migrations are append-only: add `migrations/000N_*.sql`, never edit an applied one.
- Do not commit anything from a real store: photos, phone numbers, page ids, database ids, keys. CI does not need secrets and neither should tests.
- Describe what changed and why in the PR; the template asks the questions we care about.

## Reporting security issues

Please do not open a public issue. See [SECURITY.md](SECURITY.md).
