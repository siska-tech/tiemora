// npm run setup:vapid / setup:turnstile / setup:status
//
// The two optional Cloudflare features (Web Push and Turnstile) each need a key in three places:
// a var in wrangler.jsonc, a Cloudflare Secret, and .dev.vars for `npm run dev`. Copying them by
// hand is where they go wrong, so this script does all three and leaves nothing on the terminal:
// secrets are piped into `wrangler secret put` and written to .dev.vars (git-ignored), never printed.
//
//   node scripts/setup-secrets.mjs vapid --subject mailto:you@example.com
//   node scripts/setup-secrets.mjs turnstile --domain shop.example.com
//   node scripts/setup-secrets.mjs status
//
// Flags: --local (skip Cloudflare, write .dev.vars only), --force (replace keys already in use),
//        --dry-run (say what would change and touch nothing).
import {spawn} from 'node:child_process';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// --- The three files ------------------------------------------------------------------------------

// Replaces the value of one key inside the "vars" block of wrangler.jsonc, keeping its comments and
// formatting intact (a JSON round-trip would throw them away). The key must already be listed there.
export function setJsoncVar(text, key, value) {
  const varsAt = text.search(/"vars"\s*:\s*\{/);
  if (varsAt < 0) throw new Error('wrangler.jsonc has no "vars" block.');
  const pattern = new RegExp(`("${key}"\\s*:\\s*)"((?:[^"\\\\]|\\\\.)*)"`);
  const block = text.slice(varsAt);
  const match = pattern.exec(block);
  if (!match) throw new Error(`wrangler.jsonc: "vars" has no "${key}"; add it first.`);
  const encoded = JSON.stringify(String(value));
  return text.slice(0, varsAt) + block.replace(pattern, () => match[1] + encoded);
}
export function readJsoncVar(text, key) {
  const varsAt = text.search(/"vars"\s*:\s*\{/);
  if (varsAt < 0) return '';
  const match = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`).exec(text.slice(varsAt));
  return match ? JSON.parse(`"${match[1]}"`) : '';
}
// Sets KEY=value in a .env-style file: an existing line is replaced (even when commented out, which
// is how .dev.vars.example ships the optional keys), anything else is appended at the end.
export function upsertEnv(text, values) {
  let out = text;
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^[ \\t]*#?[ \\t]*${key}=.*$`, 'm');
    out = pattern.test(out) ? out.replace(pattern, line) : `${out.replace(/\n*$/, '')}\n${line}\n`;
  }
  return out.endsWith('\n') ? out : out + '\n';
}

const wranglerPath = path.join(projectRoot, 'wrangler.jsonc');
const devVarsPath = path.join(projectRoot, '.dev.vars');
const readFileOr = async (file, fallback) => { try { return await readFile(file, 'utf8'); } catch (error) { if (error.code === 'ENOENT') return fallback; throw error; } };

// --- wrangler -------------------------------------------------------------------------------------

// Runs wrangler and returns its stdout. `input` is piped to stdin, which is how `secret put` takes a
// value without it ever reaching the terminal or the shell history.
function wrangler(args, {input = null, quiet = true} = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(projectRoot, 'node_modules', 'wrangler', 'bin', 'wrangler.js'), ...args], {
      cwd: projectRoot,
      stdio: [input == null ? 'ignore' : 'pipe', 'pipe', quiet ? 'pipe' : 'inherit']
    });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr?.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(stdout) : reject(new Error(`wrangler ${args[0]} ${args[1] ?? ''} failed (exit ${code}).\n${stderr.trim() || stdout.trim()}`)));
    if (input != null) { child.stdin.end(input); }
  });
}
const wranglerJson = async args => {
  const out = await wrangler(args);
  const start = out.search(/[[{]/);
  if (start < 0) throw new Error(`wrangler ${args.join(' ')} printed no JSON.`);
  return JSON.parse(out.slice(start));
};

// --- Shared plumbing ------------------------------------------------------------------------------

export function parseArgs(argv) {
  const options = {command: argv[0] || '', domains: [], local: false, force: false, dryRun: false, mode: 'managed', name: '', subject: ''};
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i], next = () => argv[++i];
    if (arg === '--local') options.local = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--domain' || arg === '--domains') options.domains.push(...String(next() ?? '').split(',').map(d => d.trim()).filter(Boolean));
    else if (arg === '--mode') options.mode = next();
    else if (arg === '--name') options.name = next();
    else if (arg === '--subject') options.subject = next();
    else throw new Error(`Unknown argument "${arg}".`);
  }
  return options;
}
const log = message => console.log(message);
// Applies one change set: vars into wrangler.jsonc, values into .dev.vars, secrets into Cloudflare.
async function apply({vars = {}, devVars = {}, secrets = {}}, options) {
  const names = Object.keys(vars), devNames = Object.keys(devVars), secretNames = Object.keys(secrets);
  if (options.dryRun) {
    if (names.length) log(`  would set in wrangler.jsonc vars: ${names.join(', ')}`);
    if (devNames.length) log(`  would write to .dev.vars: ${devNames.join(', ')}`);
    if (secretNames.length) log(options.local ? `  --local: would skip the Cloudflare secrets (${secretNames.join(', ')})` : `  would upload as Cloudflare Secrets: ${secretNames.join(', ')}`);
    return;
  }
  if (names.length) {
    let text = await readFile(wranglerPath, 'utf8');
    for (const [key, value] of Object.entries(vars)) text = setJsoncVar(text, key, value);
    await writeFile(wranglerPath, text);
    log(`  wrangler.jsonc vars: ${names.join(', ')}`);
  }
  if (devNames.length) {
    const example = await readFileOr(path.join(projectRoot, '.dev.vars.example'), '');
    const current = await readFileOr(devVarsPath, example);
    await writeFile(devVarsPath, upsertEnv(current, devVars));
    log(`  .dev.vars: ${devNames.join(', ')}`);
  }
  if (!secretNames.length) return;
  if (options.local) { log(`  --local: skipped the Cloudflare secrets (${secretNames.join(', ')})`); return; }
  for (const [key, value] of Object.entries(secrets)) {
    await wrangler(['secret', 'put', key], {input: value});
    log(`  Cloudflare Secret: ${key}`);
  }
}

// --- vapid ----------------------------------------------------------------------------------------

export async function generateVapidKeys() {
  const {publicKey, privateKey} = await crypto.subtle.generateKey({name: 'ECDSA', namedCurve: 'P-256'}, true, ['sign', 'verify']);
  const raw = await crypto.subtle.exportKey('raw', publicKey);
  const jwk = await crypto.subtle.exportKey('jwk', privateKey);
  return {publicKey: Buffer.from(raw).toString('base64url'), privateKey: jwk.d};
}
async function setupVapid(options) {
  const config = await readFile(wranglerPath, 'utf8');
  const existing = readJsoncVar(config, 'VAPID_PUBLIC_KEY');
  if (existing && !options.force) throw new Error('VAPID_PUBLIC_KEY is already set. Rotating the pair signs every admin device out of push; pass --force to replace it.');
  const subject = options.subject || readJsoncVar(config, 'VAPID_SUBJECT');
  if (!subject) throw new Error('No VAPID_SUBJECT: pass --subject mailto:you@example.com (the push services use it to reach you).');
  if (!/^(mailto:|https?:\/\/)/.test(subject)) throw new Error('--subject must be a mailto: address or an https:// URL.');
  log(existing ? 'Rotating the VAPID key pair…' : 'Generating a VAPID key pair…');
  const keys = await generateVapidKeys();
  await apply({
    vars: {VAPID_PUBLIC_KEY: keys.publicKey, VAPID_SUBJECT: subject},
    devVars: {VAPID_PUBLIC_KEY: keys.publicKey, VAPID_PRIVATE_KEY: keys.privateKey, VAPID_SUBJECT: subject},
    secrets: {VAPID_PRIVATE_KEY: keys.privateKey}
  }, options);
  if (options.dryRun) return log('\n--dry-run: nothing was written, and the pair generated for this preview was thrown away.');
  log(`\nWeb Push is configured. Run \`npm run deploy\` to publish the new vars, then re-subscribe each admin device at /admin/#/settings${existing ? ' (the old subscriptions no longer work)' : ''}.`);
}

// --- turnstile ------------------------------------------------------------------------------------

async function setupTurnstile(options) {
  const config = await readFile(wranglerPath, 'utf8');
  const existing = readJsoncVar(config, 'TURNSTILE_SITE_KEY');
  const name = options.name || `${/"name"\s*:\s*"([^"]+)"/.exec(config)?.[1] || 'tiemora'}-booking`;
  const domains = [...new Set(['localhost', ...options.domains])];
  if (options.local && !options.domains.length) log('Note: no --domain given, so the widget only answers on localhost.');
  const widgets = await wranglerJson(['turnstile', 'widget', 'list', '--json']);
  let widget = widgets.find(w => w.name === name);
  if (widget && existing && existing !== widget.sitekey && !options.force) throw new Error(`TURNSTILE_SITE_KEY is set to a different widget (${existing}). Pass --force to point the config at "${name}".`);
  if (!widget) {
    log(`Creating the Turnstile widget "${name}" for ${domains.join(', ')}…`);
    if (options.dryRun) { log('  --dry-run: nothing was created, so there is no site key to write.'); return; }
    widget = await wranglerJson(['turnstile', 'widget', 'create', name, '--mode', options.mode, ...domains.flatMap(d => ['--domain', d]), '--json']);
  } else {
    const missing = domains.filter(d => !(widget.domains || []).includes(d));
    if (missing.length && !options.dryRun) {
      log(`Adding ${missing.join(', ')} to the existing widget "${name}"…`);
      widget = await wranglerJson(['turnstile', 'widget', 'update', widget.sitekey, ...[...widget.domains, ...missing].flatMap(d => ['--domain', d]), '--json']);
    } else log(`Reusing the existing widget "${name}"${missing.length ? ` (would add ${missing.join(', ')})` : ''}.`);
  }
  // The secret is only readable through `widget get`; it is piped straight on, never printed.
  const full = await wranglerJson(['turnstile', 'widget', 'get', widget.sitekey, '--json']);
  const secret = full.secret || widget.secret;
  if (!secret) throw new Error('Cloudflare did not return the widget secret; add TURNSTILE_SECRET_KEY by hand from the dashboard.');
  await apply({
    vars: {TURNSTILE_SITE_KEY: widget.sitekey},
    devVars: {TURNSTILE_SITE_KEY: widget.sitekey, TURNSTILE_SECRET_KEY: secret},
    secrets: {TURNSTILE_SECRET_KEY: secret}
  }, options);
  if (options.dryRun) return log('\n--dry-run: nothing was written.');
  log(`\nTurnstile is configured for ${(full.domains || domains).join(', ')}. Run \`npm run deploy\` to publish the site key; the booking and order forms pick the widget up on their own.`);
}

// --- status ---------------------------------------------------------------------------------------

async function status(options) {
  const config = await readFile(wranglerPath, 'utf8');
  const dev = await readFileOr(devVarsPath, '');
  const hasDev = key => new RegExp(`^[ \\t]*${key}=.+$`, 'm').test(dev);
  let remote = null;
  if (!options.local) {
    try { remote = (await wranglerJson(['secret', 'list', '--format', 'json'])).map(s => s.name); }
    catch (error) { log(`Cloudflare secrets unavailable (${error.message.split('\n')[0]})`); }
  }
  const mark = value => value ? '✓' : '—';
  const rows = [
    {label: 'Web Push (VAPID)', vars: ['VAPID_PUBLIC_KEY', 'VAPID_SUBJECT'], secrets: ['VAPID_PRIVATE_KEY']},
    {label: 'Turnstile', vars: ['TURNSTILE_SITE_KEY'], secrets: ['TURNSTILE_SECRET_KEY']}
  ];
  log('                  wrangler.jsonc   Cloudflare secret   .dev.vars');
  for (const {label, vars, secrets} of rows) {
    const varsSet = vars.every(key => readJsoncVar(config, key));
    const secretSet = remote === null ? null : secrets.every(key => remote.includes(key));
    const devSet = [...vars, ...secrets].every(hasDev);
    log(`${label.padEnd(18)}${mark(varsSet).padEnd(17)}${(secretSet === null ? '?' : mark(secretSet)).padEnd(20)}${mark(devSet)}`);
  }
  log('\nA feature is live only when its var and its secret are both set (and `npm run deploy` has run since).');
}

// --- CLI ------------------------------------------------------------------------------------------

const USAGE = `Usage:
  node scripts/setup-secrets.mjs vapid --subject mailto:you@example.com [--local] [--force] [--dry-run]
  node scripts/setup-secrets.mjs turnstile [--domain shop.example.com] [--name widget] [--mode managed] [--local] [--force] [--dry-run]
  node scripts/setup-secrets.mjs status [--local]`;

export async function main(argv) {
  const options = parseArgs(argv);
  if (options.command === 'vapid') return setupVapid(options);
  if (options.command === 'turnstile') return setupTurnstile(options);
  if (options.command === 'status') return status(options);
  throw new Error(`${options.command ? `Unknown command "${options.command}".` : 'No command given.'}\n${USAGE}`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main(process.argv.slice(2)).catch(error => { console.error(`\n${error.message}\n`); process.exitCode = 1; });
}
