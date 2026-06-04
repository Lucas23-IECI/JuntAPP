/* ==========================================================================
   JuntAPP Dashboard Module (Async Database Version)
   ========================================================================== */

import { db } from "../db.js";
import { utils } from "../utils.js";

const dashBalanceVal = document.getElementById("dashBalance");
const dashSociosCountVal = document.getElementById("dashSociosCount");
const dashSocioTrendVal = document.getElementById("dashSocioTrend");
const dashVotacionStatusVal = document.getElementById("dashVotacionStatus");
const announcementsPreviewContainer = document.getElementById("announcementsPreviewContainer");

export const dashboardModule = {
  async render() {
    try {
      const txs = await db.getTransactions();
      const socios = await db.getSocios();
      const polls = await db.getPolls();
      const anns = await db.getAnnouncements();

      // 1. Calculate balance
      let balance = 0;
      txs.forEach(t => {
        const amt = parseFloat(t.amount);
        balance += t.type === "ingreso" ? amt : -amt;
      });

      // 2. Update widget text
      if (dashBalanceVal) dashBalanceVal.textContent = utils.formatCLP(balance);
      if (dashSociosCountVal) dashSociosCountVal.textContent = socios.length;

      // 3. Paid cuotas ratio
      const paidCount = socios.filter(s => s.cuotaStatus === "al_dia").length;
      if (dashSocioTrendVal) dashSocioTrendVal.textContent = `${paidCount} al día con su cuota`;

      // 4. Active poll voting state
      const activePoll = polls.find(p => p.active === true) || { voted: false };
      if (dashVotacionStatusVal) {
        if (activePoll.voted) {
          dashVotacionStatusVal.textContent = "✔ Voto emitido";
          dashVotacionStatusVal.className = "stat-trend success";
        } else {
          dashVotacionStatusVal.textContent = "Pendiente de tu voto";
          dashVotacionStatusVal.className = "stat-trend accent";
        }
      }

      // 5. Render top 2 announcements preview
      if (announcementsPreviewContainer) {
        announcementsPreviewContainer.innerHTML = "";
        if (anns.length === 0) {
          announcementsPreviewContainer.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 24px 16px; color: var(--text-tertiary);">
              <span style="font-size: 2rem; display: block; margin-bottom: 8px;">📢</span>
              <strong style="color: var(--text-secondary); font-size: 0.95rem;">No hay anuncios recientes</strong>
              <p style="font-size: 0.85rem; margin-top: 4px;">Los comunicados oficiales aparecerán aquí.</p>
            </div>
          `;
        } else {
          anns.slice(0, 2).forEach(ann => {
            const item = document.createElement("div");
            item.className = "announcement-preview-item";
            item.innerHTML = `
              <div class="ann-preview-header">
                <span class="announcement-cat-badge ${ann.category}">${ann.category.toUpperCase()}</span>
                <span class="announcement-date">${utils.formatDate(ann.date)}</span>
              </div>
              <h4 class="ann-preview-title">${ann.title}</h4>
              <p style="font-size:0.95rem; color: var(--text-secondary); margin-top:4px; display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${ann.content}</p>
            `;
            
            item.addEventListener("click", () => {
              window.history.pushState({ view: "comunicaciones" }, "", "/comunicaciones");
              window.dispatchEvent(new PopStateEvent("popstate"));
            });
            announcementsPreviewContainer.appendChild(item);
          });
        }
      }
    } catch (err) {
      console.error("Dashboard render failed:", err);
    }
  }
};
