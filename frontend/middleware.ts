import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Middleware — Server-side route protection.
 *
 * Runs before the page is rendered. Checks for the presence of
 * the `chioma_auth_token` cookie (set by AuthContext on login).
 * If missing, redirects to /login with a callbackUrl param.
 *
 * This is the first layer of protection. The ProtectedRoute
 * component provides the second (client-side) layer.
 */
export function middleware(request: NextRequest) {
  const authToken = request.cookies.get('chioma_auth_token')?.value;

  if (!authToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * Matcher — Only run this middleware on dashboard routes.
 * Public pages (/, /properties, /login, /signup, etc.) are NOT affected.
 */
export const config = {
  matcher: ['/landlords/:path*', '/agents/:path*', '/dashboard/:path*'],
};
