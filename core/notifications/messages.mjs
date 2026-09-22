// The confirmation text staff send to a customer, in every supported language, plus the short
// store-facing summary. Pure functions over a reservation, the catalog and the store config.
import {localized, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE} from '../i18n/localized.mjs';
import {normalizePhone} from './phone.mjs';
import {messengerUrl, normalizeMessengerUrl} from './links.mjs';

export const CONTACT_CHANNELS = ['messenger', 'zalo', 'whatsapp', 'phone', 'other'];
export const PUBLIC_CONTACT_CHANNELS = ['zalo', 'whatsapp', 'messenger', 'phone'];
export const NOTIFICATION_CHANNELS = ['whatsapp', 'messenger', 'zalo', 'phone', 'copy', 'other'];
export const NOTIFICATION_STATUSES = ['not_sent', 'sent'];
export const NOTIFICATION_LANGUAGES = SUPPORTED_LANGUAGES;

// Customers see 01/10/2026 (vi/en) or 2026/10/01 (ja/zh); the database keeps 2026-10-01.
export function formatDate(iso, language = DEFAULT_LANGUAGE) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (!match) return String(iso ?? '');
  const [, y, m, d] = match;
  return language === 'ja' || language === 'zh' ? `${y}/${m}/${d}` : `${d}/${m}/${y}`;
}
function productOf(products, id) {
  if (!products) return null;
  if (products instanceof Map) return products.get(id) || null;
  if (Array.isArray(products)) return products.find(p => p && p.id === id) || null;
  return products[id] || null;
}
// One entry per item: localized product name, size (from the inventory item) and category.
export function describeItems(reservation, products, language = DEFAULT_LANGUAGE) {
  return (reservation?.items || []).map(item => {
    const product = productOf(products, item.product_id);
    return {name: localized(product?.name, language) || item.product_id, size: String(item.size ?? '').trim(), category: product?.category || ''};
  });
}

const TEMPLATES = {
  vi: {
    greeting: name => `Xin chào ${name} 🌸`,
    confirmed: store => `Đặt chỗ của bạn tại ${store} đã được xác nhận.`,
    item: 'Sản phẩm', size: 'Size', start: 'Ngày nhận', end: 'Ngày trả', id: 'Mã đặt chỗ',
    closing: store => ['Nếu cần thay đổi lịch, bạn nhắn lại cho chúng tôi nhé.', `Cảm ơn bạn đã lựa chọn ${store}!`]
  },
  ja: {
    greeting: name => `${name} 様 🌸`,
    confirmed: store => `${store} でのご予約が確定しました。`,
    item: '商品', size: 'サイズ', start: '受取日', end: '返却日', id: '予約番号',
    closing: store => ['ご予定の変更がある場合は、このメッセージにご返信ください。', `${store} をお選びいただきありがとうございます。`]
  },
  en: {
    greeting: name => `Hello ${name} 🌸`,
    confirmed: store => `Your booking at ${store} is confirmed.`,
    item: 'Item', size: 'Size', start: 'Pick-up date', end: 'Return date', id: 'Booking ID',
    closing: store => ['If you need to change the dates, just reply to this message.', `Thank you for choosing ${store}!`]
  },
  zh: {
    greeting: name => `${name} 您好 🌸`,
    confirmed: store => `您在 ${store} 的预约已确认。`,
    item: '商品', size: '尺码', start: '取件日期', end: '归还日期', id: '预约编号',
    closing: store => ['如需更改日期，请直接回复此消息。', `感谢您选择 ${store}！`]
  }
};
// `products` is the catalog (array, Map or object by id); `store` is the store config
// (only store.name is used); `note` is an optional extra paragraph (opening hours, deposit, ...).
/** @param {any} reservation @param {any} products @param {string} [language] @param {{note?: string, store?: any}} [options] */
export function buildReservationConfirmationMessage(reservation, products, language = DEFAULT_LANGUAGE, {note = '', store} = {}) {
  const lang = NOTIFICATION_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
  const t = TEMPLATES[lang];
  const storeName = store?.store?.name || store?.name || 'the store';
  const items = describeItems(reservation, products, lang);
  const name = String(reservation?.customer_name ?? '').trim();
  const lines = [t.greeting(name), '', t.confirmed(storeName), ''];
  if (items.length === 1) {
    lines.push(`${t.item}: ${items[0].name}`);
    if (items[0].size) lines.push(`${t.size}: ${items[0].size}`);
  } else if (items.length) {
    lines.push(`${t.item}:`, ...items.map(i => `- ${i.name}${i.size ? ` (${i.size})` : ''}`));
  }
  lines.push(`${t.start}: ${formatDate(reservation?.start_date, lang)}`, `${t.end}: ${formatDate(reservation?.end_date, lang)}`, `${t.id}: ${reservation?.id ?? ''}`);
  const extra = String(note ?? '').trim();
  if (extra) lines.push('', extra);
  lines.push('', ...t.closing(storeName));
  return lines.join('\n');
}
export function buildReservationMessages(reservation, products, options) {
  return Object.fromEntries(NOTIFICATION_LANGUAGES.map(lang => [lang, buildReservationConfirmationMessage(reservation, products, lang, options)]));
}
// Short store-facing block: id, customer, phone, items, dates. Pasted into staff chats or notes.
export function buildReservationSummary(reservation, products, language = DEFAULT_LANGUAGE) {
  const items = describeItems(reservation, products, language);
  const lines = [reservation?.id ?? '', reservation?.customer_name ?? ''];
  const phone = String(reservation?.customer_phone ?? '').trim();
  if (phone) lines.push(phone);
  lines.push(...items.map(i => `${i.name}${i.size ? ` · Size ${i.size}` : ''}`));
  lines.push(`${formatDate(reservation?.start_date, language)} - ${formatDate(reservation?.end_date, language)}`);
  return lines.filter(line => line !== '').join('\n');
}

// Everything the admin detail page needs for its buttons, computed once per reservation.
// WhatsApp and Zalo fall back to the plain phone number when no separate number was saved.
export function buildNotification(reservation, products, store = {}) {
  const countryCode = store.phoneCountryCode || '84';
  const phone = String(reservation?.customer_phone ?? '').trim();
  const whatsapp = String(reservation?.customer_whatsapp ?? '').trim() || phone;
  const zalo = String(reservation?.customer_zalo_phone ?? '').trim() || phone;
  const defaultLanguage = store.defaultLanguage || DEFAULT_LANGUAGE;
  return {
    languages: NOTIFICATION_LANGUAGES,
    defaultLanguage,
    messages: buildReservationMessages(reservation, products, {store}),
    summary: buildReservationSummary(reservation, products, defaultLanguage),
    preferred: CONTACT_CHANNELS.includes(reservation?.preferred_contact_channel) ? reservation.preferred_contact_channel : '',
    phone,
    whatsapp: {phone: whatsapp, number: normalizePhone(whatsapp, countryCode)},
    messenger: {url: messengerUrl(reservation, store.contact?.messenger || ''), own: Boolean(normalizeMessengerUrl(reservation?.customer_messenger_url))},
    zalo: {phone: zalo, number: normalizePhone(zalo, countryCode)}
  };
}
