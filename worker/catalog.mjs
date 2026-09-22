// The product master stays in dist/catalog.json (built from product.yaml). The Worker reads it
// through the static-assets binding so product ids can be checked without a second copy in D1.
const TTL = 60000;
let cache = {origin: '', products: [], byId: new Map(), fetchedAt: 0};

export async function loadCatalog(env, request) {
  const origin = new URL(request.url).origin;
  if (cache.origin === origin && Date.now() - cache.fetchedAt < TTL) return cache;
  const response = await env.ASSETS.fetch(new Request(origin + '/catalog.json'));
  if (!response.ok) throw new Error(`catalog.json HTTP ${response.status}`);
  const products = await response.json();
  if (!Array.isArray(products)) throw new Error('catalog.json is not a list');
  cache = {origin, products, byId: new Map(products.map(p => [p.id, p])), fetchedAt: Date.now()};
  return cache;
}
export function resetCatalogCache() { cache = {origin: '', products: [], byId: new Map(), fetchedAt: 0}; }
