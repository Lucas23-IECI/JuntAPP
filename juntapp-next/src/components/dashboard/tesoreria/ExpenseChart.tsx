'use client';

import { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { Transaction } from '@/lib/types';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function ExpenseChart({ transactions }: { transactions: Transaction[] }) {
  const expenses = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const item of transactions) {
      const kind = item.accounting_kind ?? (item.type === 'ingreso' ? 'income' : 'expense');
      if (kind === 'expense') {
        const label = categoryLabel(item.category ?? 'otros');
        grouped.set(label, (grouped.get(label) ?? 0) + Math.abs(Number(item.net_amount ?? item.amount)));
      }
      const fee = Number(item.fee_amount ?? 0);
      if (kind === 'income' && fee > 0) grouped.set('Comisiones', (grouped.get('Comisiones') ?? 0) + fee);
    }
    return [...grouped.entries()];
  }, [transactions]);
  const data = useMemo(() => ({ labels: expenses.map(([label]) => label), datasets: [{ data: expenses.map(([, amount]) => amount), backgroundColor: ['#ffb703', '#2563eb', '#16a34a', '#e85d04', '#8b5cf6', '#0891b2'], borderWidth: 0 }] }), [expenses]);
  if (!expenses.length) return <div className="chart-empty">No hay egresos para mostrar.</div>;
  return <Doughnut data={data} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } } }} />;
}

function categoryLabel(category: string) {
  return ({
    cuota_social: 'Cuotas sociales',
    reembolso: 'Reembolsos',
    reembolso_cuota: 'Reembolsos de cuotas',
    contracargo: 'Contracargos',
    mercadopago: 'Mercado Pago',
    otros: 'Otros gastos',
  } as Record<string, string>)[category] ?? category.replaceAll('_', ' ');
}
