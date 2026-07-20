'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message === 'Invalid login credentials'
          ? 'Credenciales inválidas. Verifica tu correo y contraseña.'
          : authError.message);
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('role, juntas(subscription_plan)').single();
      const junta = Array.isArray(profile?.juntas) ? profile.juntas[0] : profile?.juntas;
      router.push(profile?.role === 'dirigente' && junta?.subscription_plan === 'web' ? '/mi-pagina' : '/inicio');
      router.refresh();
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form active">
      <div className="form-group">
        <label htmlFor="email" className="form-label">
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="form-input"
          placeholder="tu@correo.cl"
        />
      </div>

      <div className="form-group">
        <label htmlFor="password" className="form-label">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="form-input"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="auth-error-message">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary btn-block btn-lg"
      >
        {loading ? 'Ingresando...' : 'Ingresar'}
      </button>
    </form>
  );
}
