/* ==========================================================================
   JuntAPP Socios Module (Async Database & Role-Segregated Version)
   ========================================================================== */

import { db } from "../db.js";
import { utils } from "../utils.js";

const sociosRosterContainer = document.getElementById("sociosRosterContainer");
const socioSearchInput = document.getElementById("socioSearchInput");
const rosterSocioCountVal = document.getElementById("rosterSocioCount");
const addSocioForm = document.getElementById("addSocioForm");
const addSocioModal = document.getElementById("addSocioModal");
const openAddSocioModalBtn = document.getElementById("openAddSocioModalBtn");
const socioRutInput = document.getElementById("socioRut");

export const sociosModule = {
  init() {
    // Interactive search
    if (socioSearchInput) {
      socioSearchInput.addEventListener("input", () => this.render());
    }

    // Open add socio modal
    if (openAddSocioModalBtn) {
      openAddSocioModalBtn.addEventListener("click", () => {
        addSocioModal.classList.add("active");
      });
    }

    // Dynamic RUT formatting & validation
    if (socioRutInput) {
      socioRutInput.addEventListener("input", (e) => {
        let rawVal = e.target.value;
        let clean = utils.cleanRUT(rawVal);
        let formatted = utils.formatRUT(clean);
        e.target.value = formatted;

        if (clean.length >= 8) {
          const isValid = utils.validateRUT(clean);
          if (isValid) {
            socioRutInput.style.borderColor = "var(--success)";
            socioRutInput.setCustomValidity("");
          } else {
            socioRutInput.style.borderColor = "var(--accent)";
            socioRutInput.setCustomValidity("RUT inválido (Revise el dígito verificador)");
          }
        } else {
          socioRutInput.style.borderColor = "";
          socioRutInput.setCustomValidity("");
        }
      });
    }

    // Add new socio submit (Dirigente only)
    if (addSocioForm) {
      addSocioForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const name = document.getElementById("socioName").value.trim();
        const rut = socioRutInput.value.trim();
        const address = document.getElementById("socioAddress").value.trim();
        const phone = document.getElementById("socioPhone").value.trim();
        const email = document.getElementById("socioEmail").value.trim();
        const cuotaStatus = document.getElementById("socioCuotaStatus").value;

        // Double check RUT
        if (!utils.validateRUT(utils.cleanRUT(rut))) {
          alert("El RUT ingresado no es válido. Por favor verifique el dígito verificador.");
          socioRutInput.focus();
          return;
        }

        try {
          await db.addSocio({
            name,
            rut: utils.cleanRUT(rut),
            address,
            phone,
            email,
            cuotaStatus
          });

          addSocioForm.reset();
          socioRutInput.style.borderColor = "";
          addSocioModal.classList.remove("active");
          
          await this.render();
          alert(`¡Socio ${name} inscrito con éxito en el padrón!`);
        } catch (err) {
          console.error("Failed to add socio:", err);
          alert("Error al inscribir el nuevo socio.");
        }
      });
    }

    // Expose global callback hooks for inline HTML triggers
    window.toggleSocioPayment = (id) => this.togglePayment(id);
    window.deleteSocio = (id) => this.delete(id);
  },

  async render() {
    try {
      if (!sociosRosterContainer) return;
      
      const currentUser = await db.getCurrentUser();
      const isAdmin = currentUser && currentUser.role === "dirigente";

      if (!isAdmin) {
        // ------------------------------------------------------------------
        // RENDER VECINO VIEW (Strict Privacy & Custom Contact Hub)
        // ------------------------------------------------------------------
        
        // Hide Admin elements
        const filtersCard = document.querySelector(".filters-card");
        if (filtersCard) filtersCard.style.display = "none";
        
        const openAddSocioBtn = document.getElementById("openAddSocioModalBtn");
        if (openAddSocioBtn) openAddSocioBtn.style.display = "none";

        const myProfile = currentUser || {
          name: "Vecino Sin Registro",
          rut: "--",
          address: "Sin dirección",
          phone: "--",
          email: "--",
          cuota_status: "pendiente"
        };

        const isAlDia = myProfile.cuota_status === "al_dia" || myProfile.cuotaStatus === "al_dia";

        sociosRosterContainer.style.display = "grid";
        sociosRosterContainer.style.gridTemplateColumns = "repeat(auto-fit, minmax(320px, 1fr))";
        sociosRosterContainer.style.gap = "32px";
        sociosRosterContainer.style.width = "100%";

        sociosRosterContainer.innerHTML = `
          <!-- Left Panel: My Account Details -->
          <div class="card shadow-box" style="padding: 28px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1.5px solid var(--border); display: flex; flex-direction: column;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
              <div>
                <span class="view-subtitle" style="font-size: 0.8rem;">Tu Ficha Vecinal</span>
                <h3 class="card-title" style="font-size: 1.4rem; margin-top: 4px;">Mis Datos de Socio</h3>
              </div>
              <span class="status-badge ${isAlDia ? 'al-dia' : 'pendiente'}">${isAlDia ? 'Al Día' : 'Pendiente'}</span>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
                <span style="color: var(--text-secondary); font-weight: 500;">Nombre:</span>
                <strong style="color: var(--text);">${myProfile.name}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
                <span style="color: var(--text-secondary); font-weight: 500;">RUT:</span>
                <strong style="color: var(--text); font-variant-numeric: tabular-nums;">${utils.formatRUT(myProfile.rut)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
                <span style="color: var(--text-secondary); font-weight: 500;">Dirección:</span>
                <strong style="color: var(--text);">${myProfile.address}</strong>
              </div>
            </div>

            <!-- Form to update contact details -->
            <form id="updateContactForm" style="display: flex; flex-direction: column; gap: 12px; border-top: 1.5px dashed var(--border); padding-top: 20px;">
              <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text);">Actualizar Datos de Contacto</h4>
              <div class="form-group">
                <label class="form-label" for="myPhone" style="font-size: 0.85rem;">Teléfono de Contacto</label>
                <input type="tel" id="myPhone" class="form-input" value="${myProfile.phone || ''}" placeholder="Ej: +56 9 8765 4321" />
              </div>
              <div class="form-group">
                <label class="form-label" for="myEmail" style="font-size: 0.85rem;">Correo Electrónico</label>
                <input type="email" id="myEmail" class="form-input" value="${myProfile.email || ''}" placeholder="Ej: vecino@correo.cl" required />
              </div>
              <button type="submit" class="btn btn-primary btn-sm" style="width: 100%; margin-top: 8px;">Guardar Cambios de Contacto</button>
            </form>
          </div>

          <!-- Right Panel: Community Board (Directiva) Directory -->
          <div class="card shadow-box" style="padding: 28px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1.5px solid var(--border);">
            <div style="margin-bottom: 20px;">
              <span class="view-subtitle" style="font-size: 0.8rem;">Directiva Electa 2025-2027</span>
              <h3 class="card-title" style="font-size: 1.4rem; margin-top: 4px;">Contacto de Directiva</h3>
            </div>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 20px; line-height: 1.5;">
              Comunícate con la directiva para postular a beneficios comunales, solicitar certificados de residencia o resolver dudas sobre gastos.
            </p>

            <div style="display: flex; flex-direction: column; gap: 14px;">
              <!-- Presidente -->
              <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--primary-subtle); border-radius: var(--radius-sm); border: 1px solid var(--border);">
                <div style="width: 38px; height: 38px; background: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem;">L</div>
                <div style="flex-grow: 1;">
                  <strong style="font-size: 0.9rem; color: var(--text); display: block;">Lucía Gómez Parra</strong>
                  <span style="font-size: 0.75rem; color: var(--text-secondary);">Presidenta de la Junta</span>
                </div>
                <a href="https://wa.me/56921098765" target="_blank" class="btn btn-secondary btn-sm" style="min-height:36px; padding:6px 12px; font-size:0.8rem; margin:0;">WhatsApp</a>
              </div>

              <!-- Secretario -->
              <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--primary-subtle); border-radius: var(--radius-sm); border: 1px solid var(--border);">
                <div style="width: 38px; height: 38px; background: var(--primary-light); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem;">J</div>
                <div style="flex-grow: 1;">
                  <strong style="font-size: 0.9rem; color: var(--text); display: block;">Jorge Riquelme Sepúlveda</strong>
                  <span style="font-size: 0.75rem; color: var(--text-secondary);">Secretario</span>
                </div>
                <a href="mailto:jorge.riquelme@correo.cl" class="btn btn-secondary btn-sm" style="min-height:36px; padding:6px 12px; font-size:0.8rem; margin:0;">Email</a>
              </div>

              <!-- Tesorero -->
              <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--primary-subtle); border-radius: var(--radius-sm); border: 1px solid var(--border);">
                <div style="width: 38px; height: 38px; background: var(--primary-light); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem;">P</div>
                <div style="flex-grow: 1;">
                  <strong style="font-size: 0.9rem; color: var(--text); display: block;">Pedro Soto Contreras</strong>
                  <span style="font-size: 0.75rem; color: var(--text-secondary);">Tesorero</span>
                </div>
                <a href="https://wa.me/56976543210" target="_blank" class="btn btn-secondary btn-sm" style="min-height:36px; padding:6px 12px; font-size:0.8rem; margin:0;">WhatsApp</a>
              </div>
            </div>
          </div>
        `;

        // Listen for Vecino's profile updates
        const updateContactForm = document.getElementById("updateContactForm");
        if (updateContactForm) {
          updateContactForm.addEventListener("submit", async (ev) => {
            ev.preventDefault();
            const phone = document.getElementById("myPhone").value.trim();
            const email = document.getElementById("myEmail").value.trim();

            try {
              await db.updateSocioContact(currentUser.id, phone, email);
              alert("¡Datos de contacto actualizados correctamente!");
              await this.render();
            } catch (err) {
              console.error("Failed to update contact info:", err);
              alert("Error al actualizar la información de contacto.");
            }
          });
        }

      } else {
        // ------------------------------------------------------------------
        // RENDER DIRIGENTE VIEW (Full Admin Member Roster Management)
        // ------------------------------------------------------------------
        
        // Restore filters and add socio button
        const filtersCard = document.querySelector(".filters-card");
        if (filtersCard) filtersCard.style.display = "flex";
        
        const openAddSocioBtn = document.getElementById("openAddSocioModalBtn");
        if (openAddSocioBtn) openAddSocioBtn.style.display = "inline-flex";

        // Reset grid structure to fit roster
        sociosRosterContainer.style.display = "grid";
        sociosRosterContainer.style.gridTemplateColumns = "repeat(auto-fill, minmax(280px, 1fr))";
        sociosRosterContainer.style.gap = "24px";

        const list = await db.getSocios();
        const searchVal = socioSearchInput ? socioSearchInput.value.toLowerCase().trim() : "";
        sociosRosterContainer.innerHTML = "";

        const filtered = list.filter(s => {
          return s.name.toLowerCase().includes(searchVal) ||
                 s.rut.toLowerCase().includes(searchVal) ||
                 s.address.toLowerCase().includes(searchVal);
        });

        if (rosterSocioCountVal) {
          rosterSocioCountVal.textContent = `${filtered.length} ${filtered.length === 1 ? 'vecino' : 'vecinos'}`;
        }

        if (filtered.length === 0) {
          sociosRosterContainer.innerHTML = `
            <div class="split-card full-width" style="grid-column: 1/-1; text-align: center; padding: 40px; border-style: dashed; background: var(--bg-card); border-radius: var(--radius-md);">
              <p style="font-size: 1.15rem; color: var(--text-secondary);">No se encontraron socios con el criterio ingresado.</p>
            </div>
          `;
          return;
        }

        filtered.forEach(s => {
          const card = document.createElement("div");
          card.className = "socio-card";
          
          const isAlDia = s.cuotaStatus === "al_dia" || s.cuota_status === "al_dia";
          const statusText = isAlDia ? "Al Día" : "Pendiente";
          const statusClass = isAlDia ? "al-dia" : "pendiente";

          card.innerHTML = `
            <div class="socio-header">
              <div class="socio-info">
                <h4 class="socio-name"><strong>${s.name}</strong></h4>
                <span class="socio-rut">RUT: ${utils.formatRUT(s.rut)}</span>
              </div>
              <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            <div class="socio-details">
              <div class="socio-detail-item">
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                <span>${s.address}</span>
              </div>
              ${s.phone ? `
              <div class="socio-detail-item">
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <span>${s.phone}</span>
              </div>` : ""}
              ${s.email ? `
              <div class="socio-detail-item">
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <span>${s.email}</span>
              </div>` : ""}
            </div>
            <div class="socio-pay-actions" style="margin-top: 8px; display: flex; gap: 8px;">
              ${!isAlDia ? `
                <button class="btn btn-xs btn-primary" onclick="window.JuntappPayment.openCheckout('${s.id}')" style="width: 100%; justify-content: center;">
                  💸 Pagar Cuota Online
                </button>
              ` : ''}
            </div>
            <div class="socio-actions show-for-admin" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border);">
              <button class="btn btn-xs btn-ghost" onclick="toggleSocioPayment('${s.id}')">
                Cambiar Pago (Mock)
              </button>
              <button class="btn btn-xs btn-secondary" onclick="deleteSocio('${s.id}')" style="border-color:var(--accent); color:var(--accent);">
                Eliminar
              </button>
            </div>
          `;
          sociosRosterContainer.appendChild(card);
        });
      }
    } catch (err) {
      console.error("Failed to render socios list:", err);
    }
  },

  async togglePayment(id) {
    try {
      const list = await db.getSocios();
      const socio = list.find(s => s.id.toString() === id.toString());
      if (socio) {
        const nextStatus = (socio.cuotaStatus === "al_dia" || socio.cuota_status === "al_dia") ? "pendiente" : "al_dia";
        await db.updateSocioStatus(id, nextStatus);
        await this.render();
      }
    } catch (err) {
      console.error("Failed to toggle payment status:", err);
    }
  },

  async delete(id) {
    if (confirm("¿Está seguro de que desea eliminar a este socio del padrón?")) {
      try {
        await db.deleteSocio(id);
        await this.render();
      } catch (err) {
        console.error("Failed to delete socio:", err);
      }
    }
  }
};
