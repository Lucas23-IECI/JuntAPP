'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCLP, isPlanId, PLANS, subscriptionPrice } from '@/lib/plans';

const MercadoPagoCardForm = dynamic(() => import('./MercadoPagoCardForm'), {
  ssr: false,
  loading: () => <p className="form-help">Cargando checkout seguro de Mercado Pago…</p>,
});

export default function PaymentActivation({ juntaName, email, plan: rawPlan, whatsapp }: { juntaName: string; email: string; plan: string; whatsapp: boolean }) {
  const plan = isPlanId(rawPlan) ? rawPlan : 'juntapp';
  const amount = subscriptionPrice(plan, whatsapp);
  const [error, setError] = useState('');
  const [approvedSubscriptionId, setApprovedSubscriptionId] = useState<string | null>(null);
  const router = useRouter();

  function subscriptionApproved(subscriptionId: string) {
    setApprovedSubscriptionId(subscriptionId);
    window.setTimeout(() => { router.replace(PLANS[plan].hasApp ? '/inicio' : '/mi-pagina'); router.refresh(); }, 900);
  }

  return <div className="registration-payment-card">
    <span className="view-subtitle">Plan mensual {PLANS[plan].name}</span>
    <h3>{juntaName}</h3>
    <p>Autoriza la suscripción para habilitar el dashboard y el código de invitación de tu junta. El cobro se renovará automáticamente cada mes.</p>
    <div className="registration-price"><span>Suscripción mensual · IVA incluido</span><strong>${formatCLP(amount)} CLP / mes</strong></div>
    <ul className="payment-benefits">{PLANS[plan].hasApp && <li>Gestión vecinal completa</li>}{PLANS[plan].hasWebsite && <li>Página web autoadministrable</li>}{whatsapp && <li>WhatsApp masivo</li>}</ul>
    {approvedSubscriptionId ? <div className="payment-approved-message"><span>✓</span><strong>Suscripción autorizada</strong><p>Referencia Mercado Pago {approvedSubscriptionId}. Abriendo tu panel…</p></div> : <><p className="payment-test-notice">Pago seguro procesado por Mercado Pago</p>{error && <div className="auth-error-message">{error}</div>}<MercadoPagoCardForm email={email} amount={amount} onApproved={subscriptionApproved} onError={setError} /></>}
    <p className="payment-security-note">Al continuar autorizas un cobro recurrente de ${formatCLP(amount)} CLP cada mes. Puedes cancelar futuras renovaciones desde la administración de tu junta.</p>
    <p className="payment-security-note">El formulario seguro pertenece a Mercado Pago. JuntAPP no recibe ni almacena el número, fecha ni código de seguridad de tu tarjeta.</p>
  </div>;
}
