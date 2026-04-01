import type { Metadata, Viewport } from 'next';
import { Playfair_Display, DM_Sans } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import ServiceWorker from '@/components/ServiceWorker';
import FeedbackButton from '@/components/FeedbackButton';
import { Analytics } from '@vercel/analytics/next';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-playfair',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Pesach Search | Kosher for Pesach?',
  description: 'Is it Kosher for Pesach? Search 4,042 products from OU, CRC, Star-K & COR instantly. Scan barcodes or search by name.',
  keywords: 'kosher, pesach, OU, CRC, Star-K, COR, kitniyot, food guide',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Pesach Search',
    startupImage: '/icons/icon-512.png',
  },
  icons: {
    apple: '/icons/icon-192.png',
    icon: '/icons/icon-512.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1a2744',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`min-h-screen ${playfair.variable} ${dmSans.variable}`}>
        <ServiceWorker />

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
              <Link href="/scan" className="ml-1 px-3 py-1.5 rounded-md bg-gold-500 hover:bg-gold-400 text-primary-900 font-semibold transition-colors">
                📷 Scan
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

        {/* Floating feedback button */}
        <FeedbackButton />

        <Analytics />

        {/* Footer */}
        <footer className="border-t border-primary-100 mt-8 py-6 pb-24 sm:pb-6 text-center text-xs text-primary-400">
          <p>Data sourced from OU, CRC, Star-K, and COR Pesach guides for 5786 (2026).</p>
          <p className="mt-1">
            This tool is for reference only. Always consult your rabbi for specific halachic questions.
          </p>
          <p className="mt-2">&copy; worthwhileapps.com</p>
        </footer>
      </body>
    </html>
  );
}
