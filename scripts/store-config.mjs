// Reads config/store.yaml for the build scripts. The parsed object is validated by
// core/config/store.mjs; here we only find the file and resolve the catalog directory.
import {readFile, access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';
import {normalizeStoreConfig} from '../core/config/store.mjs';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const configPath = process.env.TIEMORA_CONFIG ? path.resolve(process.env.TIEMORA_CONFIG) : path.join(projectRoot, 'config', 'store.yaml');

export async function loadStoreConfig({file = configPath, warn = console.warn} = {}) {
  let raw = {};
  try { raw = parse(await readFile(file, 'utf8')) ?? {}; }
  catch (error) {
    if (error.code === 'ENOENT') warn(`[store] ${path.relative(projectRoot, file)} not found; using defaults. Copy config/store.example.yaml to get started.`);
    else throw new Error(`[store] ${path.relative(projectRoot, file)}: ${error.message}`);
  }
  const {config, warnings} = normalizeStoreConfig(raw, {warn});
  return {config, warnings, file};
}

// The catalog directory from config (relative to the project root). TIEMORA_CATALOG overrides it.
export async function resolveCatalogDir(config, {warn = console.warn} = {}) {
  const dir = path.resolve(projectRoot, process.env.TIEMORA_CATALOG || config.catalog.dir);
  try { await access(dir); return dir; }
  catch {
    const fallback = path.join(projectRoot, 'examples', 'catalog');
    warn(`[catalog] ${path.relative(projectRoot, dir)}/ does not exist; building the sample catalog from examples/catalog/ instead.`);
    return fallback;
  }
}
