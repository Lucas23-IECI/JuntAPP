import type { Metadata } from 'next';
import PricingPlans from '@/components/landing/PricingPlans';
import OriginalPublicPage from '@/components/original/OriginalPublicPage';

export const metadata: Metadata = { title: 'Planes y precios — JuntAPP' };

export default function PricingPage() {
  return <OriginalPublicPage><PricingPlans /></OriginalPublicPage>;
}
