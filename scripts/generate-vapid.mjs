// npm run vapid:generate -> a fresh VAPID key pair for Web Push (admin notifications).
// Prints where each value goes. The private key is a secret: never commit it, never put it in
// wrangler.jsonc. Rotating the pair invalidates every existing admin subscription.
const {publicKey, privateKey} = await crypto.subtle.generateKey({name: 'ECDSA', namedCurve: 'P-256'}, true, ['sign', 'verify']);
const base64url = bytes => Buffer.from(bytes).toString('base64url');
const raw = base64url(await crypto.subtle.exportKey('raw', publicKey));
const jwk = await crypto.subtle.exportKey('jwk', privateKey);

console.log(`VAPID keys generated.

1. Public key -> wrangler.jsonc  "vars": { "VAPID_PUBLIC_KEY": "…" }   (and .dev.vars for local dev)
VAPID_PUBLIC_KEY=${raw}

2. Private key -> \`npx wrangler secret put VAPID_PRIVATE_KEY\`  (and .dev.vars for local dev; NEVER commit it)
VAPID_PRIVATE_KEY=${jwk.d}

3. Subject (a contact for the push services) -> wrangler.jsonc vars or secret
VAPID_SUBJECT=mailto:you@example.com
`);
