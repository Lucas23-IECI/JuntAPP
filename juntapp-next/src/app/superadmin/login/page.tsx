import { redirect } from 'next/navigation';
import { getSuperadminUser, SUPERADMIN_PATH } from '@/lib/superadmin';
import SuperadminLogin from './superadmin-login';
import '../superadmin.css';

export default async function SuperadminLoginPage() {
  const user = await getSuperadminUser();
  if (user) redirect(SUPERADMIN_PATH);
  return <SuperadminLogin />;
}
