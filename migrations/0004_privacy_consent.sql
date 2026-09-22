-- Privacy-policy consent given on the public booking form (/privacy). The contact columns
-- (preferred_contact_channel, customer_zalo_phone, customer_whatsapp, customer_messenger_url)
-- already exist from 0002, so only the consent itself is new. Bookings staff enter by hand keep 0.
ALTER TABLE reservations ADD COLUMN privacy_consent    INTEGER NOT NULL DEFAULT 0 CHECK (privacy_consent IN (0, 1));
ALTER TABLE reservations ADD COLUMN privacy_consent_at TEXT    NOT NULL DEFAULT '';
