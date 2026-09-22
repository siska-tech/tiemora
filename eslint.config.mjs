// ESLint flat config. Three environments share one repository: Node (build scripts, tests),
// Cloudflare Workers (worker/, core/) and the browser (storefront/, admin/ — classic scripts
// that share globals across files, hence the explicit lists below).
import js from '@eslint/js';
import globals from 'globals';

const browserShared = {
  // storefront/*.js run as classic scripts in this order: catalog.js, gallery.js, app.js, booking.js
  products: 'writable', catalogState: 'writable', availability: 'writable', availabilityRange: 'writable', selected: 'writable', language: 'writable', filter: 'writable', mediaIndex: 'writable', store: 'writable',
  copy: 'readonly', catalogCopy: 'readonly', localizedText: 'readonly', chatUrl: 'readonly', escapeMarkup: 'readonly', mediaCover: 'readonly', renderGallery: 'readonly', stopGalleryVideo: 'readonly', renderProducts: 'readonly', updateProductDetail: 'readonly', loadCatalog: 'readonly', loadAvailability: 'readonly', readDateRange: 'readonly', productName: 'readonly', productMessage: 'readonly', formatDate: 'readonly', revealOnScroll: 'readonly', syncProductFromHash: 'readonly', artwork: 'readonly', refreshBookingText: 'readonly', updateBookingBlock: 'readonly'
};

export default [
  {ignores: ['dist/**', 'node_modules/**', '.wrangler/**', 'catalog/**', 'examples/**']},
  js.configs.recommended,
  {
    files: ['**/*.mjs'],
    languageOptions: {ecmaVersion: 2024, sourceType: 'module', globals: {...globals.node, ...globals.serviceworker, ...globals.browser}},
    rules: {'no-unused-vars': ['error', {argsIgnorePattern: '^_|^(req|env|url|params|admin|ctx)$', caughtErrors: 'none', ignoreRestSiblings: true}], 'no-empty': ['error', {allowEmptyCatch: true}]}
  },
  {
    files: ['storefront/**/*.js', 'admin/**/*.js'],
    languageOptions: {ecmaVersion: 2024, sourceType: 'script', globals: {...globals.browser, ...browserShared, turnstile: 'readonly'}},
    rules: {'no-unused-vars': ['error', {vars: 'local', caughtErrors: 'none'}], 'no-empty': ['error', {allowEmptyCatch: true}], 'no-redeclare': 'off'}
  },
  {
    files: ['admin/sw.js'],
    languageOptions: {sourceType: 'script', globals: {...globals.serviceworker}}
  }
];
