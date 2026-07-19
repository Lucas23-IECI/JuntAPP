import type { Metadata } from 'next';
import OriginalPublicPage from '@/components/original/OriginalPublicPage';

export const metadata: Metadata = { title: 'Términos, Condiciones y Privacidad — JuntAPP' };

export default function LegalPage() {
  return <OriginalPublicPage view="legal" />;
}
