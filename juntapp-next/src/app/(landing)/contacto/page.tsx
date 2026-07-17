import type { Metadata } from 'next';
import OriginalPublicPage from '@/components/original/OriginalPublicPage';

export const metadata: Metadata = { title: 'Contacto — JuntAPP' };

export default function ContactoPage() {
  return <OriginalPublicPage view="contacto" />;
}
