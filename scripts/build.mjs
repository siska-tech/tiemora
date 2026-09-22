// npm run build -> dist/, the static site Cloudflare Workers Static Assets serves:
//   storefront pages (store name / description rendered in), theme.css and store.json from
//   config/store.yaml, catalog.json + optimised media from the product folders, and the admin pages
//   (served only to signed-in staff by the Worker). Nothing else is published: no YAML, no config
//   secrets (there are none), no originals.
import {cp, copyFile, lstat, mkdir, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {collectCatalog} from '../core/catalog/collect.mjs';
import {themeCss, renderTemplate} from '../core/config/store.mjs';
import {loadStoreConfig, resolveCatalogDir, projectRoot} from './store-config.mjs';
import {publishMedia, applyRewrites, generateThumbnails, attachThumbnails, maxEdge} from './images.mjs';

const {config} = await loadStoreConfig();
const catalogDir = await resolveCatalogDir(config);
// Validate the catalog before touching the last successful build.
const {products, files} = await collectCatalog(catalogDir, {currency: config.currency});

const output = path.join(projectRoot, 'dist');
try { if ((await lstat(output)).isSymbolicLink()) throw new Error('dist must not be a symbolic link'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (path.dirname(output) !== projectRoot || path.basename(output) !== 'dist') throw new Error('Unexpected build output path');
await rm(output, {recursive: true, force: true});
await mkdir(output, {recursive: true});

const storefront = path.join(projectRoot, 'storefront');
const render = async (from, to) => writeFile(to, renderTemplate(await readFile(from, 'utf8'), config));
for (const file of ['index.html', 'privacy.html']) await render(path.join(storefront, file), path.join(output, file));
for (const file of ['styles.css', 'catalog.js', 'gallery.js', 'app.js', 'booking.js']) await copyFile(path.join(storefront, file), path.join(output, file));
await cp(path.join(storefront, 'assets'), path.join(output, 'assets'), {recursive: true});
await writeFile(path.join(output, 'theme.css'), themeCss(config));
await writeFile(path.join(output, 'store.json'), JSON.stringify(config, null, 2) + '\n');

// The admin pages ship as static files too; the Worker only lets signed-in staff fetch them (worker/index.mjs).
const admin = path.join(projectRoot, 'admin');
await mkdir(path.join(output, 'admin'), {recursive: true});
for (const entry of await readdir(admin)) {
  if (entry.endsWith('.html') || entry.endsWith('.webmanifest')) await render(path.join(admin, entry), path.join(output, 'admin', entry));
  else await copyFile(path.join(admin, entry), path.join(output, 'admin', entry));
}

// Oversized photos are published smaller, and every image also gets card and strip sizes.
// Both are build artefacts, so only dist/catalog.json names them.
const {published, rewrites, converted} = await publishMedia(files, output);
applyRewrites(products, rewrites);
const {generated, written} = await generateThumbnails(published, output);
await writeFile(path.join(output, 'catalog.json'), JSON.stringify(attachThumbnails(products, generated), null, 2) + '\n');
// Catalog and config should be revalidated after each deploy; media can use platform defaults.
await writeFile(path.join(output, '_headers'), '/catalog.json\n  Cache-Control: no-cache\n/store.json\n  Cache-Control: no-cache\n/admin/*\n  Cache-Control: private, no-store\n  X-Robots-Tag: noindex\n');

// Workers Static Assets limits (free plan): 25 MiB per file, 20,000 files.
let assetCount = 0;
async function checkAssets(folder) {
  for (const entry of await readdir(folder, {withFileTypes: true})) {
    const file = path.join(folder, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Static assets must not contain symbolic links: ${file}`);
    if (entry.isDirectory()) await checkAssets(file);
    else if (entry.isFile()) {
      assetCount++;
      if ((await lstat(file)).size > 25 * 1024 * 1024) throw new Error(`Cloudflare asset exceeds 25 MiB: ${path.relative(output, file)}. Compress or shorten this file.`);
    }
  }
}
await checkAssets(output);
if (assetCount > 20000) throw new Error(`Static assets exceed the Workers Free file limit: ${assetCount} / 20000.`);
console.log(`Built dist/ for "${config.store.name}": ${products.length} products from ${path.relative(projectRoot, catalogDir).replaceAll('\\', '/') || '.'}/, ${files.length} media files (${converted} reduced to ${maxEdge}px), ${written} generated sizes.`);
