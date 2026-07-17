import type { Metadata } from 'next';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import './globals.css';
import '@/styles/original/style.css';
import 'driver.js/dist/driver.css';

export const metadata: Metadata = {
  title: 'JuntAPP — Gestión Vecinal Digital',
  description: 'Plataforma digital para la gestión y transparencia de Juntas de Vecinos en Chile.',
  keywords: ['junta de vecinos', 'chile', 'gestión vecinal', 'transparencia', 'votaciones'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="style-swiss logged-out">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
