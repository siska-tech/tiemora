// Build the sample catalog with rentals on the clock, without changing Core's default
// configuration. The catalog is the standard examples/catalog/; only the booking rules differ.
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.TIEMORA_CONFIG = path.join(root, 'examples/timed-rental/store.yaml');
await import('./build.mjs');
