-- Customer contact preferences and the "did we tell the customer?" record for each booking.
-- Nothing here talks to an external service: staff send the message themselves (WhatsApp click-to-chat,
-- Messenger, Zalo, copy & paste) and then mark the booking as notified in /admin/.
-- customer_phone already exists (0001); it doubles as the WhatsApp / Zalo number when those are empty.

-- How the customer prefers to be contacted: messenger / zalo / whatsapp / phone / other ('' = not asked).
ALTER TABLE reservations ADD COLUMN preferred_contact_channel TEXT NOT NULL DEFAULT ''
  CHECK (preferred_contact_channel IN ('', 'messenger', 'zalo', 'whatsapp', 'phone', 'other'));
ALTER TABLE reservations ADD COLUMN customer_whatsapp      TEXT NOT NULL DEFAULT '';
ALTER TABLE reservations ADD COLUMN customer_messenger_url TEXT NOT NULL DEFAULT '';
ALTER TABLE reservations ADD COLUMN customer_zalo_phone    TEXT NOT NULL DEFAULT '';

-- Set by staff after they sent the confirmation; never verified against the external channel.
ALTER TABLE reservations ADD COLUMN notification_status  TEXT NOT NULL DEFAULT 'not_sent'
  CHECK (notification_status IN ('not_sent', 'sent'));
ALTER TABLE reservations ADD COLUMN notification_channel TEXT NOT NULL DEFAULT ''
  CHECK (notification_channel IN ('', 'whatsapp', 'messenger', 'zalo', 'phone', 'copy', 'other'));
ALTER TABLE reservations ADD COLUMN notification_sent_at TEXT NOT NULL DEFAULT '';
ALTER TABLE reservations ADD COLUMN notification_note    TEXT NOT NULL DEFAULT '';

-- "Confirmed bookings the customer has not heard about yet" is read on every admin page load.
CREATE INDEX idx_reservations_notification ON reservations (notification_status, status);
