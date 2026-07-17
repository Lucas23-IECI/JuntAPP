'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AcceptInviteForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(''); const form = new FormData(event.currentTarget); const password = String(form.get('password')); const confirmation = String(form.get('confirmation'));
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); setLoading(false); return; }
    if (password !== confirmation) { setError('Las contraseñas no coinciden.'); setLoading(false); return; }
    const { error: updateError } = await createClient().auth.updateUser({ password });
    if (updateError) { setError('El enlace expiró o no es válido. Solicita una nueva invitación.'); setLoading(false); return; }
    router.push('/inicio'); router.refresh();
  }
  return <form onSubmit={handleSubmit} className="auth-form active"><div className="form-group"><label className="form-label">Nueva contraseña</label><input name="password" type="password" required minLength={8} autoComplete="new-password" className="form-input" /></div><div className="form-group"><label className="form-label">Repite la contraseña</label><input name="confirmation" type="password" required minLength={8} autoComplete="new-password" className="form-input" /></div>{error && <p className="auth-error-message">{error}</p>}<button type="submit" disabled={loading} className="btn btn-primary btn-block btn-lg">{loading ? 'Activando…' : 'Activar cuenta'}</button></form>;
}
