/* ==========================================================================
   JuntAPP Votaciones Module (Async Database Version)
   ========================================================================== */

import { db } from "../db.js";

const activePollTitle = document.getElementById("activePollTitle");
const activePollDesc = document.getElementById("activePollDesc");
const activePollOptions = document.getElementById("activePollOptions");
const votingForm = document.getElementById("votingForm");
const submitVoteBtn = document.getElementById("submitVoteBtn");
const voteSuccessMessage = document.getElementById("voteSuccessMessage");
const activePollResultsContainer = document.getElementById("activePollResultsContainer");
const resultsBarsList = document.getElementById("resultsBarsList");
const totalVotesMeta = document.getElementById("totalVotesMeta");
const pastPollsListContainer = document.getElementById("pastPollsListContainer");
const openAddPollModalBtn = document.getElementById("openAddPollModalBtn");

let activePollId = null;

export const votacionesModule = {
  init() {
    // Listen to voting form submit
    if (votingForm) {
      votingForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const selected = document.querySelector('input[name="pollOption"]:checked');
        if (!selected) {
          alert("Por favor, seleccione una opción para votar.");
          return;
        }
        
        const optId = selected.value;
        if (!activePollId) return;

        try {
          await db.vote(activePollId, optId);
          await this.render();
          
          // Show alert & sync layout
          alert("¡Voto registrado exitosamente!");
        } catch (err) {
          console.error("Failed to submit vote:", err);
          alert(err.message || "Error al registrar el voto.");
        }
      });
    }

    // Admin create new poll button
    const addPollModal = document.getElementById("addPollModal");
    const addPollForm = document.getElementById("addPollForm");
    
    if (openAddPollModalBtn && addPollModal) {
      openAddPollModalBtn.addEventListener("click", () => {
        addPollModal.classList.add("active");
      });
    }

    if (addPollForm && addPollModal) {
      const closeBtn = addPollModal.querySelector("[data-close-modal]");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          addPollForm.reset();
          addPollModal.classList.remove("active");
        });
      }

      addPollForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const title = document.getElementById("pollTitleInput").value.trim();
        const description = document.getElementById("pollDescInput").value.trim();
        const opt1 = document.getElementById("pollOpt1").value.trim();
        const opt2 = document.getElementById("pollOpt2").value.trim();
        const opt3 = document.getElementById("pollOpt3").value.trim();

        const options = [
          { text: opt1 },
          { text: opt2 }
        ];
        if (opt3) {
          options.push({ text: opt3 });
        }

        try {
          await db.addPoll({
            title,
            description,
            options
          });

          addPollForm.reset();
          addPollModal.classList.remove("active");
          
          // Refresh views
          await this.render();
          
          // Force layout state reload
          const activeNav = document.querySelector(".nav-item.active");
          if (activeNav) {
            window.dispatchEvent(new HashChangeEvent("hashchange"));
          }
          
          alert("¡Consulta ciudadana creada exitosamente!");
        } catch (err) {
          console.error("Failed to create poll:", err);
          alert("Error al crear la consulta: " + (err.message || ""));
        }
      });
    }
  },

  async render() {
    try {
      const polls = await db.getPolls();
      const active = polls.find(p => p.active === true);
      const past = polls.filter(p => p.active === false);
      
      if (active) {
        activePollId = active.id;
        if (activePollTitle) activePollTitle.textContent = active.title;
        if (activePollDesc) activePollDesc.textContent = active.description || active.desc;

        // Render options
        if (activePollOptions) {
          activePollOptions.innerHTML = "";
          active.options.forEach(opt => {
            const label = document.createElement("label");
            label.className = `poll-option-card`;
            label.innerHTML = `
              <input type="radio" name="pollOption" class="poll-option-input" value="${opt.id}" ${active.voted ? 'disabled' : ''} />
              <span class="poll-option-indicator"></span>
              <span class="poll-option-text">${opt.text}</span>
            `;
            
            if (!active.voted) {
              label.addEventListener("click", () => {
                document.querySelectorAll(".poll-option-card").forEach(c => c.classList.remove("selected"));
                label.classList.add("selected");
              });
            }
            
            activePollOptions.appendChild(label);
          });
        }

        // Toggle visibility of vote button / results panel
        if (active.voted) {
          if (submitVoteBtn) submitVoteBtn.style.display = "none";
          if (voteSuccessMessage) voteSuccessMessage.style.display = "block";
          if (activePollResultsContainer) activePollResultsContainer.style.display = "block";
          this.renderResults(active);
        } else {
          if (submitVoteBtn) submitVoteBtn.style.display = "inline-flex";
          if (voteSuccessMessage) voteSuccessMessage.style.display = "none";
          if (activePollResultsContainer) activePollResultsContainer.style.display = "none";
        }
      } else {
        // No active poll
        if (activePollTitle) activePollTitle.textContent = "No hay consultas activas en este momento";
        if (activePollDesc) activePollDesc.textContent = "Revisa el historial de consultas ciudadanas más abajo.";
        if (activePollOptions) activePollOptions.innerHTML = "";
        if (submitVoteBtn) submitVoteBtn.style.display = "none";
        if (voteSuccessMessage) voteSuccessMessage.style.display = "none";
        if (activePollResultsContainer) activePollResultsContainer.style.display = "none";
      }

      // Render past polls list
      this.renderPastPolls(past);
    } catch (err) {
      console.error("Votaciones render failed:", err);
    }
  },

  renderResults(active) {
    if (!resultsBarsList) return;
    resultsBarsList.innerHTML = "";
    
    const totalVotes = active.options.reduce((sum, opt) => sum + opt.votes, 0);
    if (totalVotesMeta) totalVotesMeta.textContent = `Total de participantes: ${totalVotes} vecinos`;

    active.options.forEach(opt => {
      const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
      
      const row = document.createElement("div");
      row.className = "result-bar-group";
      row.innerHTML = `
        <div class="result-bar-labels">
          <span>${opt.text}</span>
          <span style="font-variant-numeric: tabular-nums;">${percentage}% (${opt.votes} votos)</span>
        </div>
        <div class="result-bar-container">
          <div class="result-bar-fill" style="width: ${percentage}%"></div>
        </div>
      `;
      resultsBarsList.appendChild(row);
    });
  },

  renderPastPolls(past) {
    if (!pastPollsListContainer) return;
    pastPollsListContainer.innerHTML = "";
    
    past.forEach(p => {
      const row = document.createElement("div");
      row.className = "past-poll-row";
      row.innerHTML = `
        <div class="past-poll-info">
          <h4 class="past-poll-title">${p.title}</h4>
          <p class="past-poll-desc">${p.description || p.desc}</p>
          <span class="past-poll-winner">⭐ Ganador: ${p.winner || 'Finalizada'}</span>
        </div>
        <div class="date-badge">
          ${p.totalVotes || 0} votos totales
        </div>
      `;
      pastPollsListContainer.appendChild(row);
    });
  }
};
