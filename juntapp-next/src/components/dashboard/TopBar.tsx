'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Junta, Notification } from '@/lib/types';

interface TopBarProps {
  profile: Profile;
  junta: Junta | null;
}

export default function TopBar({ profile, junta }: TopBarProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  async function toggleNotifications() {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    if (!nextOpen) return;

    const supabase = createClient();
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('date', { ascending: false })
      .limit(10);
    setNotifications(data ?? []);
  }

  async function openNotification(notification: Notification) {
    if (!notification.read) {
      const supabase = createClient();
      await supabase.from('notifications').update({ read: true }).eq('id', notification.id);
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read: true } : item));
    }
    if (notification.action?.startsWith('/')) {
      setNotificationsOpen(false);
      router.push(notification.action);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left: Junta name (mobile) */}
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">JA</span>
          </div>
          <span className="text-sm font-semibold text-gray-900 truncate max-w-[160px]">
            {junta?.name || 'JuntAPP'}
          </span>
        </div>

        {/* Left: Breadcrumb (desktop) */}
        <div className="hidden lg:flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {junta?.name || 'Mi Junta'}
          </span>
          {junta?.invite_code && (
            <span className="px-2 py-0.5 bg-primary-subtle text-primary-lighter text-[10px] font-mono font-medium rounded-md">
              {junta.invite_code}
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="relative flex items-center gap-3">
          <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
            profile.role === 'dirigente'
              ? 'bg-orange/10 text-orange'
              : 'bg-primary-subtle text-primary-lighter'
          }`}>
            {profile.role === 'dirigente' ? '⭐ Dirigente' : '👤 Vecino'}
          </span>

          <button
            type="button"
            onClick={toggleNotifications}
            className="relative flex min-h-11 min-w-11 items-center justify-center rounded-xl text-lg text-gray-600 transition-colors hover:bg-gray-100"
            aria-label="Ver notificaciones"
            aria-expanded={notificationsOpen}
          >
            🔔
            {notifications.some((notification) => !notification.read) && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
            )}
          </button>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Salir
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">Notificaciones</p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length ? notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => openNotification(notification)}
                    className={`block w-full border-b border-gray-50 px-4 py-3 text-left last:border-0 hover:bg-gray-50 ${notification.read ? '' : 'bg-primary-subtle/60'}`}
                  >
                    <span className="block text-sm font-medium text-gray-900">{notification.title}</span>
                    <span className="mt-1 line-clamp-2 block text-xs leading-5 text-gray-500">{notification.message}</span>
                  </button>
                )) : (
                  <p className="px-4 py-8 text-center text-sm text-gray-500">No tienes notificaciones.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
