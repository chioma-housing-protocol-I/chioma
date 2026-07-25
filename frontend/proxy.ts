import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Proxy (middleware) — server-side route protection.
 *
 * The auth store mirrors the access token into the `chioma_auth_token`
 * cookie on login, so protected areas can be gated before any client
 * JavaScript runs. Unauthenticated visitors are sent to /login with a
 * `next` param so they return to where they were headed.
 */
export function proxy(request: NextRequest) {
  const authToken = request.cookies.get('chioma_auth_token')?.value;

  if (!authToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set(
      'next',
      request.nextUrl.pathname + request.nextUrl.search,
    );
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/** Only run on areas that require a signed-in user. */
export const config = {
  matcher: [
    '/admin/:path*',
    '/user/:path*',
    '/messages/:path*',
    '/settings/:path*',
  ],
};
