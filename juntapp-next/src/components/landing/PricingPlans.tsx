'use client';
import { useState } from 'react';
import Link from 'next/link';
import { formatCLP, PLANS, type PlanId, WHATSAPP_ADDON_PRICE_CLP } from '@/lib/plans';

const details: Record<PlanId, string[]> = {
  juntapp: ['Hasta 500 vecinos activos', 'Socios, tesorería y caja', 'Votaciones y comunicaciones', 'Administradores ilimitados'],
  juntapp_web: ['Todo JuntAPP Vecinal', 'Landing pública autoadministrable', '5 plantillas incluidas', 'Logo, fotos, textos y colores'],
  web: ['Landing pública autoadministrable', '5 plantillas responsivas', 'Gestor de imágenes y contenidos', 'Publicación con dirección propia'],
};

export default function PricingPlans() {
  const [whatsapp, setWhatsapp] = useState(false);
  return <><header className="plans-nav"><Link href="/" className="plans-brand">Junt<span>APP</span></Link><nav><Link href="/caracteristicas">Características</Link><Link href="/faq">Preguntas frecuentes</Link><Link href="/login">Ingresar</Link></nav></header><main className="plans-page">
    <section className="plans-hero"><span>PLANES TRANSPARENTES</span><h1>Una solución para cada junta vecinal</h1><p>Precios mensuales en pesos chilenos, IVA incluido. Sin contratos forzosos.</p></section>
    <section className="plans-grid" aria-label="Planes disponibles">
      {(Object.values(PLANS)).map((plan) => <article className={`plan-card plan-${plan.id} ${plan.id === 'juntapp_web' ? 'featured' : ''}`} key={plan.id}>
        {plan.id === 'juntapp_web' && <span className="plan-ribbon">MÁS CONVENIENTE</span>}
        <h2>{plan.name}</h2><p className="plan-audience">{plan.id === 'web' ? 'Para tener presencia pública simple y profesional.' : 'Para modernizar la gestión de la comunidad.'}</p>
        <div className="plan-price"><small>$</small><strong>{formatCLP(plan.price + (whatsapp ? WHATSAPP_ADDON_PRICE_CLP : 0))}</strong><span>/ mes</span></div>
        {whatsapp && <p className="price-breakdown">Plan ${formatCLP(plan.price)} + WhatsApp ${formatCLP(WHATSAPP_ADDON_PRICE_CLP)}</p>}
        <ul>{details[plan.id].map((item) => <li key={item}>✓ {item}</li>)}</ul>
        <Link className="plan-buy" href={`/registro?plan=${plan.id}&whatsapp=${whatsapp ? '1' : '0'}`}>Elegir {plan.name}</Link>
      </article>)}
    </section>
    <label className="whatsapp-addon"><input type="checkbox" checked={whatsapp} onChange={(event) => setWhatsapp(event.target.checked)} /><span className="wa-icon">W</span><span><strong>Agregar WhatsApp masivo a cualquier plan</strong><small>Envío de avisos, recordatorios y notificaciones a los vecinos.</small></span><b>+${formatCLP(WHATSAPP_ADDON_PRICE_CLP)} / mes</b></label>
    <p className="plans-note">El monto mostrado será exactamente el que autorices en Mercado Pago. Renovación mensual; puedes cancelar futuras renovaciones.</p>
  </main></>;
}
