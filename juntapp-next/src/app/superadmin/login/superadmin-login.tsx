'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiKey, FiMail, FiShield } from 'react-icons/fi';

type LoginStep = 'email' | 'code';

export default function SuperadminLogin() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const body = document.body;
    const previousClasses = body.className;
    body.classList.remove('style-swiss', 'logged-out', 'logged-in', 'role-vecino', 'role-dirigente');
    body.classList.add('superadmin-body');
    return () => {
      body.className = previousClasses;
    };
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  async function requestCode(clearSession = false) {
    const normalizedEmail = email.trim().toLowerCase();
    setError('');
    setNotice('');

    setLoading(true);
    try {
      if (clearSession) {
        await fetch('/api/auth/superadmin-logout', { method: 'POST' });
      }

      const response = await fetch('/api/auth/superadmin-code/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const result = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;

      if (!response.ok) {
        throw new Error(result?.error || result?.message || 'No pudimos enviar el código. Inténtalo nuevamente.');
      }

      setEmail(normalizedEmail);
      setCode('');
      setStep('code');
      setResendCooldown(60);
      setNotice(result?.message || `Si el correo está autorizado, recibirás un código en ${normalizedEmail}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No pudimos enviar el código. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    const token = code.replace(/\D/g, '');
    setError('');
    setNotice('');

    if (token.length !== 6) {
      setError('Ingresa el código completo que recibiste por correo.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/superadmin-code/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: token }),
      });
      const result = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;

      if (!response.ok) {
        throw new Error(result?.error || result?.message || 'El código es incorrecto o ya venció.');
      }

      router.replace('/superadmin');
      router.refresh();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'El código es incorrecto o ya venció.');
      setLoading(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 'email') {
      await requestCode(true);
      return;
    }
    await verifyCode();
  }

  function changeEmail() {
    setStep('email');
    setCode('');
    setError('');
    setNotice('');
    setResendCooldown(0);
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
            <p className="text-xs font-black uppercase tracking-[.16em] text-[#f97316]">
              Paso {step === 'email' ? '1 de 2' : '2 de 2'}
            </p>
            <h2 className="mt-1 text-xl font-black uppercase text-[#071b34]">
              {step === 'email' ? 'Acceso sin contraseña' : 'Revisa tu correo'}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {step === 'email'
                ? 'Escribe tu correo autorizado y te enviaremos un código de acceso temporal.'
                : `Ingresa el código enviado a ${email}.`}
            </p>
          </div>

          {step === 'email' ? (
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-wider text-[#071b34]">Correo</span>
              <span className="relative block">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  className="w-full border-2 border-[#071b34] bg-white py-3 pl-10 pr-3 font-bold outline-none focus:shadow-[3px_3px_0_#f97316]"
                  placeholder="nombre@purocode.com"
                />
              </span>
            </label>
          ) : (
            <>
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-wider text-[#071b34]">Código de acceso</span>
                <span className="relative block">
                  <FiKey className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    minLength={6}
                    maxLength={6}
                    pattern="[0-9]{6}"
                    className="w-full border-2 border-[#071b34] bg-white py-3 pl-10 pr-3 text-center text-2xl font-black tracking-[.32em] outline-none focus:shadow-[3px_3px_0_#f97316]"
                    placeholder="000000"
                  />
                </span>
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-black uppercase">
                <button type="button" onClick={changeEmail} className="flex items-center gap-1 text-slate-500 hover:text-[#071b34]">
                  <FiArrowLeft /> Cambiar correo
                </button>
                <button
                  type="button"
                  onClick={() => void requestCode()}
                  disabled={loading || resendCooldown > 0}
                  className="text-[#f97316] disabled:text-slate-400"
                >
                  {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar código'}
                </button>
              </div>
            </>
          )}

          {notice && (
            <p role="status" className="border-2 border-emerald-900 bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-900">
              {notice}
            </p>
          )}

          {error && (
            <p role="alert" className="border-2 border-red-900 bg-red-100 px-3 py-2 text-sm font-bold text-red-900">
              {error}
            </p>
          )}

          <button
            disabled={loading || (step === 'code' && code.length !== 6)}
            className="flex w-full items-center justify-center gap-2 border-2 border-black bg-[#071b34] px-4 py-3 font-black uppercase text-white shadow-[4px_4px_0_#f97316] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none disabled:opacity-60"
          >
            {step === 'email' ? <FiMail /> : <FiShield />}
            {loading ? 'Procesando…' : step === 'email' ? 'Enviar código' : 'Verificar y entrar'}
          </button>

          <p className="text-center text-xs font-bold text-slate-400">
            El código es de un solo uso y vence automáticamente.
          </p>
        </form>
      </div>
    </main>
  );
}
