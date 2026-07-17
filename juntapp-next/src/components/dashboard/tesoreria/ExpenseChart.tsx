'use client';

import { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { Transaction } from '@/lib/types';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function ExpenseChart({ transactions }: { transactions: Transaction[] }) {
  const expenses = useMemo(() => transactions.filter((item) => item.type === 'egreso'), [transactions]);
  const data = useMemo(() => ({ labels: expenses.map((item) => item.description), datasets: [{ data: expenses.map((item) => Number(item.amount)), backgroundColor: ['#ffb703', '#2563eb', '#16a34a', '#e85d04', '#8b5cf6', '#0891b2'], borderWidth: 0 }] }), [expenses]);
  if (!expenses.length) return <div className="chart-empty">No hay egresos para mostrar.</div>;
  return <Doughnut data={data} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } } }} />;
}
