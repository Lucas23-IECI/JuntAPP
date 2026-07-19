import type { Metadata } from 'next';
import RegisterForm from '@/components/auth/RegisterForm';
import OriginalAuthFrame from '@/components/auth/OriginalAuthFrame';

export const metadata: Metadata = { title: 'Registro — JuntAPP' };

export default async function RegistroPage({ searchParams }: { searchParams: Promise<{ codigo?: string; plan?: string; whatsapp?: string }> }) {
  const query = await searchParams;
  const code = query.codigo?.trim().toUpperCase() ?? '';
  return <OriginalAuthFrame active="register"><RegisterForm initialInviteCode={code} initialPlan={query.plan} initialWhatsapp={query.whatsapp === '1'} /></OriginalAuthFrame>;
}
