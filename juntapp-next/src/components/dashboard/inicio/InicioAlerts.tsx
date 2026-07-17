'use client';

import { useState, useSyncExternalStore } from 'react';

const subscribeToHydration = () => () => {};

export default function InicioAlerts({ urgent }: { urgent?: string }) {
  const [showUrgent, setShowUrgent] = useState(Boolean(urgent));
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [requestedPermission, setRequestedPermission] = useState<NotificationPermission | null>(null);
  const permission: NotificationPermission | 'unsupported' | 'pending' = hydrated
    ? requestedPermission ?? (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
    : 'pending';
  async function activateNotifications() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    const nextPermission = await Notification.requestPermission(); setRequestedPermission(nextPermission);
    if (nextPermission === 'granted') { const registration = await navigator.serviceWorker.register('/sw.js'); await registration.showNotification('JuntAPP activado', { body: 'Recibirás los avisos importantes de tu comunidad.', icon: '/favicon.ico' }); }
  }
  return <>{showUrgent && urgent && <div className="alert-banner"><div className="alert-icon">!</div><div className="alert-content"><strong>AVISO URGENTE:</strong> {urgent}</div><button className="alert-close" onClick={() => setShowUrgent(false)} aria-label="Cerrar alerta">×</button></div>}{permission !== 'granted' && permission !== 'unsupported' && <div className="push-banner shadow-box mb-24"><div className="push-banner-content"><div className="push-banner-icon">🔔</div><div className="push-banner-text-group"><h4 className="push-banner-title">Activar Alertas en tu Celular</h4><p className="push-banner-desc">Recibe avisos importantes aun cuando la aplicación no esté abierta.</p></div></div><button className="btn btn-primary btn-sm" onClick={activateNotifications}>Activar Notificaciones</button></div>}</>;
}
