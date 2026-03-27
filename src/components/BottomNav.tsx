'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: 'Search', icon: '🔍' },
  { href: '/categories', label: 'Browse', icon: '📂' },
  { href: '/documents', label: 'Guides', icon: '📄' },
  { href: '/medicine', label: 'Medicine', icon: '💊' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
      <div className="grid grid-cols-4 h-16">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href ||
            (tab.href !== '/' && pathname.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors
                ${isActive
                  ? 'text-primary-900 border-t-2 border-primary-900'
                  : 'text-gray-400 border-t-2 border-transparent'
                }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
