// Click-to-chat links staff open by hand. No API, token or webhook is involved anywhere:
// the link opens the customer's chat with the text prefilled where the service allows it.
import {normalizePhone} from './phone.mjs';

// https://wa.me/<number>?text=<message> opens WhatsApp (app or web) with the chat and text prefilled.
export function whatsappUrl(phone, message = '', countryCode = '84') {
  const number = normalizePhone(phone, countryCode);
  if (!number) return '';
  return `https://wa.me/${number}${message ? '?text=' + encodeURIComponent(message) : ''}`;
}
// A Messenger/Facebook link typed by staff or a customer. Only http(s) URLs are ever stored or
// opened; a bare "m.me/xxx" gets https:// in front. Returns null when the text cannot be a web address.
export function normalizeMessengerUrl(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (/\s/.test(text)) return null;
  const candidate = /^https?:\/\//i.test(text) ? text : 'https://' + text;
  let url;
  try { url = new URL(candidate); } catch { return null; }
  if (!/^https?:$/.test(url.protocol) || !url.hostname.includes('.')) return null;
  return url.href;
}
// Where the Messenger button goes: the customer's own thread when one was saved, else the store's page.
export function messengerUrl(reservation, storeMessengerUrl = '') {
  const own = normalizeMessengerUrl(reservation?.customer_messenger_url);
  return own && own.startsWith('https://') ? own : (storeMessengerUrl || '');
}
