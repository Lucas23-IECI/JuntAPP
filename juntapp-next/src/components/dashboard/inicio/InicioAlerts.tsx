'use client';

import { useEffect, useState } from 'react';

type PushState = 'checking' | 'unsupported' | 'ios-install' | 'available' | 'subscribed' | 'denied' | 'error' | 'unconfigured';

function applicationServerKey(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

async function saveSubscription(subscription: PushSubscription) {
  const response = await fetch('/api/notifications/push/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  });
  if (!response.ok) throw new Error('No fue posible registrar este dispositivo.');
}

export default function InicioAlerts({ urgent }: { urgent?: string }) {
  const [showUrgent, setShowUrgent] = useState(Boolean(urgent));
  const [pushState, setPushState] = useState<PushState>('checking');
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function inspectPush() {
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        if (!cancelled) setPushState('unsupported');
        return;
      }
      if (isIos() && !isStandalone()) {
        if (!cancelled) setPushState('ios-install');
        return;
      }
      try {
        const configResponse = await fetch('/api/notifications/push/subscriptions', { cache: 'no-store' });
        const config = await configResponse.json() as { configured?: boolean; publicKey?: string | null };
        if (!configResponse.ok || !config.configured || !config.publicKey) {
          if (!cancelled) setPushState('unconfigured');
          return;
        }
        if (cancelled) return;
        setPublicKey(config.publicKey);
        if (Notification.permission === 'denied') {
          setPushState('denied');
          return;
        }
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          await saveSubscription(existing);
          if (!cancelled) setPushState('subscribed');
        } else if (!cancelled) {
          setPushState('available');
        }
      } catch {
        if (!cancelled) setPushState('error');
      }
    }
    void inspectPush();
    return () => { cancelled = true; };
  }, []);

  async function activateNotifications() {
    if (!publicKey) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushState(permission === 'denied' ? 'denied' : 'available');
        return;
      }
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(publicKey),
      });
      await saveSubscription(subscription);
      setPushState('subscribed');
      await registration.showNotification('JuntAPP activado', {
        body: 'Este celular ya puede recibir avisos importantes de tu comunidad.',
        icon: '/icons/pwa/icon-192.png',
        badge: '/icons/notification-badge.png',
        tag: 'juntapp-push-enabled',
      });
    } catch {
      setPushState('error');
    }
  }

  const showActivation = ['available', 'denied', 'error', 'ios-install'].includes(pushState);
  return <>
    {showUrgent && urgent && <div className="alert-banner"><div className="alert-icon">!</div><div className="alert-content"><strong>AVISO URGENTE:</strong> {urgent}</div><button className="alert-close" onClick={() => setShowUrgent(false)} aria-label="Cerrar alerta">×</button></div>}
    {showActivation && <div className="push-banner shadow-box mb-24"><div className="push-banner-content"><div className="push-banner-icon">🔔</div><div className="push-banner-text-group"><h4 className="push-banner-title">Activa alertas en tu celular</h4><p className="push-banner-desc">{pushState === 'ios-install' ? 'En iPhone o iPad, primero agrega JuntAPP a la pantalla de inicio desde el menú Compartir.' : pushState === 'denied' ? 'Las notificaciones están bloqueadas. Habilítalas en la configuración del navegador y vuelve a intentar.' : 'Recibe avisos importantes incluso cuando JuntAPP no esté abierta.'}</p></div></div>{pushState !== 'ios-install' && <button className="btn btn-primary btn-sm" onClick={activateNotifications}>Activar notificaciones</button>}</div>}
  </>;
}
