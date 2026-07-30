'use client';

import { useMemo, useState, useTransition } from 'react';
import { FiBell, FiCheckCircle, FiLink, FiMail, FiSend, FiUsers } from 'react-icons/fi';
import { sendPlatformBroadcastAction } from '../actions';

type JuntaAudience = {
  id: string;
  name: string;
  subscription_plan: string;
  subscription_status: string;
  total: number;
  dirigentes: number;
  vecinos: number;
};

type RecentMessage = {
  title: string;
  message: string;
  action: string | null;
  date: string;
  recipients: number;
};

const planLabels: Record<string, string> = { juntapp: 'JuntAPP', juntapp_web: 'JuntAPP + Web', web: 'Sitio web' };

export default function ComunicacionesClient({ juntas, recent }: { juntas: JuntaAudience[]; recent: RecentMessage[] }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [action, setAction] = useState('');
  const [juntaId, setJuntaId] = useState('all');
  const [role, setRole] = useState('all');
  const [plan, setPlan] = useState('all');
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const recipients = useMemo(() => juntas
    .filter((junta) => juntaId === 'all' || junta.id === juntaId)
    .filter((junta) => plan === 'all' || junta.subscription_plan === plan)
    .reduce((sum, junta) => sum + (role === 'dirigente' ? junta.dirigentes : role === 'vecino' ? junta.vecinos : junta.total), 0), [juntaId, juntas, plan, role]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm(`Se enviará este comunicado a ${recipients} personas. ¿Continuar?`)) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await sendPlatformBroadcastAction({
        title,
        message,
        action: action.trim() || null,
        juntaId: juntaId === 'all' ? null : juntaId,
        role: role as 'all' | 'dirigente' | 'vecino',
        plan: plan as 'all' | 'juntapp' | 'juntapp_web' | 'web',
      });
      setFeedback(result);
      if (result.ok) {
        setTitle('');
        setMessage('');
        setAction('');
      }
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-black uppercase tracking-[.18em] text-[#f97316]">Canal institucional</p>
        <h1 className="text-3xl font-black uppercase tracking-tighter sm:text-4xl">Comunicaciones</h1>
        <p className="mt-1 text-sm font-bold text-slate-500">Mensajes globales o segmentados dentro de JuntAPP.</p>
      </header>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <form onSubmit={submit} className="space-y-5 border-4 border-black bg-white p-5 shadow-[6px_6px_0_#000]">
          <div className="flex items-start justify-between gap-4 border-b-2 border-black/10 pb-4">
            <div><p className="text-xs font-black uppercase tracking-[.16em] text-[#f97316]">Nuevo envío</p><h2 className="text-xl font-black uppercase">Redactar comunicado</h2></div>
            <FiMail className="h-7 w-7 text-slate-300" />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs font-black uppercase tracking-wider">Junta
              <select value={juntaId} onChange={(event) => setJuntaId(event.target.value)} className="mt-2 w-full border-2 border-black bg-white px-3 py-2 text-sm font-bold normal-case">
                <option value="all">Todas las juntas</option>
                {juntas.map((junta) => <option key={junta.id} value={junta.id}>{junta.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-black uppercase tracking-wider">Rol
              <select value={role} onChange={(event) => setRole(event.target.value)} className="mt-2 w-full border-2 border-black bg-white px-3 py-2 text-sm font-bold normal-case"><option value="all">Todos</option><option value="dirigente">Solo dirigentes</option><option value="vecino">Solo vecinos</option></select>
            </label>
            <label className="text-xs font-black uppercase tracking-wider">Plan
              <select value={plan} onChange={(event) => setPlan(event.target.value)} className="mt-2 w-full border-2 border-black bg-white px-3 py-2 text-sm font-bold normal-case"><option value="all">Todos los planes</option>{Object.entries(planLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            </label>
          </div>

          <label className="block text-xs font-black uppercase tracking-wider">Título
            <input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} maxLength={90} placeholder="Ej. Mantención programada de la plataforma" className="mt-2 w-full border-2 border-black px-3 py-3 text-sm font-bold normal-case outline-none focus:shadow-[3px_3px_0_#f97316]" />
          </label>
          <label className="block text-xs font-black uppercase tracking-wider">Mensaje
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} required minLength={10} maxLength={1000} rows={6} placeholder="Explica claramente qué ocurrirá y si los usuarios deben realizar alguna acción." className="mt-2 w-full resize-y border-2 border-black px-3 py-3 text-sm font-bold normal-case outline-none focus:shadow-[3px_3px_0_#f97316]" />
          </label>
          <label className="block text-xs font-black uppercase tracking-wider"><span className="flex items-center gap-1"><FiLink /> Enlace opcional</span>
            <input value={action} onChange={(event) => setAction(event.target.value)} maxLength={200} placeholder="/inicio o https://…" className="mt-2 w-full border-2 border-black px-3 py-3 text-sm font-bold normal-case outline-none focus:shadow-[3px_3px_0_#f97316]" />
          </label>

          <div className="flex flex-col gap-3 border-2 border-black bg-[#fff4a3] p-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-3"><FiUsers className="h-6 w-6" /><span><strong className="block text-2xl">{recipients}</strong><small className="font-black uppercase">destinatarios estimados</small></span></span>
            <button disabled={pending || recipients === 0} className="flex items-center justify-center gap-2 border-2 border-black bg-[#071b34] px-5 py-3 text-xs font-black uppercase text-white shadow-[3px_3px_0_#f97316] disabled:opacity-50"><FiSend /> {pending ? 'Enviando…' : 'Enviar comunicado'}</button>
          </div>

          {feedback && <p className={`flex items-center gap-2 border-2 border-black px-3 py-2 text-sm font-bold ${feedback.ok ? 'bg-[#bffcc6]' : 'bg-[#ffb5e8]'}`}><FiCheckCircle /> {feedback.message}</p>}
        </form>

        <div className="space-y-4">
          <article className="border-4 border-black bg-[#9ee7ff] p-5 shadow-[5px_5px_0_#000]">
            <FiBell className="mb-3 h-7 w-7" />
            <h2 className="text-xl font-black uppercase">Cómo se entrega</h2>
            <p className="mt-2 text-sm font-bold leading-relaxed text-[#071b34]/70">Cada destinatario recibe una notificación individual dentro de su panel. Los filtros de junta, rol y plan se combinan antes de enviar.</p>
          </article>
          <article className="border-4 border-black bg-white shadow-[5px_5px_0_#000]">
            <div className="border-b-4 border-black bg-[#fff4c2] p-4"><h2 className="font-black uppercase">Envíos recientes</h2></div>
            <div className="divide-y-2 divide-black/10">
              {recent.map((item, index) => <div key={`${item.title}-${item.date}-${index}`} className="p-4"><div className="flex items-start justify-between gap-3"><strong className="text-sm">{item.title}</strong><span className="shrink-0 border-2 border-black bg-[#bffcc6] px-2 py-1 text-[10px] font-black">{item.recipients} envíos</span></div><p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{item.message}</p><small className="mt-2 block font-bold text-slate-400">{new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.date))}</small></div>)}
              {!recent.length && <p className="p-8 text-center text-sm font-black text-slate-400">No hay comunicados globales recientes.</p>}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
