import {copyFile, mkdir, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const imageExtensions = new Set(['.jpg','.jpeg','.png','.webp','.avif','.gif']);
// Nothing on the page shows an image wider than about 1000px, so anything past this is
// re-encoded for publishing. The file in catalog/ is left untouched as the master.
export const maxEdge = 1400;
export const quality = 72;
// Display sizes, doubled for retina: cards sit at ~283px on a four-column desktop grid and
// ~170px on a two-column phone; the gallery strip is 60x76 (52x64 on phones).
export const variants = [
  {name: 'card', width: 640, height: 853},
  {name: 'thumb', width: 200, height: 260}
];

function replaceExtension(target, suffix) {
  return target.slice(0, -path.extname(target).length) + suffix;
}
// "…/image1.webp" -> "…/image1.card.webp", for both disk paths and the already-encoded web URL.
const variantName = (target, name) => replaceExtension(target, '.' + name + '.webp');

async function place(source, output, relative) {
  await mkdir(path.dirname(path.join(output, relative)), {recursive: true});
  await copyFile(source, path.join(output, relative));
}

// Copies catalog media into the build. Images whose long edge is over maxEdge are published as a
// WebP of that size instead, so oversized photos cost nothing extra without editing the catalog.
// Returns the published files plus {originalUrl: publishedUrl} for the few that changed name.
export async function publishMedia(files, output, {warn = console.warn} = {}) {
  const published = [], rewrites = {};
  const claimed = new Set(files.map(file => file.relative.toLowerCase()));
  let converted = 0;
  for (const file of files) {
    const extension = path.extname(file.relative).toLowerCase();
    const keep = async reason => {
      if (reason) warn(`[images] ${file.relative}: published unchanged (${reason}).`);
      await place(file.source, output, file.relative);
      published.push(file);
    };
    // Resizing an animated GIF would flatten it, so those are published as they are.
    if (!imageExtensions.has(extension) || extension === '.gif') {await keep(); continue;}
    let image, metadata;
    try {
      image = sharp(file.source, {animated: false});
      metadata = await image.metadata();
    } catch (error) {await keep(`unreadable, ${error.message}`); continue;}
    if (Math.max(metadata.width, metadata.height) <= maxEdge) {await keep(); continue;}
    const relative = replaceExtension(file.relative, '.webp');
    if (relative !== file.relative && claimed.has(relative.toLowerCase())) {
      await keep(`${path.basename(relative)} is already taken`);
      continue;
    }
    let data;
    try {
      data = await image.resize({width: maxEdge, height: maxEdge, fit: 'inside'}).webp({quality}).toBuffer();
    } catch (error) {await keep(`could not be resized, ${error.message}`); continue;}
    // A tightly compressed JPEG barely over the limit can come back larger; re-encoding it would
    // only trade bytes for generation loss, so the original wins.
    if (data.length >= (await stat(file.source)).size) {await keep(); continue;}
    await mkdir(path.dirname(path.join(output, relative)), {recursive: true});
    await writeFile(path.join(output, relative), data);
    claimed.add(relative.toLowerCase());
    const url = replaceExtension(file.url, '.webp');
    if (url !== file.url) rewrites[file.url] = url;
    // Thumbnails are still cut from the master, not from this reduced copy.
    published.push({source: file.source, relative, url});
    converted++;
  }
  return {published, rewrites, converted};
}

// Points the catalog at the published names. Only dist/catalog.json is rewritten; the copy at the
// repository root keeps naming the files that actually sit in catalog/.
export function applyRewrites(products, rewrites) {
  const to = url => rewrites[url] || url;
  for (const product of products) {
    if (product.cover) product.cover = to(product.cover);
    if (product.images) product.images = product.images.map(to);
    // Keys are video URLs, which are never re-encoded; the values are the poster images.
    if (product.posters) product.posters = Object.fromEntries(Object.entries(product.posters).map(([video, poster]) => [video, to(poster)]));
  }
  return products;
}

// Writes a WebP copy of every published image at each display size, skipping sources that are
// already small enough to serve directly. Returns {imageUrl: {card, thumb}} for catalog.json.
export async function generateThumbnails(files, output, {warn = console.warn} = {}) {
  const generated = {};
  let written = 0;
  for (const file of files) {
    if (!imageExtensions.has(path.extname(file.relative).toLowerCase())) continue;
    let image, metadata;
    try {
      image = sharp(file.source, {animated: false});
      metadata = await image.metadata();
    } catch (error) {
      warn(`[images] ${file.relative}: no generated sizes, serving the published image (${error.message}).`);
      continue;
    }
    for (const {name, width, height} of variants) {
      // An upscale would cost bytes without adding detail, so the published image stays in place.
      if (metadata.width < width || metadata.height < height) continue;
      const relative = variantName(file.relative, name);
      try {
        const data = await image.clone()
          // Centre crop reproduces exactly what object-fit:cover already does with the full image.
          .resize(width, height, {fit: 'cover', position: 'centre'})
          .webp({quality})
          .toBuffer();
        await mkdir(path.dirname(path.join(output, relative)), {recursive: true});
        await writeFile(path.join(output, relative), data);
      } catch (error) {
        warn(`[images] ${relative}: not generated, serving the published image (${error.message}).`);
        continue;
      }
      (generated[file.url] ??= {})[name] = variantName(file.url, name);
      written++;
    }
  }
  return {generated, written};
}

// Hangs the generated sizes off each product, keyed by the image URL the page already uses.
export function attachThumbnails(products, generated) {
  for (const product of products) {
    const media = [...(product.images || []), ...Object.values(product.posters || {})];
    const own = Object.fromEntries(media.filter(url => generated[url]).map(url => [url, generated[url]]));
    if (Object.keys(own).length) product.variants = own;
    else delete product.variants;
  }
  return products;
}
