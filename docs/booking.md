# Booking (rental)

Tiemora v0.x supports **rental** bookings: an inclusive range of calendar days during which one or more inventory items are with a customer.

## Statuses

| Status | Meaning | Holds stock? | Item effect |
|---|---|---|---|
| `pending` | Requested, not yet confirmed by staff | yes, if items are attached; a public request has none | — |
| `confirmed` | Staff confirmed; items assigned | yes | — |
| `rented` | Handed over | yes | items → `rented` |
| `returned` | Back in the store | only until `ready_at`, for a timed rental: its care window cannot be booked | items → `available` (unless in maintenance / inactive) |
| `cancelled` | Cancelled at any point | no | items → `available` if they were reserved/rented for this booking |

Transitions offered in the admin: `pending → confirmed → rented → returned`, and `cancelled` from anything but `returned`. The API accepts any status through `PATCH`, subject to the rules below.

## Overlap rule

Two bookings clash when

```
existing.start < requested.ready AND existing.ready > requested.start
```

on the same inventory item, both in an occupying status (`pending`, `confirmed`, `rented`). The two
moments are the interval under **The rental interval** below; a booking that names no time of day
runs midnight to midnight after its last calendar day, which is the rule this one replaced.
`booking.bufferDays` in `config/store.yaml` (or the `RESERVATION_BUFFER_DAYS` variable) widens the
requested interval so a return and the next pick-up can be kept apart.

The clash is checked before writing (to give a helpful `409 inventory_conflict` with the offending booking) **and** inside the insert (`INSERT … SELECT … WHERE NOT EXISTS`) within a `db.batch()` transaction, so two simultaneous requests cannot both succeed.

## When a rental runs

Three separate things decide whether a customer may collect a garment at a given moment, and they
are kept apart on purpose:

| | what it answers | where it comes from |
| --- | --- | --- |
| inventory availability | is a physical item free? | `reservation_items` + the interval rule below |
| item readiness | is it back and cared for? | `booking.turnaround` applied to the return |
| handoff availability | is anybody there to hand it over? | `booking.handoff.weekly` + `handoff_exceptions` |

The bookable moments are the intersection of all three. `core/booking/schedule.mjs` holds the rules;
nothing in it knows that a dress shop launders overnight -- that is one store's turnaround policy.

## Pick-up windows and price

Rent is charged per 24 hours from the moment a garment is collected. A customer picks a day, an hour
off that day's axis and a length in whole days (`start_date`, `start_time`, `rental_days`); the
return falls due at the same hour, that many days later, and is never asked for. `end_date` is kept
in step with the due date so the day-level views and `rentalQuote` keep working unchanged.

The Worker charges this, never a total sent by the client. A store that offers no pick-up times --
no `booking.handoff.weekly` and no `booking.timeSlots` -- takes no `start_time` and is rejected if
sent one, and its bookings stay on whole calendar days. `booking.timeSlots` remains as the earlier
fixed-window form for stores still configured that way; a store with handoff hours uses those and
its own `slotMinutes` grid instead.

## Public requests

`POST /api/reservation-requests` from the storefront always creates `status = pending`, `source = public`, with `request_product_id` / `request_size` and **no items**. Nothing is held until staff confirm. The Worker validates:

- the product exists and is `inventory.managed`; the size is one of the product's sizes;
- dates are real calendar days, `start <= end`, not in the past, within `booking.maxDaysAhead`, no longer than `booking.maxRentalDays`;
- name and phone are present and plausible; `preferred_contact_channel` is one of `zalo / whatsapp / messenger / phone` (Zalo and WhatsApp numbers default to the main phone);
- `privacy_consent === true` (the server records the time);
- Turnstile token when Turnstile is configured; per-IP throttle (3 per 10 minutes, 10 per day, hashed IPs);
- stock is still free for the dates and size (`409 unavailable` otherwise).

The same phone + product + dates sent twice returns the first request (`duplicate: true`) rather than creating another.

## Confirming

`POST /api/admin/reservations/:id/confirm` moves a `pending` booking to `confirmed`. For a request without items it picks a free item of the requested product for the dates, preferring the requested size, and answers `409 inventory_unavailable` (with `otherSizes`) when none is free. Staff can also pick an item by hand in the booking form and save.

## Availability answers

- `GET /api/availability[?from&to]` – every product: `{total, available, status, managed}`.
- `GET /api/products/:id/availability[?from&to][&size]` – one product, optionally per size.

`status` is `available`, `low` (several items, one left), `rented` (all taken for the period) or `unavailable` (no bookable items). Without dates the answer is for today in the store's time zone, and items physically out (`reserved`, `rented`) count as taken.

## Customer notification

Confirmation messages in vi / en / ja / zh are generated by `core/notifications/messages.mjs` from the booking, the catalog and the store name. Staff send them by hand (WhatsApp link with prefilled text, Messenger link, Zalo copy, phone) and press **customer notified**, which stores `notification_status / channel / sent_at / note`. No external messaging API is involved.

## Web Push

When VAPID keys are configured, every new public request is pushed to the admin devices subscribed on the settings page (`/admin/#/settings`). Delivery runs after the customer's response through `ctx.waitUntil()`; a failed push never fails the request. Subscriptions whose endpoint answers 404/410 are removed automatically.

With `admin.digest` set (see [configuration.md](configuration.md)), the same devices also get a
scheduled summary: the day's pick-ups, returns and overdue rentals in the morning, and tomorrow's in
the evening. It is sent by the Worker's `scheduled()` handler (`worker/digest.mjs`) from a Cron
Trigger every 30 minutes.


## What a rental costs

The first 24 hours are charged at the product’s daily rate (`price.rental`). Every further day may
be charged less, per product:

```yaml
price:
  rental: 119000
  additionalDay: 30000   # every day after the first
```

`rentalPrice` in `core/booking/pricing.mjs` is the one place this is worked out:
`total = rental + additionalDay x (days - 1)`. A product that names no `additionalDay` is charged its
daily rate throughout, which is what every rental did before this existed. A value above the daily
rate would be a surcharge rather than a discount, so the catalog warns and ignores it; zero is a real
offer and is kept.

The Worker quotes and charges this; a total sent by the page is never trusted. The page works the
same sum out only so a number is on screen before the Worker answers, and shows it as two parts
(the first day, then the cheaper ones) whenever the rates differ.

## The rental interval

A booking occupies `[start_at, ready_at)`:

```
start_at = start_date + start_time
due_at   = start_at + rental_days x 24h      (same clock time, that many days on)
ready_at = turnaround(returned_at or due_at)
```

Two bookings clash when `existing.start < requested.ready AND existing.ready > requested.start`.
`booking.bufferDays` widens only the interval being asked for, so the gap between two rentals is the
buffer and not twice it. Rows written before migration `0011` carry no moments and are read as the
whole calendar days they always blocked, which makes the old rule a special case of this one.

Marking a rental `returned` writes `returned_at` (store-local time), and `ready_at` is then worked
out from the actual return. Until then the item is back but not ready: the overlap rule counts a
`returned` timed rental up to its `ready_at`, so the care window cannot be booked, and the inventory
overview does not offer the item as available today. A whole-day booking from before migration 0011
has no `ready_at` and frees its item on return, as it always did.

A rental that is still out after its planned `ready_at` cannot be promised to anybody. Until it's back,
it holds its item until the store's turnaround applied to the present moment (`holdUntil` in
`worker/db.mjs`). With `overnight`, that means the next morning while it is before the cutoff, and the
morning after once it is later. The overlap rule, the public calendar, the public time axis and the
admin form all use it. Once the rental is marked `returned`, its real care window takes over.


`booking.turnaround.strategy` is `none` (free at once), `hours` (`hours` real hours) or `overnight`
(back by `returnCutoff` and it is ready at `readyNextDayAt` the next morning; later than that and the
wash waits for the following night).

## Handoff hours

`booking.handoff.weekly` lists, per weekday, the intervals somebody is at the shop. A store that
omits this configuration is taken as unrestricted; explicitly empty weekday windows are unavailable.
`handoff_exceptions` holds single dates that differ -- a day off, longer hours -- set from the admin
(`PUT/DELETE /api/admin/handoff-exceptions/:date`) so they need no rebuild. A row wins over the week.

`GET /api/products/:id/timeline?date=&days=&size=` returns that day's axis at `booking.slotMinutes`
granularity: one entry per time in the display range, including unavailable intervals, with a state
(`available`, `low`, `none`, `handoff`, `maintenance`, `closed`, `past`) and how many items are left.
Counts leave the Worker; item ids never do. Availability covers the entire requested rental and its
turnaround window, using the same physical item throughout.
`GET /api/admin/inventory/schedule` is the same data for staff, per product and size.

Staff read the same data at `#/inventory/schedule` (what each garment is doing, on a date axis) and
set the days that differ at `#/inventory/handoff`. The booking list is unchanged.

## Availability Timeline display

```yaml
booking:
  displayStart: "06:00"
  displayEnd: "22:00" # Exclusive; 24:00 is also supported
  slotMinutes: 30
  openingHours:
    mon: [{start: "07:00", end: "21:00"}]
  handoff:
    weekly:
      mon: [{start: "07:00", end: "08:30"}, {start: "18:30", end: "21:00"}]
```

Display bounds do not limit the rental's duration: the due time and care period can cross days.
`openingHours` uses the same weekday keys as handoff; omitted configuration is unrestricted,
while explicitly empty weekday windows mean closed. Configure all operating weekdays. A date-specific
handoff override replaces the regular windows and permits its stated hours, including extended hours;
a closed override prevents all handoffs on that date.

The main picker shows four six-hour periods (overnight, morning, afternoon, evening). Each has a
compact overview of the day and a three-column grid of times for the selected period. Switching
periods never clears the chosen time. The rental length is asked before the time, because it changes
availability. The picker opens on the period that holds the selected or first available time. No
horizontal swipe is needed to pick a time. A collapsed details section keeps the continuous axis, with
52 × 60 px targets and hourly labels, and scrolls to the selected or first available time when opened.
Symbols, patterns, a legend and accessible names distinguish states. Unavailable buttons use
`aria-disabled` and only reveal their reason; they never change the selection. Reloading availability
clears the actionable selection until the server validates it again.

For 24-hour operation, set `displayStart: "00:00"` and `displayEnd: "24:00"`, and give each operating
weekday opening and handoff windows of `{start: "00:00", end: "24:00"}`. `24:00` is only ever an
exclusive window end, never a pick-up time or a window start. A 30-minute grid offers 00:00 through
23:30. Date exceptions and inventory / turnaround rules still apply: being open all day does not make
an item that is not ready available.

### Public holidays

`booking.handoff.holidayCountry` (for example `VN`, `JP`, `TH`) makes the build list that country's
public holidays as plain dates in `store.json`, using
[date-holidays](https://github.com/commenthol/date-holidays). A holiday that runs several days, such
as Tet, counts every day. Observances are left out. No holiday library ships to the Worker or the
browser. A build covers the current year through the booking horizon plus one more year, and
`holidayCalendarThrough` in `dist/store.json` records how far. Rebuild once a year and keep the
dependency up to date.

On a holiday the handoff hours are `holidayWindows` (all day, 00:00–24:00, unless set; `[]` closes).
`holidayDates` in the configuration adds dates by hand: officially announced extra days the base
calendar does not know, or a store's own list without `holidayCountry`. Substituted working days and
one-off schedules are not inferred. Set them in the admin handoff diary, because a date set there
always wins over holidays and the weekly hours.

`store.text.handoffNotice` (localized) is shown above the booking calendar before a date is chosen.
Use it, for example, to ask customers to get in touch first for a handover outside the listed hours. It
does not bypass any server-side rule.

## Fittings

A fitting is the other errand a customer comes for: arrive at an agreed time, try the garment on,
hand it straight back. It is the same booking — same table, statuses, inventory and handover hours —
with `purpose = 'fitting'` written down, so staff read one diary rather than two.

It differs from a rental in three ways, and in nothing else:

- it holds its item for `booking.fitting.minutes` (plus `bufferMinutes`), not for whole days, so
  `rental_days` stays 0 and `end_date` is the day it happens;
- nothing is charged for it, so `rentalQuote` answers `null`;
- `booking.bufferDays` — free days between rentals — does not apply to an appointment.

`booking.fitting.enabled` decides whether a store takes them at all; the timeline
(`?purpose=fitting`) and the request are both refused when it does not. Everything else still holds:
somebody has to be at the shop, and the garment has to be free and cared for.
