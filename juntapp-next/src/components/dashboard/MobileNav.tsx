'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/inicio', icon: '🏠', label: 'Inicio' },
  { href: '/socios', icon: '👥', label: 'Socios' },
  { href: '/tesoreria', icon: '💰', label: 'Caja' },
  { href: '/votaciones', icon: '🗳️', label: 'Votar' },
  { href: '/comunicaciones', icon: '📢', label: 'Avisos' },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1.5 rounded-lg transition-colors no-underline ${
                isActive
                  ? 'text-primary-lighter'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
