/** @type {import('next').NextConfig} */

const pageSecurityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Vercel Web Analytics: debug script (dev) + same-origin /_vercel/insights/script.js (prod)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://images.openfoodfacts.org",
      "frame-src 'self'",
      // Vercel Web Analytics beacons (vitals + dashboard) + product barcode API
      "connect-src 'self' https://world.openfoodfacts.org https://vitals.vercel-insights.com https://vercel.live",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

// Minimal headers for static assets — do NOT apply X-Frame-Options or CSP
// to PDFs/images so browsers can render them in iframes without restrictions.
const staticAssetHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
];

const nextConfig = {
  headers: async () => [
    // Static PDF and image files — no framing restrictions
    {
      source: '/pdfs/:path*',
      headers: staticAssetHeaders,
    },
    {
      source: '/icons/:path*',
      headers: staticAssetHeaders,
    },
    // All other routes get full security headers
    {
      source: '/((?!pdfs|icons).*)',
      headers: pageSecurityHeaders,
    },
  ],
};

module.exports = nextConfig;
