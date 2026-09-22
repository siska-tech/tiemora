-- Web Push subscriptions of admin devices (phones / laptops that opened /admin/ and allowed
-- notifications). The Worker sends a VAPID-signed push to every row when a new reservation request
-- arrives. Rows hold only what the browser's PushSubscription.toJSON() returns plus bookkeeping;
-- a subscription whose endpoint answers 404/410 is deleted on the next send.
CREATE TABLE push_subscriptions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  label       TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_sent_at TEXT NOT NULL DEFAULT '',
  failures    INTEGER NOT NULL DEFAULT 0
);
