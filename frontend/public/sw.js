/* ==========================================================================
   JuntAPP Web Push Service Worker
   ========================================================================== */

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  
  let payload = {
    title: '🔔 JuntAPP en Vivo',
    body: 'Nuevo comunicado de la Junta de Vecinos.',
    type: 'general'
  };

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  const title = payload.title;
  const options = {
    body: payload.body,
    icon: '/img/logo.svg',
    badge: '/img/logo.svg',
    data: payload,
    vibrate: [100, 50, 100],
    actions: payload.action === 'pay-cuota' ? [
      { action: 'pay', title: '💵 Pagar Cuota Ahora' },
      { action: 'close', title: 'Cerrar' }
    ] : []
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click Received.');
  event.notification.close();

  const action = event.action;
  const notiData = event.notification.data || {};

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Find open JuntAPP tabs and focus
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes('/') && 'focus' in client) {
          if (action === 'pay' && notiData.targetSocioId) {
            client.postMessage({ type: 'CHECKOUT_SOCIO', socioId: notiData.targetSocioId });
          }
          return client.focus();
        }
      }
      
      // If no tab is open, open a new one
      if (clients.openWindow) {
        let url = '/';
        if (action === 'pay' && notiData.targetSocioId) {
          url = '/#tesoreria';
        }
        return clients.openWindow(url);
      }
    })
  );
});
