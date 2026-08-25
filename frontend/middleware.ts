import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE_NAME = 'chioma_auth_token';

const ADMIN_PATH_RE = /^\/admin(?:\/|$)/;

export function middleware(request: NextRequest) {
  if (!ADMIN_PATH_RE.test(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
