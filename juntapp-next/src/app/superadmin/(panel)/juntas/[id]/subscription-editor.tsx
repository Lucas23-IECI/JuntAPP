'use client';

import { useState, useTransition } from 'react';
import { FiCheck, FiSave } from 'react-icons/fi';
import { addCalendarMonths } from '@/lib/junta-billing';
import { updateJuntaSubscriptionAction } from '../../actions';

const planPrices: Record<string, number> = {
  juntapp: 14990,
  juntapp_web: 22990,
  web: 9990,
};

export default function SubscriptionEditor({
  junta,
}: {
  junta: {
    id: string;
    subscription_status: string;
    subscription_plan: string;
    subscription_price: number;
    whatsapp_addon: boolean;
    subscription_next_payment_date: string | null;
    billing_mode: string;
    trial_ends_at: string | null;
    billing_notes: string | null;
  };
}) {
  const [status, setStatus] = useState(junta.subscription_status);
  const [plan, setPlan] = useState(junta.subscription_plan);
  const [whatsapp, setWhatsapp] = useState(junta.whatsapp_addon);
  const [price, setPrice] = useState(junta.subscription_price);
  const [nextPayment, setNextPayment] = useState(junta.subscription_next_payment_date?.slice(0, 10) ?? '');
  const [billingMode, setBillingMode] = useState(junta.billing_mode ?? 'subscription');
  const [trialEndsAt, setTrialEndsAt] = useState(junta.trial_ends_at?.slice(0, 10) ?? '');
  const [billingNotes, setBillingNotes] = useState(junta.billing_notes ?? '');
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function selectPlan(value: string) {
    setPlan(value);
    setPrice((planPrices[value] ?? 0) + (whatsapp ? 7990 : 0));
  }

  function toggleWhatsapp(value: boolean) {
    setWhatsapp(value);
    setPrice((planPrices[plan] ?? 0) + (value ? 7990 : 0));
  }

  function selectBillingMode(value: string) {
    setBillingMode(value);
    if (value === 'trial_then_subscription' && !trialEndsAt) {
      setTrialEndsAt(addCalendarMonths(new Date(), 1).toISOString().slice(0, 10));
    }
    if (value === 'trial_then_subscription' || value === 'complimentary') setStatus('authorized');
  }

  function save() {
    setFeedback(null);
    startTransition(async () => {
      const result = await updateJuntaSubscriptionAction({
        juntaId: junta.id,
        status: status as 'pending' | 'authorized' | 'paused' | 'cancelled' | 'past_due',
        plan: plan as 'juntapp' | 'juntapp_web' | 'web',
        whatsappAddon: whatsapp,
        price: Number(price),
        nextPaymentDate: nextPayment ? new Date(`${nextPayment}T12:00:00Z`).toISOString() : null,
        billingMode: billingMode as 'subscription' | 'trial_then_subscription' | 'complimentary',
        trialEndsAt: trialEndsAt ? new Date(`${trialEndsAt}T23:59:59Z`).toISOString() : null,
        billingNotes,
      });
      setFeedback(result);
    });
  }

  return (
    <section className="space-y-4 border-4 border-black bg-white p-5 shadow-[6px_6px_0_#000]">
      <div>
        <p className="text-xs font-black uppercase tracking-[.16em] text-[#f97316]">Control comercial</p>
        <h2 className="text-xl font-black uppercase">Editar suscripción</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-black uppercase tracking-wider">Modalidad comercial
          <select value={billingMode} onChange={(event) => selectBillingMode(event.target.value)} className="mt-2 w-full border-2 border-black bg-white px-3 py-2 text-sm font-black">
            <option value="subscription">Suscripción mensual</option>
            <option value="trial_then_subscription">Meses gratis y luego cobro</option>
            <option value="complimentary">Cortesía sin vencimiento</option>
          </select>
        </label>
        <label className="text-xs font-black uppercase tracking-wider">Estado
          <select value={status} disabled={billingMode !== 'subscription'} onChange={(event) => setStatus(event.target.value)} className="mt-2 w-full border-2 border-black bg-white px-3 py-2 text-sm font-black disabled:bg-slate-100">
            <option value="pending">Pendiente</option>
            <option value="authorized">Activa</option>
            <option value="paused">Pausada</option>
            <option value="past_due">Pago vencido</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </label>
        <label className="text-xs font-black uppercase tracking-wider">Plan
          <select value={plan} onChange={(event) => selectPlan(event.target.value)} className="mt-2 w-full border-2 border-black bg-white px-3 py-2 text-sm font-black">
            <option value="juntapp">JuntAPP</option>
            <option value="juntapp_web">JuntAPP + Web</option>
            <option value="web">Sitio web</option>
          </select>
        </label>
        <label className="text-xs font-black uppercase tracking-wider">Precio mensual
          <input type="number" min={0} value={price} readOnly className="mt-2 w-full border-2 border-black bg-slate-50 px-3 py-2 text-sm font-black" />
        </label>
        {billingMode === 'trial_then_subscription' ? (
          <label className="text-xs font-black uppercase tracking-wider">Fin del período gratis
            <input type="date" required value={trialEndsAt} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setTrialEndsAt(event.target.value)} className="mt-2 w-full border-2 border-black px-3 py-2 text-sm font-black" />
          </label>
        ) : (
          <label className="text-xs font-black uppercase tracking-wider">Próximo cobro
            <input type="date" disabled={billingMode === 'complimentary'} value={nextPayment} onChange={(event) => setNextPayment(event.target.value)} className="mt-2 w-full border-2 border-black px-3 py-2 text-sm font-black disabled:bg-slate-100" />
          </label>
        )}
      </div>
      <label className="flex cursor-pointer items-center gap-3 border-2 border-black bg-[#eaffef] p-3 text-sm font-black">
        <input type="checkbox" checked={whatsapp} onChange={(event) => toggleWhatsapp(event.target.checked)} className="h-5 w-5 accent-emerald-600" />
        Módulo WhatsApp (+$7.990)
      </label>
      <label className="block text-xs font-black uppercase tracking-wider">Nota comercial interna
        <textarea value={billingNotes} onChange={(event) => setBillingNotes(event.target.value)} maxLength={500} rows={3} className="mt-2 w-full border-2 border-black px-3 py-2 text-sm font-bold" />
      </label>
      {billingMode === 'trial_then_subscription' && (
        <p className="border-2 border-black bg-[#fff4a3] px-3 py-2 text-xs font-black">
          La junta permanece activa sin tarjeta hasta la fecha indicada. Después pasa a pago vencido y Presidencia debe autorizar Mercado Pago.
        </p>
      )}
      {feedback && <p className={`border-2 border-black px-3 py-2 text-sm font-bold ${feedback.ok ? 'bg-[#bffcc6]' : 'bg-[#ffb5e8]'}`}>{feedback.message}</p>}
      <button onClick={save} disabled={pending} className="flex items-center gap-2 border-2 border-black bg-[#f97316] px-4 py-2.5 text-xs font-black uppercase shadow-[3px_3px_0_#000] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50">
        {pending ? <FiSave className="animate-pulse" /> : <FiCheck />} {pending ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </section>
  );
}
