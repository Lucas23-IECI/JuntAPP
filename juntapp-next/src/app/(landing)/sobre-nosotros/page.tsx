import type { Metadata } from 'next';
import OriginalPublicPage from '@/components/original/OriginalPublicPage';

export const metadata: Metadata = { title: 'Sobre nosotros — JuntAPP' };

export default function SobreNosotrosPage() {
  return <OriginalPublicPage view="sobreNosotros" />;
}
