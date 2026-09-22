// Service worker for the admin PWA. It caches nothing on purpose (bookings are private and must
// always be fresh) and exists for two things: "add to home screen", and Web Push.
// The Worker sends pushes signed with the store's VAPID key (worker/push.mjs); the payload is the
// JSON built by newRequestPayload(): {title, body, url, tag}.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {body: event.data ? event.data.text() : ''}; }
  const title = data.title || 'Tiemora';
  const options = {
    body: data.body || '',
    tag: data.tag || 'tiemora',
    renotify: true,
    icon: '/assets/apple-touch-icon.png',
    badge: '/assets/icon-32.png',
    data: {url: data.url || '/admin/#/'}
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Tapping the notification focuses an open admin tab (and navigates it) or opens a new one.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/admin/#/', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(async clients => {
    const existing = clients.find(client => new URL(client.url).pathname.startsWith('/admin'));
    if (existing) { await existing.focus(); if ('navigate' in existing) await existing.navigate(url); return; }
    await self.clients.openWindow(url);
  }));
});

// The browser may rotate the subscription; re-register it so the Worker keeps a working endpoint.
self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil((async () => {
    const subscription = event.newSubscription || await self.registration.pushManager.getSubscription();
    if (!subscription) return;
    await fetch('/api/admin/push/subscriptions', {method: 'POST', credentials: 'same-origin', headers: {'content-type': 'application/json', 'x-requested-with': 'fetch'}, body: JSON.stringify(subscription.toJSON())});
  })());
});
