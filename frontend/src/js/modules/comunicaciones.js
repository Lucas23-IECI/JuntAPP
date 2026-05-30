/* ==========================================================================
   JuntAPP Comunicaciones Module (Async Database Version)
   ========================================================================== */

import { db } from "../db.js";
import { utils } from "../utils.js";

const announcementsRosterContainer = document.getElementById("announcementsRosterContainer");
const openAddAnnouncementModalBtn = document.getElementById("openAddAnnouncementModalBtn");
const addAnnouncementModal = document.getElementById("addAnnouncementModal");
const addAnnouncementForm = document.getElementById("addAnnouncementForm");

export const comunicacionesModule = {
  init() {
    if (openAddAnnouncementModalBtn) {
      openAddAnnouncementModalBtn.addEventListener("click", () => {
        addAnnouncementModal.classList.add("active");
      });
    }

    // Warn on unsaved changes
    let formDirty = false;
    if (addAnnouncementForm) {
      const inputFields = addAnnouncementForm.querySelectorAll("input, textarea, select");
      
      inputFields.forEach(input => {
        input.addEventListener("input", () => {
          formDirty = true;
        });
      });

      // Handle close modal button
      const closeBtn = addAnnouncementModal.querySelector("[data-close-modal]");
      if (closeBtn) {
        closeBtn.addEventListener("click", (e) => {
          if (formDirty) {
            if (!confirm("Tiene cambios sin guardar en su anuncio. ¿Desea descartarlos?")) {
              e.stopPropagation();
              return;
            }
          }
          formDirty = false;
          addAnnouncementForm.reset();
          addAnnouncementModal.classList.remove("active");
        });
      }

      // Submit announcement
      addAnnouncementForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const category = document.getElementById("annCategory").value;
        const title = document.getElementById("annTitle").value.trim();
        const content = document.getElementById("annContent").value.trim();

        try {
          await db.addAnnouncement({
            category,
            title,
            content,
            author: "Directiva JuntAPP"
          });

          formDirty = false;
          addAnnouncementForm.reset();
          addAnnouncementModal.classList.remove("active");
          
          await this.render();
          alert("¡Comunicado oficial publicado con éxito!");
        } catch (err) {
          console.error("Failed to add announcement:", err);
          alert("Error al publicar el comunicado.");
        }
      });
    }

    window.deleteAnnouncement = (id) => this.delete(id);
  },

  async render() {
    try {
      const list = await db.getAnnouncements();
      if (!announcementsRosterContainer) return;
      announcementsRosterContainer.innerHTML = "";

      if (list.length === 0) {
        announcementsRosterContainer.innerHTML = `
          <div class="empty-state shadow-box" style="grid-column: 1/-1; text-align: center; padding: 60px 40px; background-color: var(--bg-card); border: 1.5px solid var(--border); border-radius: var(--radius-lg); color: var(--text-tertiary);">
            <div style="font-size: 3.5rem; margin-bottom: 16px;">📢</div>
            <h3 style="font-weight: 700; color: var(--text); font-size: 1.3rem;">No hay anuncios oficiales publicados</h3>
            <p style="margin-top: 8px; font-size: 0.95rem; color: var(--text-secondary);">Los comunicados de la directiva aparecerán aquí de forma inmediata.</p>
          </div>
        `;
        return;
      }

      list.forEach(ann => {
        const card = document.createElement("div");
        card.className = "announcement-card";
        
        card.innerHTML = `
          <div class="announcement-header">
            <div class="announcement-meta-left">
              <span class="announcement-cat-badge ${ann.category}">${ann.category.toUpperCase()}</span>
              <span class="announcement-date">Publicado el ${utils.formatDate(ann.date)}</span>
            </div>
            <span class="announcement-author">Escrito por: ${ann.author}</span>
          </div>
          <h3 class="announcement-title"><strong>${ann.title}</strong></h3>
          <p class="announcement-body">${ann.content}</p>
          
          <div class="socio-actions show-for-admin" style="margin-top: 10px; border-top: 1.5px solid var(--border); padding-top: 14px;">
            <button class="btn btn-sm btn-secondary" onclick="deleteAnnouncement('${ann.id}')" style="border-color:var(--accent); color:var(--accent);">
              Eliminar Publicación
            </button>
          </div>
        `;
        announcementsRosterContainer.appendChild(card);
      });
    } catch (err) {
      console.error("Failed to render announcements:", err);
    }
  },

  async delete(id) {
    if (confirm("¿Desea eliminar de forma permanente este comunicado oficial?")) {
      try {
        await db.deleteAnnouncement(id);
        await this.render();
      } catch (err) {
        console.error("Failed to delete announcement:", err);
        alert("Error al eliminar el comunicado.");
      }
    }
  }
};
