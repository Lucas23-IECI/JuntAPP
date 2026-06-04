/* ==========================================================================
   JuntAPP Authentication & Permissions Module
   ========================================================================== */

import { db } from "../db.js";
import { utils } from "../utils.js";
import { notificationsModule } from "./notifications.js";

// DOM References
const authOverlay = document.getElementById("authOverlay");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const loginEmailInput = document.getElementById("loginEmail");
const loginPasswordInput = document.getElementById("loginPassword");
const loginErrorMsg = document.getElementById("loginErrorMsg");

const regNameInput = document.getElementById("regName");
const regRutInput = document.getElementById("regRut");
const regRutIcon = document.getElementById("regRutIcon");
const regAddressInput = document.getElementById("regAddress");
const regPhoneInput = document.getElementById("regPhone");
const regEmailInput = document.getElementById("regEmail");
const regPasswordInput = document.getElementById("regPassword");
const registerErrorMsg = document.getElementById("registerErrorMsg");

const tabLoginBtn = document.getElementById("tabLoginBtn");
const tabRegisterBtn = document.getElementById("tabRegisterBtn");

const connectionModeText = document.getElementById("connectionModeText");
const badgeDot = document.getElementById("badgeDot");

const userProfileName = document.getElementById("userProfileName");
const userProfileRole = document.getElementById("userProfileRole");
const userProfileRut = document.getElementById("userProfileRut");
const userAvatar = document.getElementById("userAvatar");
const btnLogoutBtn = document.getElementById("btnLogoutBtn");

export const authModule = {
  currentUser: null,

  async init() {
    // 1. Configure Tabs switching
    tabLoginBtn.addEventListener("click", () => this.switchTab("login"));
    tabRegisterBtn.addEventListener("click", () => this.switchTab("register"));

    // 1b. Bind landing page open buttons
    document.querySelectorAll(".btn-open-auth").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");
        authOverlay.classList.add("active");
        this.switchTab(tab);
        
        // Cierra menu movil si esta abierto
        const mobileMenu = document.getElementById("mobileNavMenu");
        const toggleBtn = document.getElementById("mobileNavToggleBtn");
        if (mobileMenu) mobileMenu.classList.remove("open");
        if (toggleBtn) toggleBtn.classList.remove("open");
      });
    });

    // 1c. Bind close button inside auth card
    const closeAuthBtn = document.getElementById("closeAuthBtn");
    if (closeAuthBtn) {
      closeAuthBtn.addEventListener("click", () => {
        authOverlay.classList.remove("active");
      });
    }

    // 1d. Click outside auth card to close
    authOverlay.addEventListener("click", (e) => {
      if (e.target === authOverlay) {
        authOverlay.classList.remove("active");
      }
    });

    // 2. Chilean RUT real-time validation in register form
    regRutInput.addEventListener("input", (e) => {
      const val = e.target.value;
      const clean = utils.cleanRUT(val);
      
      // Format dynamically
      if (val.length > 0) {
        regRutInput.value = utils.formatRUT(clean);
      }

      // Check validation
      if (clean.length >= 8) {
        const isValid = utils.validateRUT(clean);
        if (isValid) {
          regRutIcon.textContent = "✔";
          regRutIcon.style.color = "var(--success)";
          document.getElementById("regRutHint").style.display = "none";
        } else {
          regRutIcon.textContent = "✗";
          regRutIcon.style.color = "var(--accent)";
          document.getElementById("regRutHint").style.display = "block";
          document.getElementById("regRutHint").textContent = "RUT inválido (dígito verificador incorrecto)";
        }
      } else {
        regRutIcon.textContent = "";
        document.getElementById("regRutHint").style.display = "block";
        document.getElementById("regRutHint").textContent = "Mínimo 8 dígitos (ej: 12.345.678-9)";
      }
    });

    // 3. Login form submission
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      loginErrorMsg.textContent = "";
      
      const emailOrRut = loginEmailInput.value.trim();
      const password = loginPasswordInput.value.trim();

      try {
        const user = await db.login(emailOrRut, password);
        this.setSession(user);
        notificationsModule.addNotification({
          type: "seguridad",
          title: "Inicio de Sesión",
          message: `Hola ${user.name}, bienvenido a JuntAPP.`
        });
      } catch (err) {
        loginErrorMsg.textContent = err.message || "Error al iniciar sesión.";
      }
    });

    // 4. Register form submission
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      registerErrorMsg.textContent = "";

      const name = regNameInput.value.trim();
      const rut = regRutInput.value.trim();
      const address = regAddressInput.value.trim();
      const phone = regPhoneInput.value.trim();
      const email = regEmailInput.value.trim();
      const password = regPasswordInput.value.trim();

      // Check validation of RUT
      if (!utils.validateRUT(rut)) {
        registerErrorMsg.textContent = "Por favor, ingrese un RUT válido.";
        return;
      }

      if (password.length < 6) {
        registerErrorMsg.textContent = "La contraseña debe tener al menos 6 caracteres.";
        return;
      }

      try {
        await db.signUp(name, rut, address, phone, email, password);
        alert("¡Registro exitoso! Ya puedes iniciar sesión con tus credenciales.");
        registerForm.reset();
        regRutIcon.textContent = "";
        this.switchTab("login");
        loginEmailInput.value = email;
      } catch (err) {
        registerErrorMsg.textContent = err.message || "Error en el registro.";
      }
    });

    // 5. Logout Button
    btnLogoutBtn.addEventListener("click", async () => {
      await db.logout();
      this.clearSession();
    });

    // 6. Set Connection Badge
    if (db.isCloud()) {
      connectionModeText.textContent = "Modo Cloud (Supabase Active)";
      badgeDot.className = "badge-dot green";
    } else {
      connectionModeText.textContent = "Modo Local (Offline Sim)";
      badgeDot.className = "badge-dot orange";
    }

    // 7. Check if user is already logged in
    await this.checkAuthStatus();
  },

  async checkAuthStatus() {
    try {
      const user = await db.getCurrentUser();
      if (user) {
        this.setSession(user);
      } else {
        this.clearSession();
      }
    } catch (err) {
      console.error("Auth status check failed:", err);
      this.clearSession();
    }
  },

  switchTab(tab) {
    if (tab === "login") {
      tabLoginBtn.classList.add("active");
      tabRegisterBtn.classList.remove("active");
      loginForm.classList.add("active");
      registerForm.classList.remove("active");
    } else {
      tabRegisterBtn.classList.add("active");
      tabLoginBtn.classList.remove("active");
      registerForm.classList.add("active");
      loginForm.classList.remove("active");
    }
  },

  setSession(user) {
    this.currentUser = user;
    
    // Update UI profile widgets
    userProfileName.textContent = user.name;
    userProfileRole.textContent = user.role === "dirigente" ? "Dirigente (Administrador)" : "Socio / Vecino";
    userProfileRut.textContent = `RUT: ${utils.formatRUT(user.rut)}`;
    userAvatar.textContent = user.name.charAt(0).toUpperCase();

    // Set roles classes on body
    document.body.classList.remove("logged-out");
    authOverlay.classList.remove("active");

    if (user.role === "dirigente") {
      document.body.classList.add("role-dirigente");
      document.body.classList.remove("role-vecino");
    } else {
      document.body.classList.add("role-vecino");
      document.body.classList.remove("role-dirigente");
    }

    // Trigger router layout refreshes
    window.dispatchEvent(new PopStateEvent("popstate"));
  },

  clearSession() {
    this.currentUser = null;
    document.body.classList.add("logged-out");
    authOverlay.classList.remove("active");
    
    // Only redirect to / if we are on a private route (dashboard routes)
    const publicRoutes = ["", "/", "/home", "/caracteristicas", "/pricing", "/faq", "/sobre-nosotros", "/contacto"];
    if (!publicRoutes.includes(window.location.pathname)) {
      window.history.replaceState({}, "", "/");
    }
    
    loginEmailInput.value = "";
    loginPasswordInput.value = "";
    loginErrorMsg.textContent = "";

    registerForm.reset();
    regRutIcon.textContent = "";
    registerErrorMsg.textContent = "";

    this.switchTab("login");
  }
};
