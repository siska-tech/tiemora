// Phone numbers as customers type them -> the digits-only international form chat links need.
// The store's country code (config phoneCountryCode, e.g. 84 for Vietnam) replaces a leading 0;
// numbers that already carry another country code are kept as they are.
export function normalizePhone(raw, countryCode = '84') {
  let digits = String(raw ?? '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);
  digits = digits.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = String(countryCode) + digits.replace(/^0+/, '');
  return digits.length >= 8 && digits.length <= 15 ? digits : '';
}
// Local display form for a national number: 84901234567 -> 090 123 4567. Others are shown as typed.
export function displayPhone(raw, countryCode = '84') {
  const text = String(raw ?? '').trim();
  const digits = normalizePhone(text, countryCode);
  const code = String(countryCode);
  if (!digits.startsWith(code) || digits.length !== code.length + 9) return text;
  const local = '0' + digits.slice(code.length);
  return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}
export const PHONE_PATTERN = /^\+?[\d\s().-]{6,40}$/;
