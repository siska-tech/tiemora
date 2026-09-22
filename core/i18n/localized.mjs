// Language helpers shared by the build, the Worker and (copied verbatim) the browser bundles.
// A "localized value" is either a plain string or an object keyed by language code:
//   name: "Sample item"            or            name: {vi: "...", en: "...", ja: "..."}

// Every language Tiemora ships UI strings for. A store enables a subset in config/store.yaml.
export const SUPPORTED_LANGUAGES = ['vi', 'en', 'ja', 'zh'];
export const DEFAULT_LANGUAGE = 'vi';
// Fallback order when the requested language is missing: requested -> default -> any listed -> first available.
export const FALLBACK_ORDER = ['vi', 'en', 'ja', 'zh'];

export function localized(value, language = DEFAULT_LANGUAGE, fallbacks = FALLBACK_ORDER) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  return [language, ...fallbacks, ...Object.keys(value)].map(key => value[key]).find(v => typeof v === 'string' && v.trim()) || '';
}

// Keeps only string translations of a localized object (or the string itself).
export function cleanLocalized(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return Object.fromEntries(Object.entries(value).filter(([, v]) => typeof v === 'string'));
}
