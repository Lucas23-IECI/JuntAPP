'use client';

import { CardPayment, initMercadoPago } from '@mercadopago/sdk-react';

const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
if (publicKey) initMercadoPago(publicKey, { locale: 'es-CL' });

type CardFormData = {
  token: string;
  issuer_id: string;
  payment_method_id: string;
  transaction_amount: number;
  installments: number;
  payer: { identification?: { type: string; number: string } };
};

export default function MercadoPagoCardForm({ email, onApproved, onError }: { email: string; onApproved: (subscriptionId: string) => void; onError: (message: string) => void }) {
  if (!publicKey) return <div className="auth-error-message">La clave pública de Mercado Pago no está configurada.</div>;

  async function submitSubscription(formData: CardFormData) {
    onError('');
    const response = await fetch('/api/mercadopago/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, idempotencyKey: crypto.randomUUID() }),
    });
    const result = await response.json();
    if (!response.ok) {
      onError(result.error ?? 'La suscripción no pudo ser autorizada.');
      throw new Error(result.error ?? 'La suscripción no pudo ser autorizada.');
    }
    onApproved(result.subscriptionId);
  }

  return <div className="mercadopago-brick-shell">
    <CardPayment
      initialization={{ amount: 15_000, payer: { email } }}
      customization={{ paymentMethods: { minInstallments: 1, maxInstallments: 1 } }}
      locale="es-CL"
      onSubmit={submitSubscription}
      onError={() => onError('Mercado Pago no pudo cargar el formulario. Intenta nuevamente.')}
    />
  </div>;
}
