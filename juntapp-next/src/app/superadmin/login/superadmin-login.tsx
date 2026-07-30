'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiLock, FiMail, FiShield } from 'react-icons/fi';
import { createClient } from '@/lib/supabase/client';

export default function SuperadminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const body = document.body;
    const previousClasses = body.className;
    body.classList.remove('style-swiss', 'logged-out', 'logged-in', 'role-vecino', 'role-dirigente');
    body.classList.add('superadmin-body');
    return () => {
      body.className = previousClasses;
    };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !data.user) {
      setError('Credenciales inválidas o acceso no autorizado.');
      setLoading(false);
      return;
    }

    const metadata = data.user.app_metadata ?? {};
    const isMetadataAdmin =
      metadata.role === 'superadmin' ||
      metadata.platform_role === 'superadmin' ||
      metadata.is_superadmin === true;

    if (!isMetadataAdmin) {
      // El servidor también admite la lista privada SUPERADMIN_EMAILS.
      // Dejamos que el layout protegido haga esa comprobación sin exponerla.
      const response = await fetch('/superadmin', { method: 'GET' });
      if (response.redirected && response.url.includes('/superadmin/login')) {
        await supabase.auth.signOut();
        setError('Tu cuenta no tiene permisos de superadmin.');
        setLoading(false);
        return;
      }
    }

    router.replace('/superadmin');
    router.refresh();
  }

  return (
    <main className="superadmin-root relative grid min-h-screen place-items-center overflow-hidden bg-[#071b34] px-5 py-12">
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#f97316_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="relative w-full max-w-md">
        <div className="mb-5 flex items-end justify-between border-4 border-black bg-[#f97316] p-5 shadow-[7px_7px_0_#000]">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#071b34]/65">JuntAPP</p>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-[#071b34]">Control central</h1>
          </div>
          <FiShield className="h-10 w-10 text-[#071b34]" />
        </div>

        <form onSubmit={submit} className="space-y-5 border-4 border-black bg-[#fffaf0] p-6 shadow-[7px_7px_0_#f97316]">
          <div>
            <h2 className="text-xl font-black uppercase text-[#071b34]">Acceso restringido</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Solo cuentas autorizadas pueden administrar toda la plataforma.
            </p>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-wider text-[#071b34]">Correo</span>
            <span className="relative block">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="w-full border-2 border-[#071b34] bg-white py-3 pl-10 pr-3 font-bold outline-none focus:shadow-[3px_3px_0_#f97316]"
                placeholder="admin@juntapp.cl"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-wider text-[#071b34]">Contraseña</span>
            <span className="relative block">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                className="w-full border-2 border-[#071b34] bg-white py-3 pl-10 pr-3 font-bold outline-none focus:shadow-[3px_3px_0_#f97316]"
                placeholder="••••••••"
              />
            </span>
          </label>

          {error && (
            <p className="border-2 border-red-900 bg-red-100 px-3 py-2 text-sm font-bold text-red-900">{error}</p>
          )}

          <button
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 border-2 border-black bg-[#071b34] px-4 py-3 font-black uppercase text-white shadow-[4px_4px_0_#f97316] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none disabled:opacity-60"
          >
            <FiShield />
            {loading ? 'Verificando…' : 'Entrar al panel'}
          </button>
        </form>
      </div>
    </main>
  );
}
