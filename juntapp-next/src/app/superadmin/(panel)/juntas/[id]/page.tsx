import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FiArrowLeft, FiCheckCircle, FiDollarSign, FiExternalLink, FiFileText, FiHome, FiUsers } from 'react-icons/fi';
import { createAdminClient } from '@/lib/supabase/admin';
import SubscriptionEditor from './subscription-editor';

export const dynamic = 'force-dynamic';

function money(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
}

export default async function JuntaDetailPage({ params }: PageProps<'/superadmin/juntas/[id]'>) {
  const { id } = await params;
  const admin = createAdminClient();
  const [
    juntaResult,
    profilesResult,
    transactionsResult,
    duesResult,
    pollsResult,
    announcementsResult,
    applicationsResult,
    websiteResult,
  ] = await Promise.all([
    admin.from('juntas').select('*').eq('id', id).single(),
    admin.from('profiles').select('id, name, email, phone, role, board_position, cuota_status, created_at').eq('junta_id', id).order('created_at'),
    admin.from('transactions').select('type, amount, date').eq('junta_id', id),
    admin.from('member_dues').select('status, amount, paid_at').eq('junta_id', id),
    admin.from('polls').select('id, active').eq('junta_id', id),
    admin.from('announcements').select('id').eq('junta_id', id),
    admin.from('membership_applications').select('id, status').eq('junta_id', id),
    admin.from('website_pages').select('published, updated_at').eq('junta_id', id).maybeSingle(),
  ]);

  if (juntaResult.error || !juntaResult.data) notFound();
  const junta = juntaResult.data;
  const profiles = profilesResult.data ?? [];
  const transactions = transactionsResult.data ?? [];
  const dues = duesResult.data ?? [];
  const income = transactions.filter((row) => row.type === 'ingreso').reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const expenses = transactions.filter((row) => row.type === 'egreso').reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const collectedDues = dues.filter((due) => due.status === 'paid').reduce((sum, due) => sum + Number(due.amount || 0), 0);
  const owner = profiles.find((profile) => profile.id === junta.owner_id) ?? profiles.find((profile) => profile.board_position === 'presidente');

  return (
    <div className="space-y-7">
      <Link href="/superadmin/juntas" className="inline-flex items-center gap-2 text-xs font-black uppercase text-slate-500 hover:text-[#f97316]"><FiArrowLeft /> Volver a juntas</Link>

      <header className="flex flex-col gap-4 border-4 border-black bg-[#9ee7ff] p-5 shadow-[6px_6px_0_#000] sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center border-3 border-black bg-[#071b34] text-2xl text-white"><FiHome /></span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[.18em] opacity-55">{junta.comuna ?? 'Sin comuna'} · {junta.region}</p>
            <h1 className="break-words text-3xl font-black uppercase tracking-tighter sm:text-5xl">{junta.name}</h1>
            <p className="mt-1 font-mono text-xs font-black opacity-55">/{junta.slug} · código {junta.invite_code}</p>
          </div>
        </div>
        {websiteResult.data?.published && (
          <Link href={`/sitio/${junta.slug}`} target="_blank" className="flex shrink-0 items-center gap-2 border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase shadow-[3px_3px_0_#000]">
            Ver sitio <FiExternalLink />
          </Link>
        )}
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Socios', value: profiles.length, detail: `${profiles.filter((profile) => profile.role === 'dirigente').length} dirigentes`, icon: FiUsers, color: 'bg-[#ffb5e8]' },
          { label: 'Saldo histórico', value: money(income - expenses), detail: `${money(income)} ingresos`, icon: FiDollarSign, color: 'bg-[#bffcc6]' },
          { label: 'Cuotas cobradas', value: money(collectedDues), detail: `${dues.filter((due) => due.status === 'paid').length} pagos`, icon: FiCheckCircle, color: 'bg-[#fff4a3]' },
          { label: 'Contenido', value: (pollsResult.data?.length ?? 0) + (announcementsResult.data?.length ?? 0), detail: `${pollsResult.data?.filter((poll) => poll.active).length ?? 0} votaciones activas`, icon: FiFileText, color: 'bg-[#9ee7ff]' },
        ].map((item) => {
          const ItemIcon = item.icon;
          return <article key={item.label} className={`border-4 border-black ${item.color} p-4 shadow-[4px_4px_0_#000]`}><ItemIcon className="mb-2 opacity-50" /><p className="text-[10px] font-black uppercase tracking-wider opacity-60">{item.label}</p><p className="text-2xl font-black tracking-tighter sm:text-3xl">{item.value}</p><p className="text-xs font-bold opacity-50">{item.detail}</p></article>;
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <article className="border-4 border-black bg-white shadow-[6px_6px_0_#000]">
          <div className="border-b-4 border-black bg-[#fff4c2] p-5">
            <h2 className="font-black uppercase">Directiva y responsables</h2>
            <p className="text-xs font-bold text-slate-500">{owner ? `Titular: ${owner.name}` : 'No se identificó titular'}</p>
          </div>
          <div className="divide-y-2 divide-black/10">
            {profiles.filter((profile) => profile.role === 'dirigente').map((profile) => (
              <div key={profile.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div><strong>{profile.name}</strong><p className="text-xs font-bold text-slate-400">{profile.email} · {profile.phone || 'sin teléfono'}</p></div>
                <span className="w-fit border-2 border-black bg-[#9ee7ff] px-2 py-1 text-[10px] font-black uppercase">{profile.board_position ?? 'dirigente'}</span>
              </div>
            ))}
            {!profiles.some((profile) => profile.role === 'dirigente') && <p className="p-8 text-center text-sm font-bold text-slate-400">No hay dirigentes registrados.</p>}
          </div>
        </article>

        <SubscriptionEditor junta={junta} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="border-4 border-black bg-white p-5 shadow-[4px_4px_0_#000]"><p className="text-xs font-black uppercase text-slate-400">Solicitudes de ingreso</p><p className="mt-1 text-3xl font-black">{applicationsResult.data?.filter((row) => row.status === 'pending').length ?? 0}</p><p className="text-xs font-bold text-slate-400">pendientes de la directiva</p></article>
        <article className="border-4 border-black bg-white p-5 shadow-[4px_4px_0_#000]"><p className="text-xs font-black uppercase text-slate-400">Sitio comunitario</p><p className="mt-1 text-3xl font-black">{websiteResult.data?.published ? 'Publicado' : 'No publicado'}</p><p className="text-xs font-bold text-slate-400">{junta.subscription_plan === 'juntapp' ? 'El plan no incluye sitio' : 'Módulo web incluido'}</p></article>
        <article className="border-4 border-black bg-white p-5 shadow-[4px_4px_0_#000]"><p className="text-xs font-black uppercase text-slate-400">Fecha de alta</p><p className="mt-1 text-3xl font-black">{new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short' }).format(new Date(junta.created_at))}</p><p className="text-xs font-bold text-slate-400">{new Intl.DateTimeFormat('es-CL', { year: 'numeric' }).format(new Date(junta.created_at))}</p></article>
      </section>
    </div>
  );
}
