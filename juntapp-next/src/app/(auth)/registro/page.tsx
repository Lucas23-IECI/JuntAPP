import type { Metadata } from 'next';
import RegisterForm from '@/components/auth/RegisterForm';
import OriginalAuthFrame from '@/components/auth/OriginalAuthFrame';

export const metadata: Metadata = { title: 'Registro — JuntAPP' };

export default async function RegistroPage({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const code = (await searchParams).codigo?.trim().toUpperCase() ?? '';
  return <OriginalAuthFrame active="register"><RegisterForm initialInviteCode={code} /></OriginalAuthFrame>;
}
