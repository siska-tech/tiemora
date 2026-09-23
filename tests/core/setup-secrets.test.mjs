// scripts/setup-secrets.mjs: the file edits that put a key into wrangler.jsonc and .dev.vars, and
// the argument parsing. The Cloudflare calls themselves are not exercised here.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setJsoncVar, readJsoncVar, upsertEnv, parseArgs, generateVapidKeys, projectRoot} from '../../scripts/setup-secrets.mjs';
import path from 'node:path';

test('a var is written into wrangler.jsonc without disturbing its comments or the rest of the file', async () => {
  const original = await readFile(path.join(projectRoot, 'wrangler.jsonc'), 'utf8');
  const updated = setJsoncVar(original, 'VAPID_PUBLIC_KEY', 'BKxQ-test_key');
  assert.equal(readJsoncVar(updated, 'VAPID_PUBLIC_KEY'), 'BKxQ-test_key');
  assert(updated.includes('// Web Push public key from'), 'comments survive');
  assert.equal(updated.split('\n').length, original.split('\n').length);
  // Every other var keeps its value, and the file is still valid JSONC (comments stripped => JSON).
  assert.equal(readJsoncVar(updated, 'TURNSTILE_SITE_KEY'), readJsoncVar(original, 'TURNSTILE_SITE_KEY'));
  assert.doesNotThrow(() => JSON.parse(updated.replace(/^\s*\/\/.*$/gm, '')));
  assert.throws(() => setJsoncVar(original, 'NOT_A_VAR', 'x'), /no "NOT_A_VAR"/);
  // A value with quotes or backslashes is encoded, not pasted in raw.
  assert.equal(readJsoncVar(setJsoncVar(original, 'STORE_TIMEZONE', 'a"b\\c'), 'STORE_TIMEZONE'), 'a"b\\c');
});

test('.dev.vars keeps one line per key: commented-out examples are filled in, new keys appended', () => {
  const example = ['# comment', 'ADMIN_PASSWORD=change-me', '# TURNSTILE_SITE_KEY=', '# VAPID_PRIVATE_KEY='].join('\n') + '\n';
  const out = upsertEnv(example, {TURNSTILE_SITE_KEY: '0x4A', VAPID_PRIVATE_KEY: 'secret', ADMIN_API_TOKEN: 'token'});
  assert.deepEqual(out.split('\n').filter(Boolean), ['# comment', 'ADMIN_PASSWORD=change-me', 'TURNSTILE_SITE_KEY=0x4A', 'VAPID_PRIVATE_KEY=secret', 'ADMIN_API_TOKEN=token']);
  // Writing again replaces the value instead of adding a second line.
  assert.deepEqual(upsertEnv(out, {TURNSTILE_SITE_KEY: '0x4B'}).split('\n').filter(l => l.startsWith('TURNSTILE_SITE_KEY')), ['TURNSTILE_SITE_KEY=0x4B']);
  assert.equal(upsertEnv('ADMIN_PASSWORD=pw', {X: '1'}), 'ADMIN_PASSWORD=pw\nX=1\n');
});

test('flags are parsed; domains accept repeats and comma lists; unknown flags stop the run', () => {
  const options = parseArgs(['turnstile', '--domain', 'a.com', '--domain', 'b.com,c.com', '--local', '--dry-run']);
  assert.equal(options.command, 'turnstile');
  assert.deepEqual(options.domains, ['a.com', 'b.com', 'c.com']);
  assert.equal(options.local, true);
  assert.equal(options.dryRun, true);
  assert.equal(options.force, false);
  assert.equal(parseArgs(['vapid', '--subject', 'mailto:a@b.c']).subject, 'mailto:a@b.c');
  assert.throws(() => parseArgs(['vapid', '--nope']), /Unknown argument/);
});

test('the generated VAPID pair is a P-256 key in the format the Worker expects', async () => {
  const {publicKey, privateKey} = await generateVapidKeys();
  // Uncompressed P-256 point (65 bytes, 0x04 prefix) and a 32-byte scalar, both base64url.
  const raw = Buffer.from(publicKey, 'base64url');
  assert.equal(raw.length, 65);
  assert.equal(raw[0], 4);
  assert.equal(Buffer.from(privateKey, 'base64url').length, 32);
  assert.match(publicKey + privateKey, /^[A-Za-z0-9_-]+$/);
  const again = await generateVapidKeys();
  assert.notEqual(again.privateKey, privateKey);
});
