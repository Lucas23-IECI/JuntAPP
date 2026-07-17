import type { Metadata } from 'next';
import RegisterForm from '@/components/auth/RegisterForm';
import OriginalAuthFrame from '@/components/auth/OriginalAuthFrame';

export const metadata: Metadata = { title: 'Registro — JuntAPP' };

export default function RegistroPage() {
  return <OriginalAuthFrame active="register"><RegisterForm /></OriginalAuthFrame>;
}
