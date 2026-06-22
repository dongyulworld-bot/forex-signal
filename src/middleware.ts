import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionCookie = request.cookies.get('session')?.value;
  const verified = sessionCookie ? await verifySessionToken(sessionCookie) : null;

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!verified) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Prevent logged-in users from seeing /login and /signup
  if (pathname === '/login' || pathname === '/signup') {
    if (verified) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
};
