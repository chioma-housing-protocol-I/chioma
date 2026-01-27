import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Protected routes that require authentication
 */
const protectedRoutes = ["/dashboard", "/agent", "/settings", "/profile"];

/**
 * Auth routes - redirect to dashboard if already authenticated
 */
const authRoutes = ["/login", "/signup"];

/**
 * Check if a path matches any of the given patterns
 */
function matchesRoute(path: string, routes: string[]): boolean {
  return routes.some(
    (route) => path === route || path.startsWith(route + "/")
  );
}

/**
 * Extract token from cookies
 */
function getAccessToken(request: NextRequest): string | undefined {
  return request.cookies.get("access_token")?.value;
}

/**
 * Check if token is valid (basic check - actual validation happens on API)
 */
function isTokenValid(token: string | undefined): boolean {
  if (!token) return false;

  try {
    // Basic JWT structure validation
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    // Check if token is expired (decode payload without verification)
    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp;

    if (exp && Date.now() >= exp * 1000) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Middleware for route protection and security
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Add security headers to all responses
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Add request ID for tracing
  const requestId =
    request.headers.get("x-request-id") || crypto.randomUUID();
  response.headers.set("X-Request-ID", requestId);

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") // Static files
  ) {
    return response;
  }

  // Get authentication token
  const token = getAccessToken(request);
  const isAuthenticated = isTokenValid(token);

  // Redirect authenticated users away from auth routes
  if (isAuthenticated && matchesRoute(pathname, authRoutes)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Protect authenticated routes
  if (!isAuthenticated && matchesRoute(pathname, protectedRoutes)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

/**
 * Configure which routes use this middleware
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
