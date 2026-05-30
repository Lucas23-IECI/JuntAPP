/* ==========================================================================
   JuntAPP Tesorería Module (Upgraded with Chart.js & Document Storage)
   ========================================================================== */

import { db } from "../db.js";
import { utils } from "../utils.js";

// DOM references
const tesBalanceVal = document.getElementById("tesBalanceVal");
const tesIncomeVal = document.getElementById("tesIncomeVal");
const tesExpenseVal = document.getElementById("tesExpenseVal");
const ledgerTableBody = document.getElementById("ledgerTableBody");

const cuotaProgressBarFill = document.getElementById("cuotaProgressBarFill");
const cuotaProgressText = document.getElementById("cuotaProgressText");
const myPaymentStatusBadge = document.getElementById("myPaymentStatusBadge");
const payCuotaBtn = document.getElementById("payCuotaBtn");
const sendCuotaRemindersBtn = document.getElementById("sendCuotaRemindersBtn");

const openReportModalBtn = document.getElementById("openReportModalBtn");
const reportModal = document.getElementById("reportModal");
const reportModalBody = document.getElementById("reportModalBody");

const openAddTransactionModalBtn = document.getElementById("openAddTransactionModalBtn");
const addTransactionModal = document.getElementById("addTransactionModal");
const addTransactionForm = document.getElementById("addTransactionForm");

const pdfUploadInput = document.getElementById("pdfUploadInput");

// Chart.js instances references
let expenseChartInstance = null;
let cashflowChartInstance = null;

export const tesoreriaModule = {
  async init() {
    // Open add transaction modal
    if (openAddTransactionModalBtn) {
      openAddTransactionModalBtn.addEventListener("click", () => {
        document.getElementById("txDate").value = new Date().toISOString().split('T')[0];
        addTransactionModal.classList.add("active");
      });
    }

    // Submit transaction form
    if (addTransactionForm) {
      addTransactionForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const type = document.getElementById("txType").value;
        const amount = parseFloat(document.getElementById("txAmount").value);
        const desc = document.getElementById("txDesc").value.trim();
        const date = document.getElementById("txDate").value;

        try {
          await db.addTransaction({
            type,
            amount,
            desc,
            date
          });

          addTransactionForm.reset();
          addTransactionModal.classList.remove("active");
          
          await this.render();
          alert("¡Movimiento de caja registrado exitosamente!");
        } catch (err) {
          console.error("Failed to add transaction:", err);
          alert("Error al registrar movimiento financiero.");
        }
      });
    }

    // Pay Member Fee button (Simulated for Luis Muñoz, ID 4)
    if (payCuotaBtn) {
      payCuotaBtn.addEventListener("click", () => {
        if (window.JuntappPayment) {
          window.JuntappPayment.openCheckout(4); // Luis Muñoz
        } else {
          alert("Cargando pasarela de pagos…");
        }
      });
    }

    // Send reminders button
    if (sendCuotaRemindersBtn) {
      sendCuotaRemindersBtn.addEventListener("click", async () => {
        const list = await db.getSocios();
        const pendingCount = list.filter(s => s.cuotaStatus === "pendiente").length;
        alert(`¡Avisos Enviados!: Se ha notificado a los ${pendingCount} socios con cuota pendiente.`);
      });
    }

    // Generate transparency report
    if (openReportModalBtn) {
      openReportModalBtn.addEventListener("click", () => {
        this.generateReport();
      });
    }

    // Document Upload Listener
    if (pdfUploadInput) {
      pdfUploadInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== "application/pdf") {
          alert("Por favor, suba únicamente archivos en formato PDF.");
          return;
        }

        if (file.size > 5 * 1024 * 1024) {
          alert("El tamaño máximo permitido es de 5 MB.");
          return;
        }

        try {
          await db.uploadDocument(file);
          alert(`¡Archivo "${file.name}" subido con éxito al repositorio de transparencia!`);
          this.renderDocuments();
        } catch (err) {
          console.error("Upload error:", err);
          alert("Error al subir el archivo.");
        }
      });
    }
  },

  async render() {
    const txs = await db.getTransactions();
    const socios = await db.getSocios();

    // 1. Calculate financial summaries
    let balance = 0;
    let income = 0;
    let expense = 0;
    
    txs.forEach(t => {
      const amt = parseFloat(t.amount);
      if (t.type === "ingreso") {
        income += amt;
        balance += amt;
      } else {
        expense += amt;
        balance -= amt;
      }
    });

    // 2. Render totals
    tesBalanceVal.textContent = utils.formatCLP(balance);
    tesIncomeVal.textContent = "+" + utils.formatCLP(income);
    tesExpenseVal.textContent = "-" + utils.formatCLP(expense);

    // 3. Render ledger list
    ledgerTableBody.innerHTML = "";
    const sortedTxs = [...txs].sort((a,b) => new Date(b.date) - new Date(a.date));

    sortedTxs.forEach(t => {
      const row = document.createElement("tr");
      const isIncome = t.type === "ingreso";
      
      row.innerHTML = `
        <td data-label="Fecha">${utils.formatDate(t.date)}</td>
        <td data-label="Tipo">
          <span class="ledger-type-badge ${t.type}">${t.type.toUpperCase()}</span>
        </td>
        <td data-label="Detalle">${t.description || t.desc}</td>
        <td data-label="Monto" class="text-right ledger-amount ${t.type}">
          ${isIncome ? "+" : "-"}${utils.formatCLP(t.amount)}
        </td>
      `;
      ledgerTableBody.appendChild(row);
    });

    // 4. Update cuotas progress bar
    const totalSocios = socios.length;
    const paidSocios = socios.filter(s => s.cuotaStatus === "al_dia").length;
    const percentage = totalSocios > 0 ? Math.round((paidSocios / totalSocios) * 100) : 0;
    
    cuotaProgressBarFill.style.width = `${percentage}%`;
    cuotaProgressText.textContent = `${paidSocios} de ${totalSocios} socios al día (${percentage}%)`;

    // 5. Update user payment status badge (Luis Muñoz, ID 4 fallback)
    const mySocio = socios.find(s => s.id.toString() === "4") || { cuotaStatus: "pendiente" };
    const isPaid = mySocio.cuotaStatus === "al_dia";
    
    if (isPaid) {
      myPaymentStatusBadge.className = "payment-status-badge paid";
      myPaymentStatusBadge.innerHTML = `<span>Tu cuota de Mayo 2026: <strong>✔ Al Día</strong></span>`;
      payCuotaBtn.style.display = "none";
    } else {
      myPaymentStatusBadge.className = "payment-status-badge outstanding";
      myPaymentStatusBadge.innerHTML = `<span>Tu cuota de Mayo 2026: <strong>Pendiente ($5.000 CLP)</strong></span>`;
      payCuotaBtn.style.display = "block";
      payCuotaBtn.disabled = false;
      payCuotaBtn.textContent = "Pagar Cuota con Webpay/Flow";
    }

    // 6. Render Document List
    this.renderDocuments();

    // 7. Render Charts
    this.renderCharts(txs);
  },

  async renderDocuments() {
    try {
      const docs = await db.getDocuments();
      const container = document.getElementById("documentGridContainer");
      if (!container) return;

      container.innerHTML = "";
      if (docs.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-tertiary); padding: 20px;">No hay documentos oficiales registrados.</div>`;
        return;
      }

      docs.forEach(doc => {
        const card = document.createElement("div");
        card.className = "document-card";
        
        const sizeMB = (doc.size / (1024 * 1024)).toFixed(2);
        
        // Dynamic delete buttons for admin
        const isAdmin = document.body.className === 'role-dirigente';

        card.innerHTML = `
          <div class="document-icon">📄</div>
          <div class="document-info">
            <h4 class="document-title" title="${doc.name}">${doc.name}</h4>
            <span class="document-meta">${doc.date} • ${sizeMB} MB</span>
          </div>
          <div class="document-actions">
            <a href="${doc.url}" download="${doc.name}" class="document-download-btn" title="Descargar PDF">
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </a>
            ${isAdmin ? `
              <button class="document-delete-btn" data-name="${doc.name}" title="Eliminar Documento">
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            ` : ""}
          </div>
        `;

        const delBtn = card.querySelector(".document-delete-btn");
        if (delBtn) {
          delBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (confirm(`¿Está seguro de eliminar el archivo "${doc.name}" del repositorio de transparencia?`)) {
              await db.deleteDocument(doc.name);
              this.renderDocuments();
            }
          });
        }

        container.appendChild(card);
      });
    } catch (err) {
      console.error("Failed to render transparency documents:", err);
    }
  },

  renderCharts(txs) {
    // 1. Classification of Expenses (Egresos)
    const egresos = txs.filter(t => t.type === "egreso");
    
    let catLuminarias = 0;
    let catMantencion = 0;
    let catEventos = 0;
    let catOtros = 0;

    egresos.forEach(t => {
      const desc = (t.description || t.desc || "").toLowerCase();
      const amt = parseFloat(t.amount);
      if (desc.includes("ampolleta") || desc.includes("led") || desc.includes("luminaria")) {
        catLuminarias += amt;
      } else if (desc.includes("llave") || desc.includes("cerradura") || desc.includes("reparación") || desc.includes("mantención") || desc.includes("limpieza") || desc.includes("desmalezado")) {
        catMantencion += amt;
      } else if (desc.includes("bingo") || desc.includes("evento") || desc.includes("niño") || desc.includes("almuerzo") || desc.includes("junta")) {
        catEventos += amt;
      } else {
        catOtros += amt;
      }
    });

    // Destroy existing Doughnut Chart to avoid overlap
    if (expenseChartInstance) {
      expenseChartInstance.destroy();
    }

    const doughnutCtx = document.getElementById('expenseChart');
    if (doughnutCtx) {
      const isDark = document.body.getAttribute("data-theme") === "dark";
      const textColors = isDark ? "#e2e8f0" : "#1e293b";
      const gridColors = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

      expenseChartInstance = new Chart(doughnutCtx, {
        type: 'doughnut',
        data: {
          labels: ['Luminarias', 'Mantenciones', 'Eventos/Beneficios', 'Otros'],
          datasets: [{
            data: [catLuminarias, catMantencion, catEventos, catOtros],
            backgroundColor: [
              'hsl(35, 90%, 50%)',   // Amber
              'hsl(210, 85%, 55%)',  // Sleek Blue
              'hsl(354, 70%, 46%)',  // Crimson Red
              'hsl(145, 63%, 42%)'   // Success Green
            ],
            borderColor: isDark ? '#202636' : '#ffffff',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: textColors,
                font: { family: 'Inter', size: 12, weight: 600 },
                padding: 14
              }
            }
          }
        }
      });
    }

    // 2. Income vs Expenses Monthly Cashflow
    // Group txs by Month (YYYY-MM)
    const flowGroups = {};
    txs.forEach(t => {
      const monthKey = t.date.substring(0, 7); // e.g. "2026-05"
      if (!flowGroups[monthKey]) {
        flowGroups[monthKey] = { income: 0, expense: 0 };
      }
      const amt = parseFloat(t.amount);
      if (t.type === "ingreso") {
        flowGroups[monthKey].income += amt;
      } else {
        flowGroups[monthKey].expense += amt;
      }
    });

    // Sort months
    const sortedMonths = Object.keys(flowGroups).sort();
    
    // Convert keys to friendly name labels (e.g. "2026-05" -> "Mayo")
    const monthLabels = sortedMonths.map(k => {
      const parts = k.split("-");
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
      const name = date.toLocaleString('es-ES', { month: 'short' });
      return name.charAt(0).toUpperCase() + name.slice(1);
    });

    const incomeData = sortedMonths.map(k => flowGroups[k].income);
    const expenseData = sortedMonths.map(k => flowGroups[k].expense);

    // Destroy existing Bar Chart to avoid overlap
    if (cashflowChartInstance) {
      cashflowChartInstance.destroy();
    }

    const barCtx = document.getElementById('cashflowChart');
    if (barCtx) {
      const isDark = document.body.getAttribute("data-theme") === "dark";
      const textColors = isDark ? "#e2e8f0" : "#1e293b";
      const gridColors = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

      cashflowChartInstance = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: monthLabels,
          datasets: [
            {
              label: 'Ingresos',
              data: incomeData,
              backgroundColor: 'hsl(145, 63%, 42%)', // Success Green
              borderRadius: 6
            },
            {
              label: 'Egresos',
              data: expenseData,
              backgroundColor: 'hsl(354, 70%, 46%)', // Crimson Red
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: textColors,
                font: { family: 'Inter', size: 12, weight: 600 }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: textColors, font: { family: 'Inter', size: 11 } }
            },
            y: {
              grid: { color: gridColors },
              ticks: { color: textColors, font: { family: 'Inter', size: 11 } }
            }
          }
        }
      });
    }
  },

  async generateReport() {
    const txs = await db.getTransactions();
    const dateObj = new Date();
    const monthName = dateObj.toLocaleString('es-ES', { month: 'long' });
    const yearNum = dateObj.getFullYear();
    
    const incomes = txs.filter(t => t.type === "ingreso");
    const expenses = txs.filter(t => t.type === "egreso");

    let totalIncome = incomes.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    let totalExpense = expenses.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    let balance = totalIncome - totalExpense;

    let incomeRowsHTML = incomes.map(t => `
      <div style="display:flex; justify-content:space-between; font-size:1.05rem; padding: 10px 0; border-bottom:1px solid var(--border)">
        <span>${t.description || t.desc} (${utils.formatDate(t.date)})</span>
        <span style="color:var(--success); font-weight:700; font-variant-numeric: tabular-nums;">+${utils.formatCLP(t.amount)}</span>
      </div>
    `).join("") || `<p style="font-size:0.95rem; color:var(--text-tertiary);">No hay ingresos registrados este mes.</p>`;

    let expenseRowsHTML = expenses.map(t => `
      <div style="display:flex; justify-content:space-between; font-size:1.05rem; padding: 10px 0; border-bottom:1px solid var(--border)">
        <span>${t.description || t.desc} (${utils.formatDate(t.date)})</span>
        <span style="color:var(--accent); font-weight:700; font-variant-numeric: tabular-nums;">-${utils.formatCLP(t.amount)}</span>
      </div>
    `).join("") || `<p style="font-size:0.95rem; color:var(--text-tertiary);">No hay egresos registrados este mes.</p>`;

    reportModalBody.innerHTML = `
      <div class="report-header">
        <h4 class="report-subtitle">JUNTA DE VECINOS VILLA LOS JARDINES</h4>
        <h2 class="view-title" style="font-size: 1.8rem; margin: 6px 0;">Balance de Cuentas Públicas</h2>
        <span class="date-badge">Período: ${monthName.toUpperCase()} ${yearNum}</span>
      </div>

      <div class="report-meta-grid">
        <div>
          <strong>Organización:</strong> Junta de Vecinos Villa Los Jardines<br>
          <strong>Personalidad Jurídica:</strong> SpA (Fase de Constitución)<br>
          <strong>Comuna:</strong> Antofagasta, Chile
        </div>
        <div>
          <strong>Generado el:</strong> ${new Date().toLocaleDateString('es-CL')}<br>
          <strong>Clave Auditoría:</strong> JUNT-M2026-X8<br>
          <strong>Ley aplicable:</strong> Ley N°19.418 sobre Organizaciones Territoriales
        </div>
      </div>

      <h3 class="card-title" style="margin-bottom:12px; font-size:1.2rem;">1. Detalle de Ingresos (Entradas de dinero)</h3>
      <div style="background-color:var(--bg-card); border:1.5px solid var(--border); border-radius:var(--radius-md); padding:16px; margin-bottom:24px;">
        ${incomeRowsHTML}
      </div>

      <h3 class="card-title" style="margin-bottom:12px; font-size:1.2rem;">2. Detalle de Egresos (Gastos ejecutados)</h3>
      <div style="background-color:var(--bg-card); border:1.5px solid var(--border); border-radius:var(--radius-md); padding:16px; margin-bottom:24px;">
        ${expenseRowsHTML}
      </div>

      <h3 class="card-title" style="margin-bottom:12px; font-size:1.2rem;">3. Resumen Consolidado</h3>
      <div class="report-summary-box">
        <div class="report-summary-row income">
          <span>Total Ingresos Recaudados (A)</span>
          <span style="font-variant-numeric: tabular-nums;">+${utils.formatCLP(totalIncome)}</span>
        </div>
        <div class="report-summary-row expense">
          <span>Total Gastos Ejecutados (B)</span>
          <span style="font-variant-numeric: tabular-nums;">-${utils.formatCLP(totalExpense)}</span>
        </div>
        <div class="report-summary-row">
          <span>Caja Disponible Líquida (A - B)</span>
          <span style="font-variant-numeric: tabular-nums;">${utils.formatCLP(balance)}</span>
        </div>
      </div>
      
      <div style="font-size:0.85rem; color:var(--text-tertiary); text-align:center; margin-top:20px; font-style:italic;">
        Este documento constituye un informe oficial de transparencia interna barrial de JuntAPP. Los registros físicos que respaldan estas transacciones residen en la tesorería de la Junta de Vecinos.
      </div>
    `;

    reportModal.classList.add("active");
  }
};
