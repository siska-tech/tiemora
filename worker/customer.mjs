// Customer contact validation shared by rental bookings (api.mjs) and sale orders (orders.mjs):
// phone numbers and the preferred-channel fields (Zalo / WhatsApp / Messenger).
import {badRequest, optionalText, requireEnum} from './util.mjs';
import {CONTACT_CHANNELS, PHONE_PATTERN, normalizeMessengerUrl} from '../core/notifications/index.mjs';

export const PHONE = PHONE_PATTERN;
export function optionalPhone(value, field) {
  const text = optionalText(value, field, 40);
  if (text && !PHONE.test(text)) throw badRequest(`${field} must be a phone number.`, {[field]: 'invalid'});
  return text;
}
// Contact preferences shared by the admin forms and the public request forms.
export function contactFields(body, data, has) {
  if (has('preferred_contact_channel')) data.preferred_contact_channel = requireEnum(body.preferred_contact_channel || null, 'preferred_contact_channel', CONTACT_CHANNELS, '');
  if (has('customer_whatsapp')) data.customer_whatsapp = optionalPhone(body.customer_whatsapp, 'customer_whatsapp');
  if (has('customer_zalo_phone')) data.customer_zalo_phone = optionalPhone(body.customer_zalo_phone, 'customer_zalo_phone');
  if (has('customer_messenger_url')) {
    const url = normalizeMessengerUrl(optionalText(body.customer_messenger_url, 'customer_messenger_url', 300));
    if (url === null) throw badRequest('customer_messenger_url must be a web address such as https://m.me/....', {customer_messenger_url: 'invalid'});
    data.customer_messenger_url = url;
  }
  return data;
}
