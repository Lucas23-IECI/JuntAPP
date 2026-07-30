'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { FiArrowUpRight, FiDownload, FiFilter, FiHome, FiPlus, FiSearch, FiUsers } from 'react-icons/fi';
import { billingSummary } from '@/lib/junta-billing';

type Junta = {
  id: string;
  name: string;
  slug: string;
  comuna: string | null;
  region: string;
  invite_code: string;
  subscription_status: string;
  subscription_plan: string;
  subscription_price: number;
  whatsapp_addon: boolean;
  billing_mode: string;
  trial_ends_at: string | null;
  created_at: string;
  members: number;
  leaders: number;
};

const statusLabels: Record<string, string> = {
  authorized: 'Activa',
  pending: 'Pendiente',
  paused: 'Pausada',
  past_due: 'Pago vencido',
  cancelled: 'Cancelada',
};

const planLabels: Record<string, string> = {
  juntapp: 'JuntAPP',
  juntapp_web: 'JuntAPP + Web',
  web: 'Sitio web',
};

function statusColor(status: string) {
  if (status === 'authorized') return 'bg-[#bffcc6]';
  if (status === 'past_due' || status === 'cancelled') return 'bg-[#ffb5e8]';
  return 'bg-[#fff4a3]';
}

export default function JuntasClient({ juntas }: { juntas: Junta[] }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [plan, setPlan] = useState('all');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return juntas.filter((junta) => {
      const matchesTerm =
        !term ||
        junta.name.toLowerCase().includes(term) ||
        junta.slug.toLowerCase().includes(term) ||
        junta.invite_code.toLowerCase().includes(term) ||
        junta.comuna?.toLowerCase().includes(term) ||
        junta.region.toLowerCase().includes(term);
      return matchesTerm && (status === 'all' || junta.subscription_status === status) && (plan === 'all' || junta.subscription_plan === plan);
    });
  }, [juntas, plan, search, status]);

  function downloadCsv() {
    const rows = [
      ['Junta', 'Comuna', 'Región', 'Código', 'Plan', 'Beneficio', 'Estado', 'Socios', 'Dirigentes', 'Precio'],
      ...filtered.map((junta) => [
        junta.name,
        junta.comuna ?? '',
        junta.region,
        junta.invite_code,
        planLabels[junta.subscription_plan] ?? junta.subscription_plan,
        billingSummary(junta),
        statusLabels[junta.subscription_status] ?? junta.subscription_status,
        junta.members,
        junta.leaders,
        junta.subscription_price,
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `juntapp-juntas-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-[#f97316]">Organizaciones</p>
          <h1 className="text-3xl font-black uppercase tracking-tighter sm:text-4xl">Juntas de vecinos</h1>
          <p className="mt-1 text-sm font-bold text-slate-500">{juntas.length} organizaciones registradas en JuntAPP.</p>
        </div>
        <Link href="/superadmin/juntas/nueva" className="flex shrink-0 items-center justify-center gap-2 border-4 border-black bg-[#f97316] px-4 py-3 text-xs font-black uppercase shadow-[4px_4px_0_#000] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
          <FiPlus /> Agregar junta
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Total', juntas.length, 'bg-[#9ee7ff]'],
          ['Activas', juntas.filter((junta) => junta.subscription_status === 'authorized').length, 'bg-[#bffcc6]'],
          ['Con alertas', juntas.filter((junta) => ['past_due', 'pending'].includes(junta.subscription_status)).length, 'bg-[#fff4a3]'],
          ['Socios', juntas.reduce((sum, junta) => sum + junta.members, 0), 'bg-[#ffb5e8]'],
        ].map(([label, value, color]) => (
          <article key={String(label)} className={`border-4 border-black ${color} p-4 shadow-[4px_4px_0_#000]`}>
            <p className="text-xs font-black uppercase tracking-wider opacity-60">{label}</p>
            <p className="text-3xl font-black tracking-tighter">{value}</p>
          </article>
        ))}
      </section>

      <section className="flex flex-wrap items-center gap-3 border-4 border-black bg-white p-4 shadow-[4px_4px_0_#000]">
        <FiFilter className="shrink-0 text-slate-400" />
        <label className="relative min-w-[220px] flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar junta, comuna o código…" className="w-full border-2 border-black py-2 pl-9 pr-3 text-sm font-bold outline-none focus:shadow-[3px_3px_0_#f97316]" />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase">
          <option value="all">Todos los estados</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={plan} onChange={(event) => setPlan(event.target.value)} className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase">
          <option value="all">Todos los planes</option>
          {Object.entries(planLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button onClick={downloadCsv} className="flex items-center gap-2 border-2 border-black bg-[#071b34] px-3 py-2 text-xs font-black uppercase text-white shadow-[2px_2px_0_#f97316]">
          <FiDownload /> CSV
        </button>
      </section>

      <section className="space-y-3 lg:hidden">
        {filtered.map((junta) => (
          <article key={junta.id} className="space-y-3 border-4 border-black bg-white p-4 shadow-[4px_4px_0_#000]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-black bg-[#9ee7ff]"><FiHome /></span>
                <span className="min-w-0">
                  <strong className="block truncate">{junta.name}</strong>
                  <small className="font-bold text-slate-400">{junta.comuna ?? 'Sin comuna'} · {junta.region}</small>
                </span>
              </div>
              <span className={`shrink-0 border-2 border-black px-2 py-1 text-[10px] font-black uppercase ${statusColor(junta.subscription_status)}`}>{statusLabels[junta.subscription_status]}</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-black">
              <span className="border-2 border-black bg-[#fffaf0] px-2 py-1">{planLabels[junta.subscription_plan]}</span>
              <span className="border-2 border-black bg-[#fff4a3] px-2 py-1">{billingSummary(junta)}</span>
              <span className="flex items-center gap-1 border-2 border-black bg-[#fffaf0] px-2 py-1"><FiUsers /> {junta.members} socios</span>
              <span className="border-2 border-black bg-[#fffaf0] px-2 py-1">Código {junta.invite_code}</span>
            </div>
            <Link href={`/superadmin/juntas/${junta.id}`} className="flex items-center justify-center gap-2 border-2 border-black bg-[#071b34] px-3 py-2 text-xs font-black uppercase text-white">Ver detalle <FiArrowUpRight /></Link>
          </article>
        ))}
      </section>

      <section className="hidden overflow-x-auto border-4 border-black bg-white shadow-[6px_6px_0_#000] lg:block">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b-4 border-black bg-[#fff4c2] text-left text-xs font-black uppercase tracking-wider">
            <tr><th className="px-5 py-4">Junta</th><th className="px-4 py-4">Plan</th><th className="px-4 py-4">Beneficio</th><th className="px-4 py-4">Estado</th><th className="px-4 py-4">Socios</th><th className="px-4 py-4">Código</th><th className="px-4 py-4">Registro</th><th /></tr>
          </thead>
          <tbody>
            {filtered.map((junta) => (
              <tr key={junta.id} className="border-b-2 border-black/10 hover:bg-[#fffaf0]">
                <td className="px-5 py-4"><strong className="block">{junta.name}</strong><small className="font-bold text-slate-400">{junta.comuna ?? 'Sin comuna'} · {junta.region}</small></td>
                <td className="px-4 py-4"><span className="border-2 border-black bg-[#9ee7ff] px-2 py-1 text-xs font-black">{planLabels[junta.subscription_plan] ?? junta.subscription_plan}</span>{junta.whatsapp_addon && <small className="ml-2 font-black text-emerald-700">+ WhatsApp</small>}</td>
                <td className="px-4 py-4 text-xs font-black">{billingSummary(junta)}</td>
                <td className="px-4 py-4"><span className={`border-2 border-black px-2 py-1 text-[10px] font-black uppercase ${statusColor(junta.subscription_status)}`}>{statusLabels[junta.subscription_status] ?? junta.subscription_status}</span></td>
                <td className="px-4 py-4 font-black">{junta.members} <small className="font-bold text-slate-400">({junta.leaders} dirigentes)</small></td>
                <td className="px-4 py-4 font-mono text-xs font-black">{junta.invite_code}</td>
                <td className="px-4 py-4 text-xs font-bold text-slate-400">{new Intl.DateTimeFormat('es-CL').format(new Date(junta.created_at))}</td>
                <td className="px-4 py-4"><Link href={`/superadmin/juntas/${junta.id}`} className="flex w-fit items-center gap-1 border-2 border-black bg-[#071b34] px-3 py-1.5 text-xs font-black uppercase text-white shadow-[2px_2px_0_#f97316]">Detalle <FiArrowUpRight /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {!filtered.length && <div className="border-4 border-black bg-white py-16 text-center font-black text-slate-400 shadow-[4px_4px_0_#000]">No hay resultados para esos filtros.</div>}
    </div>
  );
}
