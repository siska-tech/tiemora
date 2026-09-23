// Pure-function tests for core/notifications: message templates, phone normalisation, links.
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePhone, displayPhone, whatsappUrl, normalizeMessengerUrl, messengerUrl, formatDate, buildReservationConfirmationMessage, buildReservationSummary, buildNotification} from '../../core/notifications/index.mjs';

const catalog = new Map([
  ['sample-rental-001', {id: 'sample-rental-001', name: {vi: 'Trang phục truyền thống mẫu', ja: '伝統衣装サンプル', en: 'Sample Traditional Outfit'}, category: 'rental'}],
  ['sample-rental-002', {id: 'sample-rental-002', name: {vi: 'Lễ phục mẫu'}, category: 'rental'}]
]);
const store = {store: {name: 'Test Store'}, defaultLanguage: 'vi', languages: ['vi', 'en'], phoneCountryCode: '84', contact: {messenger: 'https://m.me/teststore'}};
const reservation = {
  id: 'rsv-20261001-ab12', customer_name: 'Nguyễn Mai', customer_phone: '0901234567', start_date: '2026-10-01', end_date: '2026-10-03',
  items: [{inventory_item_id: 'sample-rental-001-01', product_id: 'sample-rental-001', size: 'L'}]
};

test('local numbers get the store country code; other numbers keep their own', () => {
  for (const input of ['0901234567', '+84901234567', '84901234567', '+84 90 123 4567', '(090) 123-4567', '0084901234567']) assert.equal(normalizePhone(input), '84901234567', input);
  assert.equal(normalizePhone('+81 90 1234 5678'), '819012345678');
  assert.equal(normalizePhone('090 1234 5678', '81'), '819012345678');
  assert.equal(normalizePhone('123'), '');
  assert.equal(normalizePhone(''), '');
  assert.equal(displayPhone('84901234567'), '090 123 4567');
  assert.equal(displayPhone('+81 90 1234 5678'), '+81 90 1234 5678');
});

test('WhatsApp click-to-chat carries the number and the URL-encoded text', () => {
  const url = whatsappUrl('0901234567', 'Xin chào Mai 🌸\nHẹn gặp!');
  assert.equal(url, 'https://wa.me/84901234567?text=Xin%20ch%C3%A0o%20Mai%20%F0%9F%8C%B8%0AH%E1%BA%B9n%20g%E1%BA%B7p!');
  assert.equal(whatsappUrl('abc', 'x'), '');
});

test('Messenger links: only web addresses are accepted, the store page is the fallback', () => {
  assert.equal(normalizeMessengerUrl(''), '');
  assert.equal(normalizeMessengerUrl('m.me/linh.nguyen'), 'https://m.me/linh.nguyen');
  assert.equal(normalizeMessengerUrl('https://www.facebook.com/linh'), 'https://www.facebook.com/linh');
  assert.equal(normalizeMessengerUrl('javascript:alert(1)'), null);
  assert.equal(normalizeMessengerUrl('not a url'), null);
  assert.equal(normalizeMessengerUrl('linh'), null);
  assert.equal(messengerUrl({customer_messenger_url: 'm.me/linh'}, 'https://m.me/teststore'), 'https://m.me/linh');
  assert.equal(messengerUrl({customer_messenger_url: ''}, 'https://m.me/teststore'), 'https://m.me/teststore');
  assert.equal(messengerUrl({customer_messenger_url: 'http://m.me/linh'}, 'https://m.me/teststore'), 'https://m.me/teststore');
  assert.equal(messengerUrl({customer_messenger_url: ''}), '');
});

test('customers see dd/mm/yyyy (or yyyy/mm/dd for ja/zh) while the database keeps ISO', () => {
  assert.equal(formatDate('2026-10-01'), '01/10/2026');
  assert.equal(formatDate('2026-10-01', 'en'), '01/10/2026');
  assert.equal(formatDate('2026-10-01', 'ja'), '2026/10/01');
  assert.equal(formatDate('bad'), 'bad');
});

test('the confirmation message uses the store name from the configuration', () => {
  assert.equal(buildReservationConfirmationMessage(reservation, catalog, 'vi', {store}), [
    'Xin chào Nguyễn Mai 🌸', '',
    'Đặt chỗ của bạn tại Test Store đã được xác nhận.', '',
    'Sản phẩm: Trang phục truyền thống mẫu', 'Size: L', 'Ngày nhận: 01/10/2026', 'Ngày trả: 03/10/2026', 'Mã đặt chỗ: rsv-20261001-ab12', '',
    'Nếu cần thay đổi lịch, bạn nhắn lại cho chúng tôi nhé.', 'Cảm ơn bạn đã lựa chọn Test Store!'
  ].join('\n'));
  assert.match(buildReservationConfirmationMessage(reservation, catalog, 'en'), /booking at the store is confirmed/);
});

test('the store\'s rental terms are written into the confirmation, as a list in the customer language', () => {
  const withTerms = {...store, booking: {policy: {vi: 'Đặt cọc hoặc giấy tờ.\nTrả trễ trừ vào cọc.', ja: '保証金または身分証明書をお預かりします。\n\n破損時は賠償いただきます。'}}};
  const ja = buildReservationConfirmationMessage(reservation, catalog, 'ja', {store: withTerms}).split('\n');
  const at = ja.indexOf('レンタル規約:');
  assert.ok(at > 0);
  assert.deepEqual(ja.slice(at, at + 3), ['レンタル規約:', '- 保証金または身分証明書をお預かりします。', '- 破損時は賠償いただきます。']);
  assert.ok(ja.indexOf('予約番号: rsv-20261001-ab12') < at, 'after the booking details, before the closing');
  // A language with no terms of its own falls back like every other localized store text.
  assert.match(buildReservationConfirmationMessage(reservation, catalog, 'en', {store: withTerms}), /Rental terms:\n- /);
  assert.doesNotMatch(buildReservationConfirmationMessage(reservation, catalog, 'vi', {store}), /Điều khoản thuê/);
});

test('several items become a list; other languages translate labels and names', () => {
  const multi = {...reservation, items: [...reservation.items, {inventory_item_id: 'sample-rental-002-01', product_id: 'sample-rental-002', size: 'M'}]};
  const vi = buildReservationConfirmationMessage(multi, catalog, 'vi', {store});
  assert.match(vi, /Sản phẩm:\n- Trang phục truyền thống mẫu \(L\)\n- Lễ phục mẫu \(M\)\n/);
  const ja = buildReservationConfirmationMessage(reservation, catalog, 'ja', {store});
  assert.match(ja, /^Nguyễn Mai 様 🌸\n/);
  assert.match(ja, /商品: 伝統衣装サンプル\nサイズ: L\n受取日: 2026\/10\/01\n返却日: 2026\/10\/03\n予約番号: rsv-20261001-ab12/);
  assert.match(buildReservationConfirmationMessage(reservation, catalog, 'en', {store}), /Item: Sample Traditional Outfit\nSize: L\nPick-up date: 01\/10\/2026/);
  assert.match(buildReservationConfirmationMessage(reservation, catalog, 'zh', {store}), /取件日期: 2026\/10\/01/);
  // Unknown language falls back to Vietnamese; an unknown product keeps its id.
  assert.match(buildReservationConfirmationMessage({...reservation, items: [{product_id: 'xx-1', size: ''}]}, catalog, 'fr', {store}), /Sản phẩm: xx-1\nNgày nhận/);
  assert.match(buildReservationConfirmationMessage(reservation, catalog, 'vi', {store, note: 'Mang theo CCCD nhé.'}), /rsv-20261001-ab12\n\nMang theo CCCD nhé.\n\nNếu/);
});

test('the staff summary and the detail payload', () => {
  assert.equal(buildReservationSummary(reservation, catalog), 'rsv-20261001-ab12\nNguyễn Mai\n0901234567\nTrang phục truyền thống mẫu · Size L\n01/10/2026 - 03/10/2026');
  const n = buildNotification({...reservation, preferred_contact_channel: 'zalo', customer_whatsapp: '', customer_zalo_phone: '0912 000 111', customer_messenger_url: 'm.me/mai'}, catalog, store);
  assert.deepEqual(Object.keys(n.messages), ['vi', 'en', 'ja', 'zh']);
  assert.equal(n.defaultLanguage, 'vi');
  assert.equal(n.preferred, 'zalo');
  assert.deepEqual(n.whatsapp, {phone: '0901234567', number: '84901234567'});
  assert.deepEqual(n.zalo, {phone: '0912 000 111', number: '84912000111'});
  assert.deepEqual(n.messenger, {url: 'https://m.me/mai', own: true});
  // Without a customer link the store's Messenger page is offered; without either there is no link.
  assert.equal(buildNotification(reservation, catalog, store).messenger.url, 'https://m.me/teststore');
  assert.equal(buildNotification(reservation, catalog, {}).messenger.url, '');
});
