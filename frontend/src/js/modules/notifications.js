/* ==========================================================================
   JuntAPP Real-Time Notifications & Push Module
   ========================================================================== */

import { db } from "../db.js";
import { utils } from "../utils.js";

// DOM references
const bellToggle = document.getElementById("bellToggle");
const bellBadge = document.getElementById("bellBadge");
const mobileBellToggle = document.getElementById("mobileBellToggle");
const mobileBellBadge = document.getElementById("mobileBellBadge");
const notificationsPanel = document.getElementById("notificationsPanel");
const notificationsList = document.getElementById("notificationsList");
const clearAllNotificationsBtn = document.getElementById("clearAllNotificationsBtn");
const toastContainer = document.getElementById("toast-container");

const pushActivationBanner = document.getElementById("pushActivationBanner");
const btnSubscribePush = document.getElementById("btnSubscribePush");

// Simulated Notification Pool for Real-Time Generator
const REALTIME_POOL = [
  { type: "asamblea", title: "Asamblea Extraordinaria", message: "Convocatoria para este Sábado a las 17:30 hrs en la Sede para votar reglamento de portones." },
  { type: "votacion", title: "Nueva Consulta Abierta", message: "Se ha abierto una consulta sobre remodelación de áreas verdes. ¡Vota en la sección Votaciones!" },
  { type: "comunicado", title: "Subsidio de Techumbre", message: "Municipalidad abre postulación especial para el recambio de techos. Revisa Anuncios Oficiales." },
  { type: "cuota", title: "Recordatorio de Directiva", message: "Agradecemos a todos los vecinos mantener sus cuotas de la sede al día para financiar reparaciones." },
  { type: "seguridad", title: "Alerta Vecinal", message: "Se reporta luminaria pública apagada en Pasaje Los Aromos. Directiva ya coordinó el cambio con municipio." }
];

export const notificationsModule = {
  swRegistration: null,
  isSubscribed: false,

  init() {
    // 1. Service Worker & Push Subscription bootstrap
    this.setupServiceWorker();

    // 2. Click listeners for notification panels
    if (bellToggle) {
      bellToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        this.togglePanel(bellToggle);
      });
    }
    if (mobileBellToggle) {
      mobileBellToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        this.togglePanel(mobileBellToggle);
      });
    }

    // Close panel click outside
    window.addEventListener("click", (e) => {
      if (notificationsPanel && notificationsPanel.classList.contains("active")) {
        if (!notificationsPanel.contains(e.target) && !e.target.closest("#bellToggle") && !e.target.closest("#mobileBellToggle")) {
          notificationsPanel.classList.remove("active");
        }
      }
    });

    // Mark all as read
    if (clearAllNotificationsBtn) {
      clearAllNotificationsBtn.addEventListener("click", async () => {
        const list = await db.getNotifications();
        for (const n of list) {
          if (!n.read) {
            await db.markNotificationRead(n.id);
          }
        }
        this.render();
      });
    }

    // Subscribe Push Button click
    if (btnSubscribePush) {
      btnSubscribePush.addEventListener("click", () => this.subscribeUserToPush());
    }

    // 3. Service Worker messages (like payment checkout triggers)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CHECKOUT_SOCIO') {
          const socioId = parseInt(event.data.socioId);
          if (window.JuntappPayment) {
            window.JuntappPayment.openCheckout(socioId);
          }
        }
      });
    }

    // Start background simulation
    // this.startRealTimeSimulator();

    // Initial render
    this.render();
  },

  async setupServiceWorker() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        console.log('📂 [Push API] Service Worker registered scope:', reg.scope);
        this.swRegistration = reg;
        
        // Check current subscription status
        const subscription = await reg.pushManager.getSubscription();
        this.isSubscribed = !(subscription === null);
        
        this.updatePushUI();
      } catch (err) {
        console.error('❌ Service Worker registration or push check failed:', err);
      }
    } else {
      console.warn('⚠️ Web Push is not supported in this browser.');
    }
  },

  updatePushUI() {
    if (!pushActivationBanner) return;

    if (Notification.permission === 'denied') {
      pushActivationBanner.style.display = "none";
      return;
    }

    if (this.isSubscribed || Notification.permission === 'granted') {
      pushActivationBanner.style.display = "none";
    } else {
      pushActivationBanner.style.display = "flex";
    }
  },

  async subscribeUserToPush() {
    if (!this.swRegistration) {
      // Offline/Local Simulation if Service Worker failed to register
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.isSubscribed = true;
        this.updatePushUI();
        this.addNotification({
          type: "seguridad",
          title: "Notificaciones Push Activas",
          message: "¡Excelente! Has activado las notificaciones en tiempo real para asambleas y cuotas."
        });
      }
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // VAPID Public Key (Simulated or Local Server Key)
        const applicationServerKey = this.urlB64ToUint8Array('BEl62OhArw1Kocqip6FqXYT6W3v3JH82JpKVQZ2s-9Z4Uo12oY8uO5vj9N4e_5Qd8e1c6t3e_4k5o5q8e');
        
        const subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey
        });

        console.log('📡 [Push API] User is subscribed:', JSON.stringify(subscription));
        this.isSubscribed = true;
        this.updatePushUI();

        // If cloud database is active, save subscription info to profile / database table
        if (db.isCloud()) {
          // Send subscription to server edge function or save in metadata.
          // For demo / local, we log to console.
        }

        this.addNotification({
          type: "seguridad",
          title: "Alertas en Vivo Activadas",
          message: "Recibirás avisos instantáneos de la directiva directamente en tu pantalla."
        });
      } else {
        console.warn('Permission for notifications was denied');
        this.updatePushUI();
      }
    } catch (err) {
      console.error('Failed to subscribe the user: ', err);
      // Fallback local simulate
      this.isSubscribed = true;
      this.updatePushUI();
    }
  },

  togglePanel(triggerEl) {
    notificationsPanel.classList.toggle("active");
    if (notificationsPanel.classList.contains("active") && triggerEl === bellToggle) {
      const rect = triggerEl.getBoundingClientRect();
      notificationsPanel.style.left = `${rect.right + 12}px`;
      notificationsPanel.style.bottom = `12px`;
      notificationsPanel.style.top = `auto`;
    }
  },

  async render() {
    const list = await db.getNotifications();
    const unreadCount = list.filter(n => !n.read).length;

    // Badges update
    if (bellBadge) {
      if (unreadCount > 0) {
        bellBadge.textContent = unreadCount;
        bellBadge.style.display = "flex";
      } else {
        bellBadge.style.display = "none";
      }
    }

    if (mobileBellBadge) {
      if (unreadCount > 0) {
        mobileBellBadge.textContent = unreadCount;
        mobileBellBadge.style.display = "flex";
      } else {
        mobileBellBadge.style.display = "none";
      }
    }

    // Render List
    if (notificationsList) {
      notificationsList.innerHTML = "";
      
      if (list.length === 0) {
        notificationsList.innerHTML = `<div class="empty-notifications">No tienes notificaciones</div>`;
        return;
      }

      const sorted = [...list].sort((a, b) => new Date(b.date) - new Date(a.date));

      sorted.forEach(n => {
        const item = document.createElement("div");
        item.className = `notification-item ${n.read ? 'read' : 'unread'} type-${n.type}`;
        
        item.innerHTML = `
          <div class="notification-item-icon">
            ${this.getIconForType(n.type)}
          </div>
          <div class="notification-item-content">
            <div class="notification-item-header">
              <strong class="noti-title">${n.title}</strong>
              <span class="noti-time">${utils.formatDate(n.date.split('T')[0])}</span>
            </div>
            <p class="noti-message">${n.message}</p>
            ${n.action === "pay-cuota" && !n.read ? `
              <button class="btn btn-primary btn-xs noti-action-btn" data-action="pay" data-socio="${n.target_socio_id || n.targetSocioId || 4}">Pagar Cuota Online</button>
            ` : ""}
          </div>
        `;

        item.addEventListener("click", async (e) => {
          if (e.target.classList.contains("noti-action-btn")) {
            const socioId = parseInt(e.target.getAttribute("data-socio"));
            e.stopPropagation();
            notificationsPanel.classList.remove("active");
            
            if (window.JuntappPayment) {
              window.JuntappPayment.openCheckout(socioId);
            }
            return;
          }

          if (!n.read) {
            await db.markNotificationRead(n.id);
            this.render();
          }
        });

        notificationsList.appendChild(item);
      });
    }
  },

  async addNotification(noti) {
    const newNoti = await db.addNotification(noti);
    
    // Refresh inbox
    this.render();

    // Trigger local push notification popup
    if (newNoti) {
      this.showToast(newNoti);
      this.playAudioChime();
    }
  },

  getIconForType(type) {
    switch (type) {
      case "asamblea": return "📢";
      case "votacion": return "🗳️";
      case "cuota": return "💵";
      case "seguridad": return "🚨";
      default: return "🔔";
    }
  },

  showToast(noti) {
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = `push-toast type-${noti.type}`;
    
    toast.innerHTML = `
      <div class="toast-header-bar">
        <span class="toast-app-name">🔔 JuntAPP en Vivo</span>
        <button class="toast-close" aria-label="Cerrar">&times;</button>
      </div>
      <div class="toast-body">
        <div class="toast-icon">${this.getIconForType(noti.type)}</div>
        <div class="toast-content-wrapper">
          <strong class="toast-title">${noti.title}</strong>
          <p class="toast-text">${noti.message}</p>
          ${noti.action === "pay-cuota" ? `
            <button class="btn btn-primary btn-xs toast-btn" id="toast-action-pay">Pagar de Forma Segura</button>
          ` : ""}
        </div>
      </div>
    `;

    toast.querySelector(".toast-close").addEventListener("click", (e) => {
      e.stopPropagation();
      this.dismissToast(toast);
    });

    const actBtn = toast.querySelector(".toast-btn");
    if (actBtn) {
      actBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.dismissToast(toast);
        if (window.JuntappPayment) {
          window.JuntappPayment.openCheckout(noti.targetSocioId || noti.target_socio_id || 4);
        }
      });
    }

    const dismissTimeout = setTimeout(() => {
      this.dismissToast(toast);
    }, 7000);

    toast.addEventListener("click", async () => {
      clearTimeout(dismissTimeout);
      this.dismissToast(toast);
      await db.markNotificationRead(noti.id);
      this.render();
    });

    toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add("visible"), 50);
  },

  dismissToast(toast) {
    toast.classList.remove("visible");
    toast.classList.add("dismissing");
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 400);
  },

  playAudioChime() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
      gain1.gain.setValueAtTime(0.06, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12);
      gain2.gain.setValueAtTime(0, ctx.currentTime);
      gain2.gain.setValueAtTime(0.06, ctx.currentTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.3);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.55);
    } catch (err) {
      console.warn("Chime playback failed", err);
    }
  },

  startRealTimeSimulator() {
    // Fire a realistic push 15s after load
    setTimeout(() => {
      const randomBase = REALTIME_POOL[Math.floor(Math.random() * REALTIME_POOL.length)];
      this.addNotification({
        type: randomBase.type,
        title: randomBase.title,
        message: randomBase.message
      });
    }, 15000);

    // Fire every 45s
    setInterval(() => {
      const randomBase = REALTIME_POOL[Math.floor(Math.random() * REALTIME_POOL.length)];
      this.addNotification({
        type: randomBase.type,
        title: randomBase.title,
        message: randomBase.message
      });
    }, 45000);
  },

  // Helper helper
  urlB64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
};
