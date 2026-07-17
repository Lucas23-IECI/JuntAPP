'use client';

import { useEffect } from 'react';
import { driver, type DriveStep } from 'driver.js';
import { usePathname } from 'next/navigation';

const tours: Record<string, DriveStep[]> = {
  inicio: [
    { element: '#view-inicio .view-header', popover: { title: 'Panel de Inicio', description: 'Resumen en tiempo real del estado de tu comunidad.' } },
    { element: '#view-inicio .stats-grid', popover: { title: 'Métricas Vecinales', description: 'Caja disponible, padrón, votaciones y estado de cuota.' } },
    { element: '#view-inicio .split-grid', popover: { title: 'Anuncios y Ayuda', description: 'Revisa comunicados recientes y accesos rápidos.' } },
  ],
  socios: [
    { element: '#view-socios .view-header', popover: { title: 'Padrón de Vecinos', description: 'Administra o consulta la información vecinal según tu rol.' } },
    { element: '#view-socios .roster-grid', popover: { title: 'Fichas de Socios', description: 'Datos, contacto y estado de cuota en tarjetas legibles.' } },
  ],
  tesoreria: [
    { element: '#view-tesoreria .treasury-stats-grid', popover: { title: 'Resumen de Caja', description: 'Balance, ingresos y egresos calculados desde Supabase.' } },
    { element: '#view-tesoreria .charts-grid', popover: { title: 'Gráficos Financieros', description: 'Distribución y evolución de los movimientos.' } },
    { element: '#view-tesoreria .document-center', popover: { title: 'Transparencia', description: 'Documentos oficiales disponibles para los vecinos.' } },
  ],
  votaciones: [
    { element: '#view-votaciones .active-poll-widget', popover: { title: 'Consulta en Curso', description: 'Emite un voto único y consulta los resultados autorizados.' } },
    { element: '#view-votaciones .past-polls-widget', popover: { title: 'Historial', description: 'Revisa las decisiones anteriores de la comunidad.' } },
  ],
  comunicaciones: [
    { element: '#view-comunicaciones .view-header', popover: { title: 'Anuncios Oficiales', description: 'Canal formal de comunicación de la directiva.' } },
    { element: '#view-comunicaciones .announcements-roster', popover: { title: 'Mural de Noticias', description: 'Avisos ordenados por fecha y categoría.' } },
  ],
};

export default function DashboardTour() {
  const pathname = usePathname();
  useEffect(() => {
    const start = (event: MouseEvent) => {
      if (!(event.target as Element).closest('.tour-help-btn')) return;
      const view = pathname.split('/')[1] || 'inicio';
      driver({ showProgress: true, nextBtnText: 'Siguiente', prevBtnText: 'Atrás', doneBtnText: 'Finalizar', progressText: 'Paso {{current}} de {{total}}', popoverClass: 'neo-brutalism-driver', stagePadding: 8, stageRadius: 0, overlayColor: '#031636', overlayOpacity: 0.6, steps: tours[view] ?? tours.inicio }).drive();
    };
    document.addEventListener('click', start);
    return () => document.removeEventListener('click', start);
  }, [pathname]);
  return null;
}
