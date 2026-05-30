/* ==========================================================================
   JuntAPP Secure Payment Gateway Module (Supabase & Local Storage Integrator)
   ========================================================================== */

import { db } from "../db.js";
import { utils } from "../utils.js";
import { notificationsModule } from "./notifications.js";

// DOM references
const paymentModal = document.getElementById("paymentModal");
const payStep1 = document.getElementById("payStep-1");
const payStep2 = document.getElementById("payStep-2");
const payStep3 = document.getElementById("payStep-3");
const payStep4 = document.getElementById("payStep-4");

const payPartnerName = document.getElementById("payPartnerName");
const payPartnerRut = document.getElementById("payPartnerRut");

const btnGoToGateway = document.getElementById("btnGoToGateway");
const btnBackToStep1 = document.getElementById("btnBackToStep1");
const btnTriggerTransaction = document.getElementById("btnTriggerTransaction");
const btnConfirmBankAuth = document.getElementById("btnConfirmBankAuth");
const btnClosePaymentModal = document.getElementById("btnClosePaymentModal");

const bankSimulatorPanel = document.getElementById("bankSimulatorPanel");
const processingTitle = document.getElementById("processingTitle");
const bankKeyInput = document.getElementById("bankKey");

const receiptTxId = document.getElementById("receiptTxId");
const receiptDate = document.getElementById("receiptDate");
const receiptSocio = document.getElementById("receiptSocio");
const receiptMethod = document.getElementById("receiptMethod");

let activeSocio = null;
let selectedMethodVal = "webpay";
let pendingTxId = null;

export const paymentModule = {
  init() {
    btnGoToGateway.addEventListener("click", () => this.goToStep(2));
    btnBackToStep1.addEventListener("click", () => this.goToStep(1));
    
    btnTriggerTransaction.addEventListener("click", () => {
      const checked = document.querySelector('input[name="payMethod"]:checked');
      selectedMethodVal = checked ? checked.value : "webpay";
      
      this.goToStep(3);
      this.runGatewayProcess();
    });

    btnConfirmBankAuth.addEventListener("click", () => {
      this.completeTransaction();
    });

    btnClosePaymentModal.addEventListener("click", () => {
      paymentModal.classList.remove("active");
    });

    window.JuntappPayment = this;
  },

  async openCheckout(socioId) {
    try {
      const list = await db.getSocios();
      activeSocio = list.find(s => s.id.toString() === socioId.toString());
      
      if (!activeSocio) {
        alert("Error: No se pudo localizar al socio seleccionado en el padrón.");
        return;
      }

      if (activeSocio.cuotaStatus === "al_dia") {
        alert(`El socio ${activeSocio.name} ya cuenta con sus cuotas al día.`);
        return;
      }

      payPartnerName.textContent = activeSocio.name;
      payPartnerRut.textContent = utils.formatRUT(activeSocio.rut);

      bankKeyInput.value = "123";
      this.goToStep(1);
      
      paymentModal.classList.add("active");
    } catch (err) {
      console.error("Failed to load socio details for checkout:", err);
      alert("Error al cargar la información del socio.");
    }
  },

  goToStep(stepNum) {
    payStep1.classList.remove("active");
    payStep2.classList.remove("active");
    payStep3.classList.remove("active");
    payStep4.classList.remove("active");

    if (stepNum === 1) payStep1.classList.add("active");
    if (stepNum === 2) payStep2.classList.add("active");
    if (stepNum === 3) payStep3.classList.add("active");
    if (stepNum === 4) payStep4.classList.add("active");
  },

  async runGatewayProcess() {
    processingTitle.textContent = "Conectando con Transbank Webpay Plus…";
    bankSimulatorPanel.style.display = "none";
    
    // Simulate API connection or hit Edge Function create-payment if Cloud is active
    if (db.isCloud()) {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            socioId: activeSocio.id,
            amount: 5000,
            concept: 'Cuota Mensual (Mayo 2026)',
            email: activeSocio.email
          })
        });
        const data = await response.json();
        pendingTxId = data.transactionId;
        console.log("☁️ Supabase create-payment response:", data);
      } catch (err) {
        console.error("Cloud payment initiation error:", err);
      }
    } else {
      pendingTxId = Date.now();
    }

    setTimeout(() => {
      if (selectedMethodVal === "transfer") {
        processingTitle.textContent = "Conectando con Servipag / Banco Estado…";
        setTimeout(() => {
          this.completeTransaction();
        }, 1200);
      } else {
        processingTitle.textContent = "Autorización Requerida";
        bankSimulatorPanel.style.display = "block";
      }
    }, 1800);
  },

  async completeTransaction() {
    if (!activeSocio) return;

    bankSimulatorPanel.style.display = "none";
    processingTitle.textContent = "Verificando firmas y registrando fondos…";

    try {
      const cleanMethodName = this.getMethodName(selectedMethodVal);
      
      if (db.isCloud() && pendingTxId) {
        // Trigger payment-webhook Edge Function with approved status
        try {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-webhook`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              transactionId: pendingTxId,
              socioId: activeSocio.id,
              status: 'approved'
            })
          });
          const result = await response.json();
          console.log("☁️ Webpay webhook response:", result);
        } catch (err) {
          console.error("Webhook processing failed:", err);
        }
      } else {
        // Local Mode Operations
        await db.updateSocioStatus(activeSocio.id, "al_dia");
        
        await db.addTransaction({
          type: "ingreso",
          desc: `Pago Cuota Social Mayo — ${activeSocio.name} (${cleanMethodName})`,
          amount: 5000,
          date: new Date().toISOString().split('T')[0]
        });

        // Add local notification
        notificationsModule.addNotification({
          type: "cuota",
          title: "Transacción Aprobada",
          message: `Se ha registrado el pago de la cuota de ${activeSocio.name} ($5.000) vía ${cleanMethodName}.`
        });
      }

      // Configure receipt ticket values
      const opId = pendingTxId || Math.floor(Math.random() * 9000000) + 1000000;
      receiptTxId.textContent = `JV-${opId}`;
      receiptDate.textContent = new Date().toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + " hrs";
      receiptSocio.textContent = activeSocio.name;
      receiptMethod.textContent = cleanMethodName;

      // Render Step 4
      this.goToStep(4);

      // Force UI refreshes
      const activeNav = document.querySelector(".nav-item.active");
      if (activeNav) {
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }
    } catch (err) {
      console.error("Failed to complete transaction:", err);
      alert("Error al procesar el pago de la cuota.");
      this.goToStep(1);
    }
  },

  getMethodName(val) {
    if (val === "webpay") return "Webpay Plus (Débito)";
    if (val === "transfer") return "Transferencia Electrónica";
    if (val === "digital") return "Pago Móvil (MACH/Redcompra)";
    return "Pago Seguro";
  }
};
