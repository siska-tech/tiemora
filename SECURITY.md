# Security Policy

## Supported versions

Tiemora is pre-1.0. Security fixes land on the `main` branch and in the next tagged release; there are no long-term support branches.

## Reporting a vulnerability

**Please do not report security problems in public issues, discussions or pull requests.**

Use GitHub's private vulnerability reporting for this repository:
**https://github.com/siska-tech/tiemora/security/advisories/new**

Include what you found, how to reproduce it and, if you can, the impact you expect. You will get an acknowledgement within a few days and updates as the fix progresses. Once a fix is released we will publish an advisory and credit you unless you prefer otherwise.

## Scope

Tiemora Core: the Worker (`worker/`), domain logic (`core/`), the storefront and admin pages, build scripts and migrations. Problems in third-party services (Cloudflare, push services, chat apps) should go to those vendors.

## Deployment notes for operators

- Keep `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `ADMIN_API_TOKEN`, `TURNSTILE_SECRET_KEY` and `VAPID_PRIVATE_KEY` in Cloudflare Secrets or `.dev.vars` only. Nothing under version control should hold them.
- Prefer Cloudflare Access in front of `/admin` and `/api/admin/*` for anything beyond a single-owner shop.
- Add a WAF rate-limiting rule on `/api/admin/login` and `/api/reservation-requests`; the Worker's own throttle is a backstop, not a substitute.
