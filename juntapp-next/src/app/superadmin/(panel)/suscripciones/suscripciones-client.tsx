'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { FiAlertTriangle, FiArrowUpRight, FiCheckCircle, FiDollarSign, FiPauseCircle, FiPlayCircle, FiSearch } from 'react-icons/fi';
import { updateJuntaSubscriptionAction } from '../actions';

type Subscription = {
  id: string;
  name: string;
  slug: string;
  subscription_status: string;
  subscription_plan: string;
  subscription_price: number;
  whatsapp_addon: boolean;
  subscription_next_payment_date: string | null;
  subscription_last_payment_status: string | null;
  subscription_last_synced_at: string | null;
  mercadopago_subscription_id: string | null;
  created_at: string;
};

const planLabels: Record<string, string> = { juntapp: 'JuntAPP', juntapp_web: 'JuntAPP + Web', web: 'Sitio web' };
const statusLabels: Record<string, string> = { authorized: 'Activa', pending: 'Pendiente', paused: 'Pausada', past_due: 'Pago vencido', cancelled: 'Cancelada' };

function money(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
}

function statusColor(status: string) {
  if (status === 'authorized') return 'bg-[#bffcc6]';
  if (status === 'past_due' || status === 'cancelled') return 'bg-[#ffb5e8]';
  return 'bg-[#fff4a3]';
}

export default function SuscripcionesClient({ subscriptions }: { subscriptions: Subscription[] }) {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [pending, startTransition] = useTransition();
  const active = subscriptions.filter((item) => item.subscription_status === 'authorized');
  const attention = subscriptions.filter((item) => ['past_due', 'pending'].includes(item.subscription_status));
  const inactive = subscriptions.filter((item) => ['paused', 'cancelled'].includes(item.subscription_status));
  const mrr = active.reduce((sum, item) => sum + Number(item.subscription_price || 0), 0);
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = subscriptions.filter((item) => {
    const matchesTab = tab === 'all' || (tab === 'attention' ? ['past_due', 'pending'].includes(item.subscription_status) : tab === 'inactive' ? ['paused', 'cancelled'].includes(item.subscription_status) : item.subscription_status === tab);
    return matchesTab && (!normalizedSearch || item.name.toLowerCase().includes(normalizedSearch));
  });

  function toggle(item: Subscription) {
    setBusy(item.id);
    setFeedback('');
    startTransition(async () => {
      const nextStatus = item.subscription_status === 'authorized' ? 'paused' : 'authorized';
      const result = await updateJuntaSubscriptionAction({
        juntaId: item.id,
        status: nextStatus,
        plan: item.subscription_plan as 'juntapp' | 'juntapp_web' | 'web',
        whatsappAddon: item.whatsapp_addon,
        price: item.subscription_price,
        nextPaymentDate: item.subscription_next_payment_date,
      });
      setFeedback(result.message);
      setBusy(null);
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-black uppercase tracking-[.18em] text-[#f97316]">Ingresos recurrentes</p>
        <h1 className="text-3xl font-black uppercase tracking-tighter sm:text-4xl">Suscripciones</h1>
        <p className="mt-1 text-sm font-bold text-slate-500">Planes, cobros y estados de Mercado Pago.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'MRR estimado', value: money(mrr), icon: FiDollarSign, color: 'bg-[#bffcc6]' },
          { label: 'Activas', value: active.length, icon: FiCheckCircle, color: 'bg-[#9ee7ff]' },
          { label: 'Con alertas', value: attention.length, icon: FiAlertTriangle, color: 'bg-[#fff4a3]' },
          { label: 'Pausadas/canceladas', value: inactive.length, icon: FiPauseCircle, color: 'bg-[#ffb5e8]' },
        ].map((item) => {
          const ItemIcon = item.icon;
          return <article key={item.label} className={`border-4 border-black ${item.color} p-4 shadow-[4px_4px_0_#000]`}><ItemIcon className="mb-2 opacity-50" /><p className="text-[10px] font-black uppercase tracking-wider opacity-60">{item.label}</p><p className="text-2xl font-black tracking-tighter sm:text-3xl">{item.value}</p></article>;
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <article className="border-4 border-black bg-white p-5 shadow-[5px_5px_0_#000]">
          <h2 className="font-black uppercase">Distribución del MRR</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(planLabels).map(([plan, label]) => {
              const planItems = active.filter((item) => item.subscription_plan === plan);
              const total = planItems.reduce((sum, item) => sum + Number(item.subscription_price), 0);
              return <div key={plan} className="flex items-center justify-between border-2 border-black bg-[#fffaf0] p-3"><span><strong className="block text-sm">{label}</strong><small className="font-bold text-slate-400">{planItems.length} activas</small></span><strong>{money(total)}</strong></div>;
            })}
            <div className="flex items-center justify-between border-2 border-black bg-[#071b34] p-3 text-white"><strong className="text-sm uppercase">Total mensual</strong><strong className="text-[#bffcc6]">{money(mrr)}</strong></div>
          </div>
        </article>
        <article className="border-4 border-black bg-white p-5 shadow-[5px_5px_0_#000]">
          <h2 className="font-black uppercase">Atención requerida</h2>
          <p className="text-xs font-bold text-slate-400">Suscripciones pendientes o con pago vencido.</p>
          <div className="mt-4 space-y-2">
            {attention.slice(0, 5).map((item) => <Link key={item.id} href={`/superadmin/juntas/${item.id}`} className="flex items-center justify-between border-2 border-black bg-[#fff4a3] p-3"><span><strong className="block text-sm">{item.name}</strong><small className="font-bold text-slate-500">{statusLabels[item.subscription_status]}</small></span><FiArrowUpRight /></Link>)}
            {!attention.length && <div className="border-2 border-black bg-[#bffcc6] p-5 text-center text-sm font-black">No hay cobros que requieran atención.</div>}
          </div>
        </article>
      </section>

      <section className="flex flex-col gap-3 border-4 border-black bg-white p-4 shadow-[4px_4px_0_#000] sm:flex-row sm:items-center">
        <div className="relative flex-1"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar junta…" className="w-full border-2 border-black py-2 pl-9 pr-3 text-sm font-bold" /></div>
        <div className="flex flex-wrap gap-2">
          {[['all', 'Todas'], ['authorized', 'Activas'], ['attention', 'Alertas'], ['inactive', 'Inactivas']].map(([value, label]) => <button key={value} onClick={() => setTab(value)} className={`border-2 border-black px-3 py-2 text-[10px] font-black uppercase ${tab === value ? 'bg-[#f97316]' : 'bg-white'}`}>{label}</button>)}
        </div>
      </section>

      {feedback && <p className="border-2 border-black bg-[#fff4a3] px-3 py-2 text-sm font-bold">{feedback}</p>}

      <section className="overflow-x-auto border-4 border-black bg-white shadow-[6px_6px_0_#000]">
        <table className="w-full min-w-[1050px] text-sm">
          <thead className="border-b-4 border-black bg-[#fff4c2] text-left text-xs font-black uppercase tracking-wider"><tr><th className="px-5 py-4">Junta</th><th className="px-4 py-4">Plan</th><th className="px-4 py-4">Mensualidad</th><th className="px-4 py-4">Estado</th><th className="px-4 py-4">Próximo cobro</th><th className="px-4 py-4">Mercado Pago</th><th className="px-4 py-4">Acciones</th></tr></thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="border-b-2 border-black/10 hover:bg-[#fffaf0]">
                <td className="px-5 py-4"><strong className="block">{item.name}</strong><small className="font-mono font-bold text-slate-400">/{item.slug}</small></td>
                <td className="px-4 py-4"><span className="border-2 border-black bg-[#9ee7ff] px-2 py-1 text-xs font-black">{planLabels[item.subscription_plan]}</span>{item.whatsapp_addon && <small className="ml-2 font-black text-emerald-700">+ WA</small>}</td>
                <td className="px-4 py-4 font-black">{money(item.subscription_price)}</td>
                <td className="px-4 py-4"><span className={`border-2 border-black px-2 py-1 text-[10px] font-black uppercase ${statusColor(item.subscription_status)}`}>{statusLabels[item.subscription_status]}</span></td>
                <td className="px-4 py-4 text-xs font-bold">{item.subscription_next_payment_date ? new Intl.DateTimeFormat('es-CL').format(new Date(item.subscription_next_payment_date)) : 'Sin fecha'}</td>
                <td className="px-4 py-4"><span className={`border-2 border-black px-2 py-1 text-[10px] font-black uppercase ${item.mercadopago_subscription_id ? 'bg-[#bffcc6]' : 'bg-slate-100'}`}>{item.mercadopago_subscription_id ? item.subscription_last_payment_status ?? 'Conectado' : 'Manual'}</span></td>
                <td className="px-4 py-4"><div className="flex gap-2"><button disabled={pending || busy === item.id} onClick={() => toggle(item)} title={item.subscription_status === 'authorized' ? 'Pausar' : 'Activar'} className={`grid h-9 w-9 place-items-center border-2 border-black shadow-[2px_2px_0_#000] ${item.subscription_status === 'authorized' ? 'bg-[#ffb5e8]' : 'bg-[#bffcc6]'}`}>{busy === item.id ? '…' : item.subscription_status === 'authorized' ? <FiPauseCircle /> : <FiPlayCircle />}</button><Link href={`/superadmin/juntas/${item.id}`} title="Editar detalle" className="grid h-9 w-9 place-items-center border-2 border-black bg-[#071b34] text-white shadow-[2px_2px_0_#f97316]"><FiArrowUpRight /></Link></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
