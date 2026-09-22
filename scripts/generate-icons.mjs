// Rasterises storefront/assets/icon.svg into the PNG fallbacks browsers still need.
// Run manually after editing the SVG: node scripts/generate-icons.mjs
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {Resvg} from '@resvg/resvg-js';
import {projectRoot} from './store-config.mjs';

const source = await readFile(path.join(projectRoot, 'storefront/assets/icon.svg'), 'utf8');
// iOS masks the home-screen icon itself, so its copy is drawn square to avoid doubly rounded corners.
const square = source.replace(/rx="\d+(\.\d+)?"/, 'rx="0"');

const targets = [
  {file: 'icon-32.png', width: 32, svg: source},
  {file: 'apple-touch-icon.png', width: 180, svg: square}
];
for (const {file, width, svg} of targets) {
  const png = new Resvg(svg, {fitTo: {mode: 'width', value: width}}).render().asPng();
  await writeFile(path.join(projectRoot, 'storefront', 'assets', file), png);
  console.log(`storefront/assets/${file}: ${width}px, ${(png.length / 1024).toFixed(1)} KB`);
}
