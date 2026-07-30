'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { FiFilter, FiHome, FiSearch, FiShield, FiUserCheck, FiUsers, FiUserX } from 'react-icons/fi';
import { setUserSuspendedAction } from '../actions';

type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  board_position: string | null;
  cuota_status: string;
  junta_id: string;
  juntaName: string;
  created_at: string;
  suspended: boolean;
  lastSignIn: string | null;
};

export default function UsuariosClient({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesTerm = !term || user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term) || user.juntaName.toLowerCase().includes(term);
      const matchesRole = role === 'all' || user.role === role;
      const matchesStatus = status === 'all' || (status === 'suspended' ? user.suspended : !user.suspended);
      return matchesTerm && matchesRole && matchesStatus;
    });
  }, [role, search, status, users]);

  function toggle(user: UserRow) {
    setBusy(user.id);
    setFeedback('');
    startTransition(async () => {
      const result = await setUserSuspendedAction({ userId: user.id, suspended: !user.suspended });
      setFeedback(result.message);
      setBusy(null);
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-black uppercase tracking-[.18em] text-[#f97316]">Personas</p>
        <h1 className="text-3xl font-black uppercase tracking-tighter sm:text-4xl">Usuarios</h1>
        <p className="mt-1 text-sm font-bold text-slate-500">Gestión transversal de socios y dirigentes.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Total', users.length, 'bg-[#9ee7ff]'],
          ['Dirigentes', users.filter((user) => user.role === 'dirigente').length, 'bg-[#fff4a3]'],
          ['Vecinos', users.filter((user) => user.role === 'vecino').length, 'bg-[#bffcc6]'],
          ['Suspendidos', users.filter((user) => user.suspended).length, 'bg-[#ffb5e8]'],
        ].map(([label, value, color]) => <article key={String(label)} className={`border-4 border-black ${color} p-4 shadow-[4px_4px_0_#000]`}><p className="text-xs font-black uppercase tracking-wider opacity-60">{label}</p><p className="text-3xl font-black">{value}</p></article>)}
      </section>

      <section className="flex flex-wrap gap-3 border-4 border-black bg-white p-4 shadow-[4px_4px_0_#000]">
        <FiFilter className="mt-3 text-slate-400" />
        <label className="relative min-w-[230px] flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nombre, correo o junta…" className="w-full border-2 border-black py-2 pl-9 pr-3 text-sm font-bold outline-none focus:shadow-[3px_3px_0_#f97316]" />
        </label>
        <select value={role} onChange={(event) => setRole(event.target.value)} className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase"><option value="all">Todos los roles</option><option value="dirigente">Dirigentes</option><option value="vecino">Vecinos</option></select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase"><option value="all">Todos los accesos</option><option value="active">Activos</option><option value="suspended">Suspendidos</option></select>
      </section>

      {feedback && <p className="border-2 border-black bg-[#fff4a3] px-3 py-2 text-sm font-bold">{feedback}</p>}

      <section className="grid gap-3 lg:hidden">
        {filtered.map((user) => (
          <article key={user.id} className={`space-y-3 border-4 border-black bg-white p-4 shadow-[4px_4px_0_#000] ${user.suspended ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center border-2 border-black font-black ${user.role === 'dirigente' ? 'bg-[#fff4a3]' : 'bg-[#9ee7ff]'}`}>{user.name.slice(0, 1).toUpperCase()}</span><span className="min-w-0"><strong className="block truncate">{user.name}</strong><small className="block truncate font-bold text-slate-400">{user.email}</small></span></div>
              <span className={`border-2 border-black px-2 py-1 text-[10px] font-black uppercase ${user.suspended ? 'bg-[#ffb5e8]' : 'bg-[#bffcc6]'}`}>{user.suspended ? 'Suspendido' : 'Activo'}</span>
            </div>
            <Link href={`/superadmin/juntas/${user.junta_id}`} className="flex items-center gap-2 text-xs font-black hover:text-[#f97316]"><FiHome /> {user.juntaName}</Link>
            <div className="flex gap-2"><span className="border-2 border-black bg-[#fffaf0] px-2 py-1 text-[10px] font-black uppercase">{user.board_position ?? user.role}</span><span className="border-2 border-black bg-[#fffaf0] px-2 py-1 text-[10px] font-black uppercase">Cuota {user.cuota_status === 'al_dia' ? 'al día' : 'pendiente'}</span></div>
            <button disabled={pending || busy === user.id} onClick={() => toggle(user)} className={`flex items-center gap-2 border-2 border-black px-3 py-2 text-xs font-black uppercase shadow-[2px_2px_0_#000] ${user.suspended ? 'bg-[#bffcc6]' : 'bg-[#ffb5e8]'}`}>{user.suspended ? <FiUserCheck /> : <FiUserX />}{busy === user.id ? 'Procesando…' : user.suspended ? 'Restaurar acceso' : 'Suspender acceso'}</button>
          </article>
        ))}
      </section>

      <section className="hidden overflow-x-auto border-4 border-black bg-white shadow-[6px_6px_0_#000] lg:block">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="border-b-4 border-black bg-[#fff4c2] text-left text-xs font-black uppercase tracking-wider"><tr><th className="px-5 py-4">Usuario</th><th className="px-4 py-4">Rol</th><th className="px-4 py-4">Junta</th><th className="px-4 py-4">Cuota</th><th className="px-4 py-4">Último acceso</th><th className="px-4 py-4">Estado</th><th /></tr></thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id} className={`border-b-2 border-black/10 hover:bg-[#fffaf0] ${user.suspended ? 'opacity-60' : ''}`}>
                <td className="px-5 py-4"><div className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center border-2 border-black font-black ${user.role === 'dirigente' ? 'bg-[#fff4a3]' : 'bg-[#9ee7ff]'}`}>{user.name.slice(0, 1).toUpperCase()}</span><span><strong className="block">{user.name}</strong><small className="font-bold text-slate-400">{user.email}</small></span></div></td>
                <td className="px-4 py-4"><span className="inline-flex items-center gap-1 border-2 border-black bg-[#fffaf0] px-2 py-1 text-[10px] font-black uppercase">{user.role === 'dirigente' && <FiShield />}{user.board_position ?? user.role}</span></td>
                <td className="px-4 py-4"><Link href={`/superadmin/juntas/${user.junta_id}`} className="flex items-center gap-1 font-bold hover:text-[#f97316]"><FiHome /> {user.juntaName}</Link></td>
                <td className="px-4 py-4"><span className={`border-2 border-black px-2 py-1 text-[10px] font-black uppercase ${user.cuota_status === 'al_dia' ? 'bg-[#bffcc6]' : 'bg-[#fff4a3]'}`}>{user.cuota_status === 'al_dia' ? 'Al día' : 'Pendiente'}</span></td>
                <td className="px-4 py-4 text-xs font-bold text-slate-400">{user.lastSignIn ? new Intl.DateTimeFormat('es-CL').format(new Date(user.lastSignIn)) : 'Nunca'}</td>
                <td className="px-4 py-4"><span className={`border-2 border-black px-2 py-1 text-[10px] font-black uppercase ${user.suspended ? 'bg-[#ffb5e8]' : 'bg-[#bffcc6]'}`}>{user.suspended ? 'Suspendido' : 'Activo'}</span></td>
                <td className="px-4 py-4"><button disabled={pending || busy === user.id} onClick={() => toggle(user)} title={user.suspended ? 'Restaurar acceso' : 'Suspender acceso'} className={`grid h-9 w-9 place-items-center border-2 border-black shadow-[2px_2px_0_#000] ${user.suspended ? 'bg-[#bffcc6]' : 'bg-[#ffb5e8]'}`}>{busy === user.id ? '…' : user.suspended ? <FiUserCheck /> : <FiUserX />}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {!filtered.length && <div className="border-4 border-black bg-white py-16 text-center shadow-[4px_4px_0_#000]"><FiUsers className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-black text-slate-400">No hay usuarios con esos filtros.</p></div>}
    </div>
  );
}
