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
    // mark: a square symbol shown next to the store name; wordmark: the logo already contains the name.
    logoStyle: 'mark',
    hero: {eyebrow: null, title: null, subtitle: null, image: null, fit: 'pan', focus: null},
    announcement: null,
    values: [],
    // Overrides for the storefront's built-in UI copy (keys of `copy` in storefront/app.js), so a
    // florist can say "Đặt hoa" where a rental shop says "Đặt chỗ" without touching the code.
    text: {}
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
  // Sale / pre-order products (type: sale): how orders are fulfilled and what limits apply.
  // Capacity is counted, not itemised: a time slot holds N orders, a day holds N orders, a product
  // sells N units. Nothing here is a fake limit: leave a value null and no limit is shown or enforced.
  ordering: {
    fulfillment: {pickup: true, delivery: true, deliveryFee: 0, deliveryNote: null},
    // Either an explicit window (from / to, for a campaign) or a rolling one (minLeadDays / maxDaysAhead).
    dates: {from: null, to: null, minLeadDays: 1, maxDaysAhead: 14},
    deadline: null,
    dailyCapacity: null,
    timeSlots: [],
    options: {},
    addons: {},
    messageCard: {enabled: true, maxLength: 200, placeholder: null, templates: []}
  },
  admin: {defaultLanguage: 'en'}
};
export const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const SLOT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
      logoStyle: store.logoStyle == null || store.logoStyle === 'mark' ? 'mark' : store.logoStyle === 'wordmark' ? 'wordmark' : (note('store.logoStyle: must be mark or wordmark; using mark.'), 'mark'),
      hero: {
        eyebrow: optionalLocalized(hero.eyebrow, 'store.hero.eyebrow', note),
        title: optionalLocalized(hero.title, 'store.hero.title', note),
        subtitle: optionalLocalized(hero.subtitle, 'store.hero.subtitle', note),
        image: text(hero.image),
        // pan: a tall crop that slides sideways on scroll (the default); cover: fills the frame.
        fit: hero.fit == null || hero.fit === 'pan' ? 'pan' : hero.fit === 'cover' ? 'cover' : (note('store.hero.fit: must be pan or cover; using pan.'), 'pan'),
        // CSS object-position for the cover fit, e.g. "70% 50%".
        focus: hero.focus == null ? null : /^\d{1,3}% \d{1,3}%$/.test(String(hero.focus)) ? String(hero.focus) : (note('store.hero.focus: must be "X% Y%"; ignored.'), null)
      },
      announcement: optionalLocalized(store.announcement, 'store.announcement', note),
      values: Array.isArray(store.values) ? store.values.map((v, i) => optionalLocalized(v, `store.values[${i}]`, note)).filter(Boolean).slice(0, 3) : [],
      text: {}
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
    ordering: structuredClone(DEFAULT_STORE.ordering),
    admin: {...DEFAULT_STORE.admin}
  };
  if (store.text != null) {
    if (!isMap(store.text)) note('store.text: must be a mapping of copy key -> text; ignored.');
    else for (const [key, value] of Object.entries(store.text)) {
      if (!/^[a-zA-Z0-9]+$/.test(key)) { note(`store.text.${key}: invalid key ignored.`); continue; }
      const cleaned = optionalLocalized(value, `store.text.${key}`, note);
      if (cleaned) config.store.text[key] = cleaned;
    }
  }

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

  normalizeOrdering(raw.ordering, config.ordering, note);

  const admin = isMap(raw.admin) ? raw.admin : {};
  if (admin.defaultLanguage != null) {
    if (SUPPORTED_LANGUAGES.includes(admin.defaultLanguage)) config.admin.defaultLanguage = admin.defaultLanguage;
    else note(`admin.defaultLanguage: "${admin.defaultLanguage}" is not supported; using ${DEFAULT_STORE.admin.defaultLanguage}.`);
  }
  return {config, warnings};
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const nullableInt = (value, field, note, {min = 0} = {}) => {
  if (value == null) return null;
  if (!Number.isInteger(value) || value < min) { note(`${field}: must be an integer >= ${min}; ignored.`); return null; }
  return value;
};
// Option groups and add-ons: {id: {label, price}} maps. The id is what product.yaml refers to.
function normalizeChoices(raw, field, note, {withPrice = true} = {}) {
  const out = {};
  if (raw == null) return out;
  if (!isMap(raw)) { note(`${field}: must be a mapping of id -> {label, price}; ignored.`); return out; }
  for (const [id, value] of Object.entries(raw)) {
    if (!SLOT_ID.test(id)) { note(`${field}.${id}: invalid id ignored.`); continue; }
    const entry = isMap(value) ? value : {label: value};
    const label = optionalLocalized(entry.label, `${field}.${id}.label`, note) || id;
    const choice = {label};
    if (withPrice) {
      if (entry.price == null) choice.price = 0;
      else if (typeof entry.price === 'number' && Number.isFinite(entry.price)) choice.price = entry.price;
      else { note(`${field}.${id}.price: must be a number; using 0.`); choice.price = 0; }
    }
    out[id] = choice;
  }
  return out;
}
// ordering: fulfillment, dates, deadline, capacity, time slots, option labels, add-ons, message card.
function normalizeOrdering(raw, config, note) {
  if (raw == null) return;
  if (!isMap(raw)) { note('ordering: must be a mapping; using defaults.'); return; }
  for (const key of Object.keys(raw)) if (!(key in DEFAULT_STORE.ordering)) note(`ordering.${key}: unknown key ignored.`);
  const f = isMap(raw.fulfillment) ? raw.fulfillment : {};
  if (raw.fulfillment != null && !isMap(raw.fulfillment)) note('ordering.fulfillment: must be a mapping; using defaults.');
  config.fulfillment.pickup = f.pickup !== false;
  config.fulfillment.delivery = f.delivery !== false;
  if (!config.fulfillment.pickup && !config.fulfillment.delivery) { note('ordering.fulfillment: pickup and delivery cannot both be off; enabling pickup.'); config.fulfillment.pickup = true; }
  config.fulfillment.deliveryFee = positiveInt(f.deliveryFee, 'ordering.fulfillment.deliveryFee', 0, note);
  config.fulfillment.deliveryNote = optionalLocalized(f.deliveryNote, 'ordering.fulfillment.deliveryNote', note);

  const d = isMap(raw.dates) ? raw.dates : {};
  if (raw.dates != null && !isMap(raw.dates)) note('ordering.dates: must be a mapping; using defaults.');
  for (const key of ['from', 'to']) {
    if (d[key] == null) continue;
    const value = d[key] instanceof Date ? d[key].toISOString().slice(0, 10) : String(d[key]);
    if (ISO_DAY.test(value)) config.dates[key] = value; else note(`ordering.dates.${key}: must be YYYY-MM-DD; ignored.`);
  }
  if (config.dates.from && config.dates.to && config.dates.from > config.dates.to) { note('ordering.dates: from is after to; ignoring both.'); config.dates.from = config.dates.to = null; }
  config.dates.minLeadDays = positiveInt(d.minLeadDays, 'ordering.dates.minLeadDays', DEFAULT_STORE.ordering.dates.minLeadDays, note);
  config.dates.maxDaysAhead = positiveInt(d.maxDaysAhead, 'ordering.dates.maxDaysAhead', DEFAULT_STORE.ordering.dates.maxDaysAhead, note, {min: 1});

  if (raw.deadline != null) {
    const value = raw.deadline instanceof Date ? raw.deadline.toISOString() : String(raw.deadline);
    if (Number.isNaN(Date.parse(value))) note('ordering.deadline: must be an ISO date-time (e.g. 2026-10-19T20:00:00+07:00); ignored.');
    else config.deadline = value;
  }
  config.dailyCapacity = nullableInt(raw.dailyCapacity, 'ordering.dailyCapacity', note, {min: 1});

  if (raw.timeSlots != null) {
    if (!Array.isArray(raw.timeSlots)) note('ordering.timeSlots: must be a list; ignored.');
    else {
      const seen = new Set();
      raw.timeSlots.forEach((slot, i) => {
        const where = `ordering.timeSlots[${i}]`;
        if (!isMap(slot)) { note(`${where}: must be a mapping; ignored.`); return; }
        const start = String(slot.start ?? ''), end = String(slot.end ?? '');
        if (!TIME.test(start) || !TIME.test(end) || start >= end) { note(`${where}: start / end must be HH:MM with start before end; ignored.`); return; }
        const id = typeof slot.id === 'string' && SLOT_ID.test(slot.id) ? slot.id : start.replace(':', '') + '-' + end.replace(':', '');
        if (seen.has(id)) { note(`${where}: duplicate id "${id}" ignored.`); return; }
        seen.add(id);
        config.timeSlots.push({id, start, end, capacity: nullableInt(slot.capacity, `${where}.capacity`, note, {min: 1}), label: optionalLocalized(slot.label, `${where}.label`, note)});
      });
    }
  }
  if (raw.options != null) {
    if (!isMap(raw.options)) note('ordering.options: must be a mapping of group -> {label, choices}; ignored.');
    else for (const [group, value] of Object.entries(raw.options)) {
      if (!SLOT_ID.test(group)) { note(`ordering.options.${group}: invalid group id ignored.`); continue; }
      const entry = isMap(value) ? value : {};
      if (!isMap(value)) note(`ordering.options.${group}: must be a mapping; using the id as label.`);
      config.options[group] = {label: optionalLocalized(entry.label, `ordering.options.${group}.label`, note) || group, choices: normalizeChoices(entry.choices, `ordering.options.${group}.choices`, note)};
    }
  }
  config.addons = normalizeChoices(raw.addons, 'ordering.addons', note);

  const m = isMap(raw.messageCard) ? raw.messageCard : {};
  if (raw.messageCard != null && !isMap(raw.messageCard)) note('ordering.messageCard: must be a mapping; using defaults.');
  config.messageCard.enabled = m.enabled !== false;
  config.messageCard.maxLength = positiveInt(m.maxLength, 'ordering.messageCard.maxLength', DEFAULT_STORE.ordering.messageCard.maxLength, note, {min: 20});
  config.messageCard.placeholder = optionalLocalized(m.placeholder, 'ordering.messageCard.placeholder', note);
  if (m.templates != null) {
    if (!Array.isArray(m.templates)) note('ordering.messageCard.templates: must be a list; ignored.');
    else m.templates.forEach((tpl, i) => {
      const where = `ordering.messageCard.templates[${i}]`;
      if (!isMap(tpl) || typeof tpl.id !== 'string' || !SLOT_ID.test(tpl.id)) { note(`${where}: needs an id (lowercase, digits, hyphens); ignored.`); return; }
      const textValue = optionalLocalized(tpl.text, `${where}.text`, note);
      if (!textValue) { note(`${where}: needs a text; ignored.`); return; }
      config.messageCard.templates.push({id: tpl.id, label: optionalLocalized(tpl.label, `${where}.label`, note) || tpl.id, text: textValue});
    });
  }
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
