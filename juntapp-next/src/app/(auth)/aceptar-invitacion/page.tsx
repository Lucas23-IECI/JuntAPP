import type { Metadata } from 'next';
import AcceptInviteForm from '@/components/auth/AcceptInviteForm';
import OriginalAuthFrame from '@/components/auth/OriginalAuthFrame';

export const metadata: Metadata = { title: 'Aceptar invitación — JuntAPP' };

export default function AcceptInvitePage() {
  return <OriginalAuthFrame active="login"><div className="auth-invite-copy"><h3>Activa tu cuenta</h3><p>Crea una contraseña para volver a ingresar a JuntAPP cuando quieras.</p></div><AcceptInviteForm /></OriginalAuthFrame>;
}
