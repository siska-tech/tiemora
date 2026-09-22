// Tiemora Worker entry point. wrangler.jsonc routes only /api/* and /admin* here
// (assets.run_worker_first); the storefront, catalog.json, store.json and media are served by
// Static Assets without touching this code.
import {handleApi} from './api.mjs';
import {authenticate, authMode} from './auth.mjs';

const adminHeaders = {
  'cache-control': 'private, no-store',
  'x-frame-options': 'DENY',
  'referrer-policy': 'same-origin',
  'content-security-policy': "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
};
function withHeaders(response, headers) {
  const copy = new Response(response.body, response);
  for (const [key, value] of Object.entries(headers)) copy.headers.set(key, value);
  return copy;
}
const redirect = (url, path) => Response.redirect(new URL(path, url).toString(), 302);

// Everything under /admin/ is a static page, but only the login page and the files it needs
// (its stylesheet and script) are served to strangers; the app itself stays behind the session.
// The web app manifest carries no data and browsers may fetch it without cookies, so it is public too.
const publicAdminFiles = new Set(['/admin/login.js', '/admin/admin.css', '/admin/manifest.webmanifest']);
async function handleAdmin(request, env, url) {
  if (url.pathname === '/admin') return redirect(url, '/admin/');
  if (publicAdminFiles.has(url.pathname)) return withHeaders(await env.ASSETS.fetch(request), adminHeaders);
  const admin = await authenticate(request, env);
  const loginPage = /^\/admin\/login(?:\.html)?$/.test(url.pathname);
  if (loginPage) {
    if (admin) return redirect(url, '/admin/');
    if (authMode(env) === 'access') return new Response('This admin area is protected by Cloudflare Access. Open it through the Access application instead.', {status: 403, headers: {'content-type': 'text/plain; charset=utf-8', ...adminHeaders}});
    // Static Assets serves dist/admin/login.html at /admin/login (and redirects the .html spelling there).
    return withHeaders(await env.ASSETS.fetch(new Request(new URL('/admin/login', url), {method: 'GET', headers: request.headers})), adminHeaders);
  }
  if (!admin) {
    const wantsPage = (request.headers.get('accept') || '').includes('text/html');
    return wantsPage ? redirect(url, '/admin/login') : new Response('Unauthorized', {status: 401, headers: adminHeaders});
  }
  return withHeaders(await env.ASSETS.fetch(request), adminHeaders);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return handleApi(request, env, url, ctx);
    if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) return handleAdmin(request, env, url);
    return env.ASSETS.fetch(request);
  }
};
