/* ==========================================================================
   JuntAPP Entry Bootstrap Script
   Inicializa base de datos, enrutador, selectores de rol y componentes.
   ========================================================================== */

import { db } from "./db.js";
import { Router } from "./router.js";
import { authModule } from "./modules/auth.js";
import { dashboardModule } from "./modules/dashboard.js";
import { sociosModule } from "./modules/socios.js";
import { tesoreriaModule } from "./modules/tesoreria.js";
import { votacionesModule } from "./modules/votaciones.js";
import { comunicacionesModule } from "./modules/comunicaciones.js";
import { notificationsModule } from "./modules/notifications.js";
import { paymentModule } from "./modules/payment.js";

// DOM references
const bodyEl = document.body;
const themeToggleBtn = document.getElementById("themeToggle");
const themeToggleText = document.getElementById("themeToggleText");
const mobileThemeToggleBtn = document.getElementById("mobileThemeToggle");

// 1. Inicializar Base de Datos (mock fallback) & Auth
db.init();
authModule.init();

// 2. Definir Enrutador SPA
const routes = {
  inicio: () => {
    dashboardModule.render();
    notificationsModule.render();
  },
  socios: () => {
    sociosModule.render();
    notificationsModule.render();
  },
  tesoreria: () => {
    tesoreriaModule.render();
    notificationsModule.render();
  },
  votaciones: () => {
    votacionesModule.render();
    notificationsModule.render();
  },
  comunicaciones: () => {
    comunicacionesModule.render();
    notificationsModule.render();
  }
};

const router = new Router(routes);

// 3. Inicializar módulos individuales
notificationsModule.init();
paymentModule.init();
sociosModule.init();
tesoreriaModule.init();
votacionesModule.init();
comunicacionesModule.init();

// 4. Configurar Tema (Claro / Oscuro)
function applyTheme(theme) {
  if (theme === "dark") {
    bodyEl.setAttribute("data-theme", "dark");
    if (themeToggleText) themeToggleText.textContent = "Modo Claro";
  } else {
    bodyEl.removeAttribute("data-theme");
    if (themeToggleText) themeToggleText.textContent = "Modo Oscuro";
  }
}

function toggleTheme() {
  const current = db.getTheme();
  const next = current === "light" ? "dark" : "light";
  db.saveTheme(next);
  applyTheme(next);
}

themeToggleBtn.addEventListener("click", toggleTheme);
mobileThemeToggleBtn.addEventListener("click", toggleTheme);

// Aplicar tema inicial
applyTheme(db.getTheme());

// 6. Cierre general de modales (clics en data-close-modal y fondos)
document.querySelectorAll("[data-close-modal]").forEach(btn => {
  btn.addEventListener("click", (e) => {
    const modal = e.target.closest(".modal");
    if (modal) modal.classList.remove("active");
  });
});

window.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal")) {
    e.target.classList.remove("active");
  }
});

// 7. Arrancar enrutador
router.start();

// 8. Advertencia de Cambios sin Guardar (Vercel Guidelines - beforeunload)
const formsAreDirty = {
  addSocioForm: false,
  addTransactionForm: false,
  addAnnouncementForm: false
};

// Escucha cambios en inputs para marcar formulario como modificado
document.getElementById("addSocioForm").addEventListener("input", () => {
  formsAreDirty.addSocioForm = true;
});
document.getElementById("addTransactionForm").addEventListener("input", () => {
  formsAreDirty.addTransactionForm = true;
});
document.getElementById("addAnnouncementForm").addEventListener("input", () => {
  formsAreDirty.addAnnouncementForm = true;
});

// Resetea estado al enviar el formulario
document.getElementById("addSocioForm").addEventListener("submit", () => {
  formsAreDirty.addSocioForm = false;
});
document.getElementById("addTransactionForm").addEventListener("submit", () => {
  formsAreDirty.addTransactionForm = false;
});
document.getElementById("addAnnouncementForm").addEventListener("submit", () => {
  formsAreDirty.addAnnouncementForm = false;
});

// Resetea estado al cerrar los modales
document.querySelectorAll(".modal").forEach(modal => {
  const form = modal.querySelector("form");
  if (!form) return;
  
  const resetFormDirty = () => {
    formsAreDirty[form.id] = false;
  };
  
  modal.querySelectorAll("[data-close-modal], .btn-ghost").forEach(btn => {
    btn.addEventListener("click", resetFormDirty);
  });
});

window.addEventListener("beforeunload", (e) => {
  const isDirty = Object.values(formsAreDirty).some(v => v === true);
  if (isDirty) {
    e.preventDefault();
    e.returnValue = "Tiene cambios sin guardar en un formulario. ¿Realmente desea salir?";
    return e.returnValue;
  }
});
