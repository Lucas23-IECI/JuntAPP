import type { Metadata } from 'next';
import LoginForm from '@/components/auth/LoginForm';
import OriginalAuthFrame from '@/components/auth/OriginalAuthFrame';

export const metadata: Metadata = { title: 'Iniciar sesión — JuntAPP' };

export default function LoginPage() {
  return <OriginalAuthFrame active="login"><LoginForm /></OriginalAuthFrame>;
}
