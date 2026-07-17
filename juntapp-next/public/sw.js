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

  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.message,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: { action: data.action },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.notification.data?.action || '/inicio';
  event.waitUntil(self.clients.openWindow(action));
});
