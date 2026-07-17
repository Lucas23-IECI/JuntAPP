'use client';

import { useEffect } from 'react';
import type { UserRole } from '@/lib/types';

export default function DashboardBodyState({ role }: { role: UserRole }) {
  useEffect(() => {
    document.body.classList.remove('logged-out', 'role-vecino', 'role-dirigente');
    document.body.classList.add('logged-in', 'style-swiss', `role-${role}`);
    return () => {
      document.body.classList.remove('logged-in', `role-${role}`);
      document.body.classList.add('logged-out');
    };
  }, [role]);

  return null;
}
