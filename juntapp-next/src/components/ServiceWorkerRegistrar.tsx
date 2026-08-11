'use client';

import { useEffect } from 'react';

type DeferredInstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

declare global {
  interface Window {
    __juntAppInstallPrompt?: DeferredInstallPrompt;
  }
}

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      window.__juntAppInstallPrompt = event as DeferredInstallPrompt;
      window.dispatchEvent(new Event('juntapp-install-available'));
    };
    window.addEventListener('beforeinstallprompt', captureInstallPrompt);
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      void navigator.serviceWorker.register('/sw.js');
    }
    return () => window.removeEventListener('beforeinstallprompt', captureInstallPrompt);
  }, []);

  return null;
}
