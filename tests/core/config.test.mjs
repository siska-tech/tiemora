// core/config/store.mjs: config/store.yaml normalisation, theme CSS and HTML templating.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parse} from 'yaml';
import {normalizeStoreConfig, themeCss, renderTemplate, DEFAULT_STORE, DEFAULT_THEME} from '../../core/config/store.mjs';

test('timeline display bounds are validated and opening hours remain separate from handoff', () => {
  const {config, warnings} = normalizeStoreConfig({booking: {
    displayStart: '07:00', displayEnd: '24:00', slotMinutes: 15,
    openingHours: {mon: [{start: '07:00', end: '21:00'}]},
    handoff: {weekly: {mon: [{start: '18:30', end: '21:00'}]}}
  }}, {warn: () => {}});
  assert.equal(config.booking.displayEnd, '24:00');
  assert.equal(config.booking.slotMinutes, 15);
  assert.equal(config.booking.openingHours[1][0].start, '07:00');
  assert.equal(config.booking.handoff.weekly[1][0].start, '18:30');
  assert.deepEqual(warnings, []);
  const invalid = normalizeStoreConfig({booking: {displayStart: '22:00', displayEnd: '06:00'}}, {warn: () => {}});
  assert.equal(invalid.config.booking.displayStart, '06:00');
  assert.ok(invalid.warnings.length);
});

test('an empty file yields a complete configuration with defaults', () => {
  const {config, warnings} = normalizeStoreConfig({}, {warn: () => {}});
  assert.equal(config.store.name, DEFAULT_STORE.store.name);
  assert.deepEqual(config.languages, ['vi', 'en']);
  assert.equal(config.defaultLanguage, 'vi');
  assert.deepEqual(config.theme, DEFAULT_THEME);
  assert.deepEqual(config.booking, {maxRentalDays: 60, maxDaysAhead: 365, bufferDays: 0, timeSlots: [], slotMinutes: 30, displayStart: '06:00', displayEnd: '22:00', openingHours: {}, handoff: {weekly: {}}, turnaround: {strategy: 'none', hours: 0, returnCutoff: '20:00', readyNextDayAt: '07:00'}, fitting: {enabled: false, minutes: 30, bufferMinutes: 0}, policy: null});
  assert.deepEqual(Object.keys(config.contact).sort(), Object.keys(DEFAULT_STORE.contact).sort());
  assert.deepEqual(warnings, []);
});

test('weekly rental hours accept 24:00 only as an exclusive end', () => {
  const {config,warnings}=normalizeStoreConfig({booking:{openingHours:{mon:[{start:'00:00',end:'24:00'}]},handoff:{weekly:{mon:[{start:'00:00',end:'24:00'}]}}}},{warn:()=>{}});
  assert.deepEqual(warnings,[]);
  assert.equal(config.booking.handoff.weekly[1][0].end,'24:00');
  assert.equal(config.booking.openingHours[1][0].end,'24:00');
  const invalid=normalizeStoreConfig({booking:{handoff:{weekly:{mon:[{start:'24:00',end:'24:00'}]}}}},{warn:()=>{}});
  assert.ok(invalid.warnings.length);
  assert.deepEqual(invalid.config.booking.handoff.weekly[1],[]);
});

test('bad values fall back with a warning instead of breaking the build', () => {
  const warnings = [];
  const {config} = normalizeStoreConfig({
    store: {name: '  My Shop ', tagline: 42, hero: {title: {en: 'Hi', vi: 7}}, values: ['a', 'b', 'c', 'd']},
    languages: ['en', 'fr', 'ja', 'en'], defaultLanguage: 'fr',
    currency: 'dollars', timezone: 'Mars/Olympus', phoneCountryCode: '+81',
    contact: {facebook: 'facebook.com/x', messenger: 'https://m.me/x', pager: '1'},
    categories: {rental: {en: 'Rental'}, bad: 5},
    theme: {primary: 'red', accent: '#ABCDEF', shadow: '#000000'},
    booking: {maxRentalDays: 0, maxDaysAhead: 30, bufferDays: -1},
    admin: {defaultLanguage: 'xx'},
    extra: true
  }, {warn: m => warnings.push(m)});
  assert.equal(config.store.name, 'My Shop');
  assert.deepEqual(config.store.tagline, DEFAULT_STORE.store.tagline);
  assert.deepEqual(config.store.hero.title, {en: 'Hi'});
  assert.equal(config.store.values.length, 3);
  assert.deepEqual(config.languages, ['en', 'ja']);
  assert.equal(config.defaultLanguage, 'en');
  assert.equal(config.currency, 'VND');
  assert.equal(config.timezone, 'Asia/Ho_Chi_Minh');
  assert.equal(config.phoneCountryCode, '81');
  assert.equal(config.contact.facebook, null);
  assert.equal(config.contact.messenger, 'https://m.me/x');
  assert.deepEqual(config.categories, {rental: {en: 'Rental'}});
  assert.equal(config.theme.primary, DEFAULT_THEME.primary);
  assert.equal(config.theme.accent, '#abcdef');
  assert.deepEqual(config.booking, {maxRentalDays: 60, maxDaysAhead: 30, bufferDays: 0, timeSlots: [], slotMinutes: 30, displayStart: '06:00', displayEnd: '22:00', openingHours: {}, handoff: {weekly: {}}, turnaround: {strategy: 'none', hours: 0, returnCutoff: '20:00', readyNextDayAt: '07:00'}, fitting: {enabled: false, minutes: 30, bufferMinutes: 0}, policy: null});
  assert.equal(config.admin.defaultLanguage, 'en');
  for (const text of ['Unknown top-level key "extra"', '"fr" is not supported', 'defaultLanguage', 'currency', 'timezone', 'contact.facebook', 'contact.pager', 'categories.bad', 'theme.primary', 'theme.shadow', 'booking.maxRentalDays', 'booking.bufferDays', 'admin.defaultLanguage']) {
    assert(warnings.some(w => w.includes(text)), `expected a warning about ${text}: ${JSON.stringify(warnings)}`);
  }
});

test('theme.css and the HTML tokens come from the configuration', () => {
  const {config} = normalizeStoreConfig({store: {name: 'A & B <Shop>', description: {en: 'Desc'}}, languages: ['en'], theme: {primary: '#112233'}}, {warn: () => {}});
  assert.equal(themeCss(config), ':root{--primary:#112233;--paper:#faf7f0;--ink:#302e29;--muted:#79756c;--line:#e3ded3;--accent:#af784a}\n');
  const html = renderTemplate('<html lang="{{lang}}"><title>{{store.name}}</title><meta content="{{store.description}}"><meta name="theme-color" content="{{theme.primary}}">{{unknown}}', config);
  assert.equal(html, '<html lang="en"><title>A &amp; B &lt;Shop&gt;</title><meta content="Desc"><meta name="theme-color" content="#112233">{{unknown}}');
});

test('the shipped config/store.yaml is valid and free of warnings', async () => {
  const raw = parse(await readFile(new URL('../../config/store.yaml', import.meta.url), 'utf8'));
  const warnings = [];
  const {config} = normalizeStoreConfig(raw, {warn: m => warnings.push(m)});
  assert.deepEqual(warnings, []);
  assert.equal(config.store.name, 'Tiemora Demo Store');
  assert.equal(config.catalog.dir, 'examples/catalog');
  assert.equal(config.defaultLanguage, 'vi');
  assert.equal(config.ordering.fulfillment.dine_in, false);
  assert.equal(config.ordering.asap.enabled, false);
});

test('the isolated food demo config enables local-store ordering without warnings', async () => {
  const raw = parse(await readFile(new URL('../../examples/pho-demo/store.yaml', import.meta.url), 'utf8'));
  const {config, warnings} = normalizeStoreConfig(raw, {warn: () => {}});
  assert.deepEqual(warnings, []);
  assert.equal(config.catalog.dir, 'examples/pho-demo');
  assert.equal(config.ordering.fulfillment.dine_in, true);
  assert.equal(config.ordering.asap.enabled, true);
  assert.deepEqual(config.ordering.tables, {min: 1, max: 24});
  assert(config.store.text.heroDineIn.vi);
});

test('hero.focus and hero.subject accept "X% Y%" and warn about anything else', () => {
  const warnings = [];
  const {config} = normalizeStoreConfig({store: {hero: {layout: 'environmental', fit: 'cover', focus: '38% 50%', subject: '68% 70%'}}}, {warn: m => warnings.push(m)});
  assert.deepEqual(config.store.hero, {layout: 'environmental', eyebrow: null, title: null, subtitle: null, image: null, fit: 'cover', focus: '38% 50%', subject: '68% 70%'});
  assert.deepEqual(warnings, []);
  const bad = normalizeStoreConfig({store: {hero: {subject: 'the bowl'}}}, {warn: m => warnings.push(m)});
  assert.equal(bad.config.store.hero.subject, null);
  assert(warnings.some(w => w.includes('store.hero.subject')));
});
