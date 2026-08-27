import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  decodeAccessToken,
  getRequiredRoles,
  getRoleRedirectUrl,
  normalizeRole,
} from '@/lib/auth/server-auth';

/**
 * Next.js Proxy — server-side route protection.
 *
 * Auth and role checks run before layouts or page data loaders execute.
 * Client redirect hooks remain for navigation ergonomics only.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    process.env.NODE_ENV === 'production' &&
    pathname.startsWith('/modals-demo')
  ) {
    return NextResponse.rewrite(new URL('/404', request.url));
  }

  const authToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!authToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set(
      'next',
      pathname + request.nextUrl.search,
    );
    return NextResponse.redirect(loginUrl);
  }

  const payload = decodeAccessToken(authToken);
  if (!payload) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set(
      'next',
      pathname + request.nextUrl.search,
    );
    return NextResponse.redirect(loginUrl);
  }

  const role = normalizeRole(payload.role);
  const allowedRoles = getRequiredRoles(pathname);

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return NextResponse.redirect(getRoleRedirectUrl(role, request.url));
  }

  return NextResponse.next();
}

/** Protected areas and dev-only routes handled before rendering. */
export const config = {
  matcher: [
    '/modals-demo',
    '/modals-demo/:path*',
    '/admin/:path*',
    '/user/:path*',
    '/messages/:path*',
    '/settings/:path*',
  ],
};
