// The confirmation text staff send for a sale / pre-order (pickup or delivery), in every supported
// language, plus the short store-facing summary. Mirrors messages.mjs for rental bookings.
import {localized, DEFAULT_LANGUAGE} from '../i18n/localized.mjs';
import {formatDate, NOTIFICATION_LANGUAGES, contactDetails} from './messages.mjs';

const TEMPLATES = {
  vi: {
    greeting: name => `Xin chào ${name}`,
    confirmed: store => `Đơn hoa của bạn tại ${store} đã được xác nhận.`,
    items: 'Sản phẩm', pickup: 'Nhận tại cửa hàng', delivery: 'Giao tận nơi', dine_in: 'Ăn tại quán', recipient: 'Người nhận', address: 'Địa chỉ', card: 'Lời nhắn trên thiệp', total: 'Tổng', id: 'Mã đơn',
    closing: store => ['Nếu cần thay đổi, bạn nhắn lại cho chúng tôi nhé.', `Cảm ơn bạn đã chọn ${store}!`]
  },
  en: {
    greeting: name => `Hello ${name}`,
    confirmed: store => `Your order at ${store} is confirmed.`,
    items: 'Items', pickup: 'Pick-up at the shop', delivery: 'Delivery', dine_in: 'Dine-in', recipient: 'Recipient', address: 'Address', card: 'Card message', total: 'Total', id: 'Order ID',
    closing: store => ['If anything needs to change, just reply to this message.', `Thank you for choosing ${store}!`]
  },
  ja: {
    greeting: name => `${name} 様`,
    confirmed: store => `${store} でのご注文が確定しました。`,
    items: '商品', pickup: '店頭受取', delivery: '配送', dine_in: '店内注文', recipient: 'お届け先', address: '住所', card: 'カードメッセージ', total: '合計', id: '注文番号',
    closing: store => ['ご変更がある場合は、このメッセージにご返信ください。', `${store} をお選びいただきありがとうございます。`]
  },
  zh: {
    greeting: name => `${name} 您好`,
    confirmed: store => `您在 ${store} 的订单已确认。`,
    items: '商品', pickup: '到店自取', delivery: '配送', dine_in: '堂食', recipient: '收件人', address: '地址', card: '卡片留言', total: '合计', id: '订单编号',
    closing: store => ['如需更改，请直接回复此消息。', `感谢您选择 ${store}！`]
  }
};
const LOCALES = {vi: 'vi-VN', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN'};
export function formatMoney(amount, currency = 'VND', language = DEFAULT_LANGUAGE) {
  try { return new Intl.NumberFormat(LOCALES[language] || 'en-US', {style: 'currency', currency, maximumFractionDigits: currency === 'VND' ? 0 : 2}).format(amount); }
  catch { return `${amount} ${currency}`; }
}
function productOf(products, id) {
  if (!products) return null;
  if (products instanceof Map) return products.get(id) || null;
  if (Array.isArray(products)) return products.find(p => p && p.id === id) || null;
  return products[id] || null;
}
const parseJson = (value, fallback) => { if (value && typeof value === 'object') return value; try { return JSON.parse(value) ?? fallback; } catch { return fallback; } };
// One entry per line: localized product name, the chosen option labels, add-on labels and quantity.
export function describeOrderItems(order, products, store, language = DEFAULT_LANGUAGE) {
  const ordering = store?.ordering || {};
  return (order?.items || []).map(item => {
    const product = productOf(products, item.product_id);
    const options = parseJson(item.options, {}), addons = parseJson(item.addons, []);
    const optionLabels = Object.entries(options).map(([group, id]) => localized(ordering.options?.[group]?.choices?.[id]?.label, language) || id);
    const addonLabels = addons.map(id => localized(ordering.addons?.[id]?.label, language) || id);
    return {name: localized(product?.name, language) || item.product_id, options: optionLabels, addons: addonLabels, quantity: item.quantity, line_total: item.line_total};
  });
}
export function slotLabel(store, slotId, language = DEFAULT_LANGUAGE) {
  const slot = (store?.ordering?.timeSlots || []).find(s => s.id === slotId);
  if (!slot) return slotId || '';
  return localized(slot.label, language) || `${slot.start}–${slot.end}`;
}
const itemLine = i => `${i.name}${i.options.length ? ` (${i.options.join(' · ')})` : ''}${i.addons.length ? ` + ${i.addons.join(', ')}` : ''} ×${i.quantity}`;

/** @param {any} order @param {any} products @param {string} [language] @param {{note?: string, store?: any}} [options] */
export function buildOrderConfirmationMessage(order, products, language = DEFAULT_LANGUAGE, {note = '', store} = {}) {
  const lang = NOTIFICATION_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
  const t = TEMPLATES[lang];
  const storeName = store?.store?.name || store?.name || 'the store';
  const items = describeOrderItems(order, products, store, lang);
  const name = String(order?.customer_name ?? '').trim();
  const lines = [t.greeting(name), '', t.confirmed(storeName), ''];
  if (items.length === 1) lines.push(`${t.items}: ${itemLine(items[0])}`);
  else if (items.length) lines.push(`${t.items}:`, ...items.map(i => `- ${itemLine(i)}`));
  const fulfilled = order?.fulfillment_type === 'delivery' ? t.delivery : order?.fulfillment_type === 'dine_in' ? t.dine_in : t.pickup;
  const when = [formatDate(order?.fulfillment_date, lang), slotLabel(store, order?.time_slot, lang)].filter(Boolean).join(', ');
  lines.push(`${fulfilled}: ${when}${order?.fulfillment_type === 'dine_in' && order?.table_number ? ` · Bàn ${order.table_number}` : ''}`);
  if (order?.fulfillment_type === 'delivery') {
    const recipient = [order.recipient_name, order.recipient_phone].filter(Boolean).join(' · ');
    if (recipient) lines.push(`${t.recipient}: ${recipient}`);
    if (order.delivery_address) lines.push(`${t.address}: ${order.delivery_address}`);
  }
  if (order?.message_card) lines.push(`${t.card}: “${order.message_card}”`);
  if (typeof order?.total === 'number') lines.push(`${t.total}: ${formatMoney(order.total, order.currency || store?.currency || 'VND', lang)}`);
  lines.push(`${t.id}: ${order?.id ?? ''}`);
  const extra = String(note ?? '').trim();
  if (extra) lines.push('', extra);
  lines.push('', ...t.closing(storeName));
  return lines.join('\n');
}
export function buildOrderMessages(order, products, options) {
  return Object.fromEntries(NOTIFICATION_LANGUAGES.map(lang => [lang, buildOrderConfirmationMessage(order, products, lang, options)]));
}
// Short store-facing block for staff chats / the production list.
export function buildOrderSummary(order, products, store, language = DEFAULT_LANGUAGE) {
  const items = describeOrderItems(order, products, store, language);
  const lines = [order?.id ?? '', order?.customer_name ?? ''];
  const phone = String(order?.customer_phone ?? '').trim();
  if (phone) lines.push(phone);
  lines.push(...items.map(itemLine));
  const summaryLabel = order?.fulfillment_type === 'delivery' ? 'Delivery' : order?.fulfillment_type === 'dine_in' ? 'Dine-in' : 'Pickup';
  lines.push(`${summaryLabel} · ${formatDate(order?.fulfillment_date, language)}${order?.time_slot ? ' · ' + slotLabel(store, order.time_slot, language) : ''}${order?.fulfillment_type === 'dine_in' && order?.table_number ? ' · Table ' + order.table_number : ''}`);
  if (order?.fulfillment_type === 'delivery' && order.delivery_address) lines.push(order.delivery_address);
  if (order?.message_card) lines.push(`“${order.message_card}”`);
  return lines.filter(line => line !== '').join('\n');
}
// Everything the admin order page needs for its notification panel.
export function buildOrderNotification(order, products, store = {}) {
  const contact = contactDetails(order, store);
  return {...contact, messages: buildOrderMessages(order, products, {store}), summary: buildOrderSummary(order, products, store, contact.defaultLanguage)};
}
