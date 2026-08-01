import Link from 'next/link';
import { FiArrowUpRight, FiCheckCircle, FiClock, FiCreditCard, FiFileText, FiUserPlus } from 'react-icons/fi';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function when(value: string) {
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default async function OperacionesPage() {
  const admin = createAdminClient();
  const [
    juntasResult,
    applicationsResult,
    proposalsResult,
    duesResult,
    eventsResult,
  ] = await Promise.all([
    admin.from('juntas').select('id, name'),
    admin.from('membership_applications').select('id, junta_id, name, email, status, letter_delivery_status, created_at').order('created_at', { ascending: false }).limit(50),
    admin.from('poll_proposals').select('id, junta_id, title, status, created_at').order('created_at', { ascending: false }).limit(50),
    admin.from('member_dues').select('id, junta_id, amount, status, payment_source, paid_at, created_at').order('created_at', { ascending: false }).limit(50),
    admin.from('payment_events').select('provider_event_id, junta_id, created_at').order('created_at', { ascending: false }).limit(50),
  ]);
  const juntaNames = new Map((juntasResult.data ?? []).map((junta) => [junta.id, junta.name]));
  const applications = applicationsResult.data ?? [];
  const proposals = proposalsResult.data ?? [];
  const dues = duesResult.data ?? [];
  const events = eventsResult.data ?? [];
  const activity = [
    ...applications.map((row) => ({ id: `application-${row.id}`, juntaId: row.junta_id, type: 'Solicitud de ingreso', title: row.name, detail: row.email, status: row.status, createdAt: row.created_at, icon: 'user' })),
    ...proposals.map((row) => ({ id: `proposal-${row.id}`, juntaId: row.junta_id, type: 'Propuesta de consulta', title: row.title, detail: 'Iniciativa vecinal', status: row.status, createdAt: row.created_at, icon: 'file' })),
    ...dues.map((row) => ({ id: `due-${row.id}`, juntaId: row.junta_id, type: 'Cuota vecinal', title: new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(row.amount)), detail: row.payment_source === 'manual' ? 'Registro manual' : 'Mercado Pago', status: row.status, createdAt: row.paid_at ?? row.created_at, icon: 'payment' })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 60);

  const cards = [
    { label: 'Solicitudes pendientes', value: applications.filter((row) => row.status === 'pending').length, icon: FiUserPlus, color: 'bg-[#fff4a3]' },
    { label: 'Propuestas pendientes', value: proposals.filter((row) => row.status === 'pending').length, icon: FiFileText, color: 'bg-[#9ee7ff]' },
    { label: 'Cuotas aprobadas', value: dues.filter((row) => row.status === 'paid').length, icon: FiCheckCircle, color: 'bg-[#bffcc6]' },
    { label: 'Eventos de pago', value: events.length, icon: FiCreditCard, color: 'bg-[#ffb5e8]' },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-black uppercase tracking-[.18em] text-[#f97316]">Seguimiento global</p>
        <h1 className="text-3xl font-black uppercase tracking-tighter sm:text-4xl">Operaciones</h1>
        <p className="mt-1 text-sm font-bold text-slate-500">Solicitudes, propuestas y pagos recientes de todas las juntas.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((item) => {
          const ItemIcon = item.icon;
          return <article key={item.label} className={`border-4 border-black ${item.color} p-4 shadow-[4px_4px_0_#000]`}><ItemIcon className="mb-2 opacity-50" /><p className="text-[10px] font-black uppercase tracking-wider opacity-60">{item.label}</p><p className="text-3xl font-black">{item.value}</p></article>;
        })}
      </section>

      <section className="border-4 border-black bg-white shadow-[6px_6px_0_#000]">
        <div className="border-b-4 border-black bg-[#fff4c2] p-5">
          <h2 className="font-black uppercase">Actividad reciente</h2>
          <p className="text-xs font-bold text-slate-500">Vista de auditoría operacional, sin intervenir las decisiones de cada directiva.</p>
        </div>
        <div className="divide-y-2 divide-black/10">
          {activity.map((item) => {
            const Icon = item.icon === 'user' ? FiUserPlus : item.icon === 'file' ? FiFileText : FiCreditCard;
            const isComplete = ['paid', 'approved', 'activated'].includes(item.status);
            const isRejected = ['rejected', 'refunded'].includes(item.status);
            return (
              <div key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center border-2 border-black ${item.icon === 'payment' ? 'bg-[#bffcc6]' : item.icon === 'user' ? 'bg-[#fff4a3]' : 'bg-[#9ee7ff]'}`}><Icon /></span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#f97316]">{item.type}</p>
                    <strong className="block truncate">{item.title}</strong>
                    <small className="font-bold text-slate-400">{item.detail} · {when(item.createdAt)}</small>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 border-2 border-black px-2 py-1 text-[10px] font-black uppercase ${isComplete ? 'bg-[#bffcc6]' : isRejected ? 'bg-[#ffb5e8]' : 'bg-[#fff4a3]'}`}>{isComplete ? <FiCheckCircle /> : <FiClock />}{item.status}</span>
                  <Link href={`/superadmin/juntas/${item.juntaId}`} className="flex items-center gap-1 border-2 border-black bg-[#071b34] px-3 py-1.5 text-[10px] font-black uppercase text-white">{juntaNames.get(item.juntaId) ?? 'Ver junta'} <FiArrowUpRight /></Link>
                </div>
              </div>
            );
          })}
          {!activity.length && <p className="p-14 text-center font-black text-slate-400">Todavía no hay actividad operacional.</p>}
        </div>
      </section>
    </div>
  );
}
