'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Profile, Junta } from '@/lib/types';

const navItems = [
  { href: '/inicio', icon: '🏠', label: 'Inicio' },
  { href: '/socios', icon: '👥', label: 'Socios' },
  { href: '/tesoreria', icon: '💰', label: 'Tesorería' },
  { href: '/votaciones', icon: '🗳️', label: 'Votaciones' },
  { href: '/comunicaciones', icon: '📢', label: 'Comunicaciones' },
];

interface SidebarProps {
  profile: Profile;
  junta: Junta | null;
}

export default function Sidebar({ profile, junta }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-sidebar text-white flex-col z-40">
      {/* Brand */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-sm">JA</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold">JuntAPP</span>
            <span className="text-[11px] text-gray-400 truncate max-w-[140px]">
              {junta?.name || 'Sin Junta'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all no-underline ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 bg-primary-lighter rounded-full flex items-center justify-center text-sm font-bold text-white">
            {profile.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile.name}</p>
            <p className="text-[11px] text-gray-400">
              {profile.role === 'dirigente' ? 'Dirigente' : 'Vecino'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
