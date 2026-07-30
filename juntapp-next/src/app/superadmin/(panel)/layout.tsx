import { displayAdminName, requireSuperadmin } from '@/lib/superadmin';
import SuperadminShell from './superadmin-shell';
import '../superadmin.css';

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperadmin();
  return (
    <SuperadminShell name={displayAdminName(user)} email={user.email ?? ''}>
      {children}
    </SuperadminShell>
  );
}
