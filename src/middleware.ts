import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * SECURITY NOTICE: This middleware is NOT the security boundary.
 * It only provides UX redirects based on cookie presence.
 *
 * ALL actual authentication and authorization is enforced in:
 * - Server layouts (/review/layout.tsx, /apply/layout.tsx)
 * - Individual API route handlers
 *
 * This middleware cannot and does not:
 * - Verify session tokens (requires database access, not available in Edge Runtime)
 * - Check user roles or TOTP verification status
 * - Provide any security guarantees
 *
 * It exists ONLY to improve UX by redirecting unauthenticated users to /login
 * before they hit protected pages.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get session cookie (we only check if it exists, not if it's valid)
  const hasSessionCookie = !!request.cookies.get('session');

  // UX redirect: if accessing protected routes without a session cookie, redirect to login
  // This is NOT security enforcement — it's just for better UX
  if (pathname.startsWith('/review') || pathname.startsWith('/apply')) {
    if (!hasSessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/review/:path*',
    '/apply/:path*',
  ],
};
