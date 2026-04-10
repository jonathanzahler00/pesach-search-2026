import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_SEASON_ENDED !== 'true') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (pathname === '/') {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/waitlist')) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL('/', request.url));
}

export const config = {
  matcher: [
    '/categories/:path*',
    '/documents/:path*',
    '/medicine/:path*',
    '/scan/:path*',
    '/scan',
    '/categories',
    '/documents',
    '/medicine',
  ],
};
