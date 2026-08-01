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
  const valid = Boolean(tokenHash) && allowedTypes.has(type);

  return (
    <OriginalAuthFrame active="login">
      <div className="auth-invite-copy">
        <h3>{valid ? 'Confirma tu acceso' : 'Enlace no válido'}</h3>
        <p>
          {valid
            ? 'Presiona continuar para verificar el enlace y crear tu contraseña de JuntAPP.'
            : 'Este enlace está incompleto o ya no es válido. Solicita uno nuevo desde el inicio de sesión.'}
        </p>
      </div>
      {valid ? (
        <form action="/auth/confirm" method="post" className="auth-form active">
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={type} />
          <button type="submit" className="btn btn-primary btn-block btn-lg">
            Continuar y crear contraseña
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
