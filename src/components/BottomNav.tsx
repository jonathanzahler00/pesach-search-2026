'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: 'Search', icon: '🔍' },
  { href: '/categories', label: 'Browse', icon: '📂' },
  { href: '/scan', label: 'Scan', icon: '📷', highlight: true },
  { href: '/documents', label: 'Guides', icon: '📄' },
  { href: '/medicine', label: 'Medicine', icon: '💊' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
      <div className="grid grid-cols-5 h-16">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href ||
            (tab.href !== '/' && pathname.startsWith(tab.href));

          if (tab.highlight) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center justify-center gap-0.5"
              >
                <span className={`
                  flex items-center justify-center w-11 h-8 rounded-full text-base
                  transition-colors
                  ${isActive
                    ? 'bg-primary-900 text-white'
                    : 'bg-primary-100 text-primary-800'
                  }
                `}>
                  {tab.icon}
                </span>
                <span className={`text-[9px] font-semibold ${isActive ? 'text-primary-900' : 'text-primary-500'}`}>
                  {tab.label}
                </span>
              </Link>
            );
          }

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
