import type { Metadata } from 'next';
import Link from 'next/link';
import OriginalAuthFrame from '@/components/auth/OriginalAuthFrame';

export const metadata: Metadata = {
  title: 'Confirmar acceso — JuntAPP',
  robots: { index: false, follow: false },
};

const allowedTypes = new Set(['invite', 'recovery', 'signup', 'magiclink', 'email_change', 'email']);

export default async function ConfirmAccessPage({ searchParams }: PageProps<'/confirmar-acceso'>) {
  const query = await searchParams;
  const tokenHash = typeof query.token_hash === 'string' ? query.token_hash : '';
  const type = typeof query.type === 'string' ? query.type : '';
  const errorCode = typeof query.error === 'string' ? query.error : '';
  const valid = Boolean(tokenHash) && allowedTypes.has(type);
  const errorMessage = errorCode === 'password'
    ? 'La contraseña debe tener al menos 8 caracteres y ambas copias deben coincidir.'
    : errorCode === 'expired'
      ? 'El enlace expiró o ya fue utilizado. Solicita un nuevo correo de acceso.'
      : '';

  return (
    <OriginalAuthFrame active="login">
      <div className="auth-invite-copy">
        <h3>{valid ? 'Confirma tu acceso' : 'Enlace no válido'}</h3>
        <p>
          {valid
            ? 'Crea tu contraseña para activar la cuenta e ingresar a JuntAPP.'
            : 'Este enlace está incompleto o ya no es válido. Solicita uno nuevo desde el inicio de sesión.'}
        </p>
      </div>
      {valid ? (
        <form action="/auth/confirm" method="post" className="auth-form active">
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={type} />
          <div className="form-group">
            <label htmlFor="password" className="form-label">Nueva contraseña</label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="form-input" />
          </div>
          <div className="form-group">
            <label htmlFor="confirmation" className="form-label">Repite la contraseña</label>
            <input id="confirmation" name="confirmation" type="password" required minLength={8} autoComplete="new-password" className="form-input" />
          </div>
          {errorMessage && <p className="auth-error-message">{errorMessage}</p>}
          <button type="submit" className="btn btn-primary btn-block btn-lg">
            Crear contraseña y entrar
          </button>
        </form>
      ) : (
        <Link href="/login" className="btn btn-primary btn-block btn-lg">
          Volver al inicio de sesión
        </Link>
      )}
    </OriginalAuthFrame>
  );
}
