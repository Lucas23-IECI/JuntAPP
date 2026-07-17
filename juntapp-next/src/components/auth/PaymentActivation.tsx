'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const MercadoPagoCardForm = dynamic(() => import('./MercadoPagoCardForm'), {
  ssr: false,
  loading: () => <p className="form-help">Cargando checkout seguro de Mercado Pago…</p>,
});

export default function PaymentActivation({ juntaName, email }: { juntaName: string; email: string }) {
  const [error, setError] = useState('');
  const [approvedSubscriptionId, setApprovedSubscriptionId] = useState<string | null>(null);
  const router = useRouter();

  function subscriptionApproved(subscriptionId: string) {
    setApprovedSubscriptionId(subscriptionId);
    window.setTimeout(() => { router.replace('/inicio'); router.refresh(); }, 900);
  }

  return <div className="registration-payment-card">
    <span className="view-subtitle">Plan mensual JuntAPP</span>
    <h3>{juntaName}</h3>
    <p>Autoriza la suscripción para habilitar el dashboard y el código de invitación de tu junta. El cobro se renovará automáticamente cada mes.</p>
    <div className="registration-price"><span>Suscripción mensual · IVA incluido</span><strong>$15.000 CLP / mes</strong></div>
    <ul className="payment-benefits"><li>Dashboard y tesorería</li><li>Registro de socios</li><li>Votaciones y anuncios</li></ul>
    {approvedSubscriptionId ? <div className="payment-approved-message"><span>✓</span><strong>Suscripción autorizada</strong><p>Referencia Mercado Pago {approvedSubscriptionId}. Abriendo tu dashboard…</p></div> : <><p className="payment-test-notice">Ambiente de prueba de Mercado Pago</p>{error && <div className="auth-error-message">{error}</div>}<MercadoPagoCardForm email={email} onApproved={subscriptionApproved} onError={setError} /></>}
    <p className="payment-security-note">Al continuar autorizas un cobro recurrente de $15.000 CLP cada mes. Puedes cancelar las renovaciones desde la administración de tu junta.</p>
    <p className="payment-security-note">El formulario seguro pertenece a Mercado Pago. JuntAPP no recibe ni almacena el número, fecha ni código de seguridad de tu tarjeta.</p>
  </div>;
}
