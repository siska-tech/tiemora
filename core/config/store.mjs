// config/store.yaml -> a validated, fully defaulted store configuration.
// Everything that makes one Tiemora deployment *this* store lives here: name, languages, contact
// links, theme colours, category labels and booking limits. No secrets: the whole object is
// published as /store.json and read by the storefront, the admin page and the Worker.
import {SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, cleanLocalized, localized} from '../i18n/localized.mjs';

const HEX = /^#[0-9a-f]{6}$/i;
const isMap = value => value && typeof value === 'object' && !Array.isArray(value);

export const DEFAULT_THEME = {primary: '#772f36', paper: '#faf7f0', ink: '#302e29', muted: '#79756c', line: '#e3ded3', accent: '#af784a'};

export const DEFAULT_STORE = {
  store: {
    name: 'Tiemora Store',
    tagline: {vi: 'Cửa hàng', en: 'Store', ja: 'ストア', zh: '商店'},
    description: {
      vi: 'Cửa hàng trực tuyến sử dụng Tiemora.',
      en: 'An online store powered by Tiemora.',
      ja: 'Tiemora を使ったオンラインストアです。',
      zh: '由 Tiemora 驱动的在线商店。'
    },
    logo: null,
    hero: {title: null, subtitle: null, image: null},
    announcement: null,
    values: []
  },
  catalog: {dir: 'catalog'},
  languages: ['vi', 'en'],
  defaultLanguage: DEFAULT_LANGUAGE,
  currency: 'VND',
  timezone: 'Asia/Ho_Chi_Minh',
  phoneCountryCode: '84',
  contact: {facebook: null, messenger: null, zalo: null, whatsapp: null, phone: null, email: null, address: null, mapUrl: null},
  categories: {},
  theme: {...DEFAULT_THEME},
  booking: {maxRentalDays: 60, maxDaysAhead: 365, bufferDays: 0},
  admin: {defaultLanguage: 'en'}
};

const text = (value, fallback = null) => (typeof value === 'string' && value.trim() ? value.trim() : fallback);
const optionalUrl = (value, field, warn) => {
  const url = text(value);
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) { warn(`${field}: must start with http:// or https://; ignored.`); return null; }
  return url;
};
const optionalLocalized = (value, field, warn, fallback = null) => {
  if (value == null) return fallback;
  const cleaned = cleanLocalized(value);
  if (cleaned === null || (typeof cleaned === 'object' && !Object.keys(cleaned).length)) { warn(`${field}: must be text or a language mapping; ignored.`); return fallback; }
  return cleaned;
};
const positiveInt = (value, field, fallback, warn, {min = 0} = {}) => {
  if (value == null) return fallback;
  if (!Number.isInteger(value) || value < min) { warn(`${field}: must be an integer >= ${min}; using ${fallback}.`); return fallback; }
  return value;
};

// Returns {config, warnings}. Unknown keys are reported, bad values fall back to defaults, and
// the result always has every key of DEFAULT_STORE so consumers never need optional chaining.
export function normalizeStoreConfig(raw = {}, {warn = console.warn} = {}) {
  const warnings = [];
  const note = message => { warnings.push(message); warn(`[store] ${message}`); };
  if (!isMap(raw)) { note('store.yaml must be a mapping; using defaults.'); raw = {}; }
  for (const key of Object.keys(raw)) if (!(key in DEFAULT_STORE)) note(`Unknown top-level key "${key}" ignored.`);

  const store = isMap(raw.store) ? raw.store : {};
  const hero = isMap(store.hero) ? store.hero : {};
  const config = {
    store: {
      name: text(store.name, DEFAULT_STORE.store.name),
      tagline: optionalLocalized(store.tagline, 'store.tagline', note, DEFAULT_STORE.store.tagline),
      description: optionalLocalized(store.description, 'store.description', note, DEFAULT_STORE.store.description),
      logo: text(store.logo),
      hero: {
        title: optionalLocalized(hero.title, 'store.hero.title', note),
        subtitle: optionalLocalized(hero.subtitle, 'store.hero.subtitle', note),
        image: text(hero.image)
      },
      announcement: optionalLocalized(store.announcement, 'store.announcement', note),
      values: Array.isArray(store.values) ? store.values.map((v, i) => optionalLocalized(v, `store.values[${i}]`, note)).filter(Boolean).slice(0, 3) : []
    },
    catalog: {dir: text(isMap(raw.catalog) ? raw.catalog.dir : null, DEFAULT_STORE.catalog.dir)},
    languages: [],
    defaultLanguage: DEFAULT_LANGUAGE,
    currency: DEFAULT_STORE.currency,
    timezone: DEFAULT_STORE.timezone,
    phoneCountryCode: DEFAULT_STORE.phoneCountryCode,
    contact: {},
    categories: {},
    theme: {...DEFAULT_THEME},
    booking: {...DEFAULT_STORE.booking},
    admin: {...DEFAULT_STORE.admin}
  };

  // Languages: only the ones Tiemora has UI strings for, in the order given, default first in the switcher.
  const requested = Array.isArray(raw.languages) ? raw.languages : DEFAULT_STORE.languages;
  for (const lang of requested) {
    if (SUPPORTED_LANGUAGES.includes(lang)) { if (!config.languages.includes(lang)) config.languages.push(lang); }
    else note(`languages: "${lang}" is not supported (${SUPPORTED_LANGUAGES.join(', ')}); ignored.`);
  }
  if (!config.languages.length) { note(`languages: none valid; using ${DEFAULT_STORE.languages.join(', ')}.`); config.languages = [...DEFAULT_STORE.languages]; }
  if (typeof raw.defaultLanguage === 'string' && config.languages.includes(raw.defaultLanguage)) config.defaultLanguage = raw.defaultLanguage;
  else { if (raw.defaultLanguage != null) note(`defaultLanguage: "${raw.defaultLanguage}" is not in languages; using ${config.languages[0]}.`); config.defaultLanguage = config.languages[0]; }

  if (raw.currency != null) {
    if (typeof raw.currency === 'string' && /^[A-Za-z]{3}$/.test(raw.currency)) config.currency = raw.currency.toUpperCase();
    else note(`currency: must be a 3-letter ISO code; using ${DEFAULT_STORE.currency}.`);
  }
  if (raw.timezone != null) {
    try { new Intl.DateTimeFormat('en', {timeZone: String(raw.timezone)}); config.timezone = String(raw.timezone); }
    catch { note(`timezone: "${raw.timezone}" is not a valid IANA time zone; using ${DEFAULT_STORE.timezone}.`); }
  }
  if (raw.phoneCountryCode != null) {
    const code = String(raw.phoneCountryCode).replace(/^\+/, '');
    if (/^\d{1,3}$/.test(code)) config.phoneCountryCode = code; else note('phoneCountryCode: must be 1-3 digits (e.g. "84"); using 84.');
  }

  const contact = isMap(raw.contact) ? raw.contact : {};
  for (const key of Object.keys(contact)) if (!(key in DEFAULT_STORE.contact)) note(`contact.${key}: unknown key ignored.`);
  config.contact = {
    facebook: optionalUrl(contact.facebook, 'contact.facebook', note),
    messenger: optionalUrl(contact.messenger, 'contact.messenger', note),
    zalo: text(contact.zalo),
    whatsapp: text(contact.whatsapp),
    phone: text(contact.phone),
    email: text(contact.email),
    address: optionalLocalized(contact.address, 'contact.address', note),
    mapUrl: optionalUrl(contact.mapUrl, 'contact.mapUrl', note)
  };

  if (raw.categories != null) {
    if (!isMap(raw.categories)) note('categories: must be a mapping of category id -> label; ignored.');
    else for (const [id, label] of Object.entries(raw.categories)) {
      const cleaned = optionalLocalized(label, `categories.${id}`, note);
      if (cleaned) config.categories[id] = cleaned;
    }
  }

  const theme = isMap(raw.theme) ? raw.theme : {};
  for (const [key, value] of Object.entries(theme)) {
    if (!(key in DEFAULT_THEME)) { note(`theme.${key}: unknown colour ignored (use ${Object.keys(DEFAULT_THEME).join(', ')}).`); continue; }
    if (typeof value === 'string' && HEX.test(value)) config.theme[key] = value.toLowerCase();
    else note(`theme.${key}: must be a 6-digit hex colour; using ${DEFAULT_THEME[key]}.`);
  }

  const booking = isMap(raw.booking) ? raw.booking : {};
  config.booking.maxRentalDays = positiveInt(booking.maxRentalDays, 'booking.maxRentalDays', DEFAULT_STORE.booking.maxRentalDays, note, {min: 1});
  config.booking.maxDaysAhead = positiveInt(booking.maxDaysAhead, 'booking.maxDaysAhead', DEFAULT_STORE.booking.maxDaysAhead, note, {min: 1});
  config.booking.bufferDays = positiveInt(booking.bufferDays, 'booking.bufferDays', DEFAULT_STORE.booking.bufferDays, note);

  const admin = isMap(raw.admin) ? raw.admin : {};
  if (admin.defaultLanguage != null) {
    if (SUPPORTED_LANGUAGES.includes(admin.defaultLanguage)) config.admin.defaultLanguage = admin.defaultLanguage;
    else note(`admin.defaultLanguage: "${admin.defaultLanguage}" is not supported; using ${DEFAULT_STORE.admin.defaultLanguage}.`);
  }
  return {config, warnings};
}

// CSS custom properties for the storefront and admin, written to dist/theme.css by the build.
export function themeCss(config) {
  const t = {...DEFAULT_THEME, ...(config?.theme || {})};
  return `:root{--primary:${t.primary};--paper:${t.paper};--ink:${t.ink};--muted:${t.muted};--line:${t.line};--accent:${t.accent}}\n`;
}

// {{store.name}} / {{store.description}} / {{theme.primary}} placeholders in HTML sources.
// Only a handful of tokens exist on purpose: the pages fetch /store.json for everything else.
export function renderTemplate(html, config, language = config?.defaultLanguage || DEFAULT_LANGUAGE) {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const tokens = {
    'store.name': config?.store?.name || DEFAULT_STORE.store.name,
    'store.description': localized(config?.store?.description, language),
    'store.tagline': localized(config?.store?.tagline, language),
    'theme.primary': (config?.theme || DEFAULT_THEME).primary,
    'theme.paper': (config?.theme || DEFAULT_THEME).paper,
    'lang': language
  };
  return html.replace(/\{\{\s*([a-z.]+)\s*\}\}/gi, (match, key) => key in tokens ? escape(tokens[key]) : match);
}
