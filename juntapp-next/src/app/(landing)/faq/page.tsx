import type { Metadata } from 'next';
import OriginalPublicPage from '@/components/original/OriginalPublicPage';

export const metadata: Metadata = { title: 'Preguntas frecuentes — JuntAPP' };

export default function FAQPage() {
  return <OriginalPublicPage view="faq" />;
}
