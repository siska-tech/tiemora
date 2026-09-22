// Build the reference shop without changing Core's default configuration or artwork.
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.TIEMORA_CONFIG = path.join(root, 'examples/pho-demo/store.yaml');
process.env.TIEMORA_CATALOG = path.join(root, 'examples/pho-demo');
process.env.TIEMORA_ASSETS = path.join(root, 'examples/pho-demo/assets');
await import('./build.mjs');
