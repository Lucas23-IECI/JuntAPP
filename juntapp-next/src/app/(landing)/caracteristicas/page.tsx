import type { Metadata } from 'next';
import OriginalPublicPage from '@/components/original/OriginalPublicPage';

export const metadata: Metadata = { title: 'Características — JuntAPP' };

export default function CaracteristicasPage() {
  return <OriginalPublicPage view="caracteristicas" />;
}
