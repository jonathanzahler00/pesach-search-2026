import type { Metadata, Viewport } from 'next';
import './globals.css';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'Pesach Search — Kosher for Passover?',
  description: 'Search 3,842 products across OU, CRC, and Star-K kosher-for-Passover guides. Instant answers with source links.',
  keywords: 'kosher, passover, pesach, OU, CRC, Star-K, COR, kitniyot, food guide',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {/* Header */}
        <header className="bg-primary-900 text-white sticky top-0 z-50 shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="text-xl sm:text-2xl">🫓</span>
              <div>
                <h1 className="font-display text-base sm:text-lg font-bold leading-tight tracking-wide">
                  Pesach Search
                </h1>
                <p className="text-[9px] sm:text-[10px] text-primary-300 uppercase tracking-widest">
                  5786 · Multi-Source Guide
                </p>
              </div>
            </Link>

            {/* Desktop nav — hidden on mobile */}
            <nav className="hidden sm:flex items-center gap-1 text-sm">
              <Link href="/" className="px-3 py-1.5 rounded-md hover:bg-primary-800 transition-colors">
                Search
              </Link>
              <Link href="/categories" className="px-3 py-1.5 rounded-md hover:bg-primary-800 transition-colors">
                Categories
              </Link>
              <Link href="/documents" className="px-3 py-1.5 rounded-md hover:bg-primary-800 transition-colors">
                Documents
              </Link>
              <Link href="/medicine" className="px-3 py-1.5 rounded-md hover:bg-primary-800 transition-colors">
                Medicine
              </Link>
            </nav>
          </div>
        </header>

        {/* Main content — extra bottom padding on mobile for the bottom nav bar */}
        <main className="max-w-6xl mx-auto px-4 py-4 sm:py-6 pb-24 sm:pb-8 page-transition">
          {children}
        </main>

        {/* Mobile bottom tab navigation */}
        <BottomNav />

        {/* Footer — desktop only */}
        <footer className="hidden sm:block border-t border-primary-100 mt-8 py-6 text-center text-xs text-primary-400">
          <p>Data sourced from OU, CRC, Star-K, and COR Passover guides for 5786 (2026).</p>
          <p className="mt-1">
            This tool is for reference only. Always consult your rabbi for specific halachic questions.
          </p>
        </footer>
      </body>
    </html>
  );
}
