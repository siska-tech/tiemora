// npm run generate:catalog -> catalog.json at the project root (the build writes its own copy to
// dist/ with the published media names). Product folders are read from config/store.yaml's
// catalog.dir (default: catalog/), falling back to examples/catalog/ when it does not exist.
import {writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {collectCatalog} from '../core/catalog/collect.mjs';
import {loadStoreConfig, resolveCatalogDir, projectRoot} from './store-config.mjs';

export {projectRoot};

/** @param {{root?: string, output?: string, warn?: (message: string) => void}} [options] */
export async function generateCatalog({root, output = path.join(projectRoot, 'catalog.json'), warn = console.warn} = {}) {
  const {config} = await loadStoreConfig({warn});
  root ??= await resolveCatalogDir(config, {warn});
  const result = await collectCatalog(root, {warn, currency: config.currency});
  await mkdir(path.dirname(output), {recursive: true});
  await writeFile(output, JSON.stringify(result.products, null, 2) + '\n');
  return {...result, config, root};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generateCatalog().then(({products, root}) => console.log(`Generated catalog.json: ${products.length} products from ${path.relative(projectRoot, root) || '.'}/.`)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
