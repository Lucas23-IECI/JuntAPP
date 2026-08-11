self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  const fallback = { title: 'JuntAPP', message: 'Tienes una nueva notificación.', action: '/inicio' };
  let data = fallback;
  try {
    data = { ...fallback, ...event.data.json() };
  } catch {
    data = fallback;
  }

  event.waitUntil(Promise.all([
    self.registration.showNotification(data.title, {
      body: data.message,
      icon: '/icons/pwa/icon-192.png',
      badge: '/icons/notification-badge.png',
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { action: data.action },
    }),
    'setAppBadge' in self.registration ? self.registration.setAppBadge(1) : Promise.resolve(),
  ]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if ('clearAppBadge' in self.registration) void self.registration.clearAppBadge();
  const requestedAction = event.notification.data?.action || '/inicio';
  const requestedUrl = new URL(requestedAction, self.location.origin);
  const targetUrl = requestedUrl.origin === self.location.origin
    ? requestedUrl
    : new URL('/inicio', self.location.origin);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.navigate(targetUrl.href);
      return existing.focus();
    }
    return self.clients.openWindow(targetUrl.href);
  })());
});
