// Generic sale-order cart state for plain storefronts. It stores selection intent and quantities;
// the Worker remains authoritative for names, prices, options, add-ons, stock and totals.
(() => {
  const VERSION = 1;
  const STORAGE_KEY = 'tiemora-cart-v1';
  const listeners = new Set();
  let items = [];

  const clone = value => JSON.parse(JSON.stringify(value));
  const stable = value => JSON.stringify(value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value || {});
  const normaliseAddons = addons => [...new Set(Array.isArray(addons) ? addons.filter(id => typeof id === 'string') : [])].sort();
  const keyOf = item => `${item.productId}|${stable(item.options)}|${JSON.stringify(normaliseAddons(item.addons))}`;
  const quantityOf = value => Math.min(20, Math.max(1, Number.parseInt(value, 10) || 1));
  const notify = () => listeners.forEach(listener => listener(snapshot()));
  const snapshot = () => clone(items);
  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({version: VERSION, items})); }
    catch { /* Storage may be unavailable; the cart still works for this page. */ }
  };
  const persist = () => { save(); notify(); };

  function restore() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '');
      if (raw?.version !== VERSION || !Array.isArray(raw.items)) throw new Error('Invalid cart');
      items = raw.items.filter(item => item && typeof item.productId === 'string' && typeof item.unitPrice === 'number' && typeof item.lineTotal === 'number').map(item => ({
        ...item,
        options: item.options && typeof item.options === 'object' ? item.options : {},
        addons: normaliseAddons(item.addons),
        quantity: quantityOf(item.quantity)
      }));
    } catch { items = []; try { localStorage.removeItem(STORAGE_KEY); } catch {} }
    notify();
    return snapshot();
  }
  function add(item) {
    const next = {...item, options: item.options || {}, addons: normaliseAddons(item.addons), quantity: quantityOf(item.quantity)};
    const existing = items.find(candidate => keyOf(candidate) === keyOf(next));
    if (existing) existing.quantity = Math.min(20, existing.quantity + next.quantity);
    else items.push({...next, lineTotal: next.unitPrice * next.quantity});
    items.forEach(candidate => { candidate.lineTotal = candidate.unitPrice * candidate.quantity; });
    persist();
    return snapshot();
  }
  function update(index, quantity) {
    if (!items[index]) return snapshot();
    const next = Number.parseInt(quantity, 10) || 0;
    if (next <= 0) items.splice(index, 1);
    else { items[index].quantity = Math.min(20, next); items[index].lineTotal = items[index].unitPrice * items[index].quantity; }
    persist();
    return snapshot();
  }
  function remove(index) { if (items[index]) items.splice(index, 1); persist(); return snapshot(); }
  function clear() { items = []; persist(); return snapshot(); }
  function totals(fee = 0) { const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0); return {subtotal, delivery_fee: fee, total: subtotal + fee}; }
  // A subscriber is handed the current cart at once, then every change. Without that first call a
  // page that loads with a restored cart shows nothing until the next change: cart.js restores (and
  // notifies) before the page scripts that listen have even run.
  function subscribe(listener) { listeners.add(listener); listener(snapshot()); return () => listeners.delete(listener); }

  window.TiemoraCart = {VERSION, STORAGE_KEY, keyOf, restore, snapshot, add, update, remove, clear, totals, subscribe};
  restore();
})();
