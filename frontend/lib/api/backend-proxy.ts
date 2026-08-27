import { NextRequest, NextResponse } from 'next/server';

const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/complete-profile',
  '/auth/preferences',
  '/users',
  '/properties',
  '/payments',
  '/escrow',
  '/messaging',
  '/notifications',
  '/disputes',
  '/kyc',
  '/analytics',
  '/maintenance',
  '/inquiries',
  '/storage',
  '/arbiters',
  '/currencies',
  '/transactions',
  '/audit-logs',
  '/threats',
  '/refunds',
  '/admin',
  '/version',
]);

const REQUEST_HEADERS_ALLOWLIST = new Set([
  'authorization',
  'cookie',
  'content-type',
  'idempotency-key',
  'accept',
  'accept-language',
]);

const RESPONSE_HEADERS_ALLOWLIST = new Set([
  'content-type',
  'set-cookie',
  'cache-control',
  'etag',
  'last-modified',
  'x-request-id',
]);

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

export function getBackendApiBase(): string {
  return (
    process.env.BACKEND_API_BASE_URL ??
    process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ??
    'http://localhost:5000/api/v1'
  ).replace(/\/$/, '');
}

function isPathAllowed(path: string): boolean {
  const normalised = path.replace(/\/+$/, '') || '/';
  if (ALLOWED_PATHS.has(normalised)) return true;
  for (const allowed of ALLOWED_PATHS) {
    if (normalised.startsWith(`${allowed}/`)) return true;
  }
  return false;
}

function forwardHeaders(request: NextRequest): HeadersInit {
  const headers: Record<string, string> = {};
  for (const name of REQUEST_HEADERS_ALLOWLIST) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  return headers;
}

function filterResponseHeaders(source: Headers): Headers {
  const filtered = new Headers();
  source.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) return;
    if (RESPONSE_HEADERS_ALLOWLIST.has(lower)) {
      filtered.set(key, value);
    }
  });
  return filtered;
}

function appendSetCookieHeaders(
  sourceHeaders: Headers,
  targetHeaders: Headers,
): void {
  const headersWithGetSetCookie = sourceHeaders as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headersWithGetSetCookie.getSetCookie === 'function') {
    for (const cookie of headersWithGetSetCookie.getSetCookie()) {
      targetHeaders.append('set-cookie', cookie);
    }
    return;
  }

  const setCookie = sourceHeaders.get('set-cookie');
  if (setCookie) {
    targetHeaders.append('set-cookie', setCookie);
  }
}

export async function proxyToBackend(
  request: NextRequest,
  pathSegments: string[],
): Promise<NextResponse> {
  const path = `/${pathSegments.join('/')}`;

  if (!isPathAllowed(path)) {
    return NextResponse.json(
      { message: 'Not found' },
      { status: 404 },
    );
  }

  const url = new URL(request.url);
  const target = `${getBackendApiBase()}${path}${url.search}`;

  try {
    const init: RequestInit = {
      method: request.method,
      headers: forwardHeaders(request),
      cache: 'no-store',
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const contentType = request.headers.get('content-type') ?? '';
      if (contentType.includes('multipart/form-data')) {
        init.body = await request.formData();
      } else {
        const arrayBuf = await request.arrayBuffer();
        if (arrayBuf.byteLength > MAX_BODY_BYTES) {
          return NextResponse.json(
            { message: 'Request body exceeds 10 MB limit' },
            { status: 413 },
          );
        }
        if (arrayBuf.byteLength > 0) {
          init.body = arrayBuf;
        }
      }
    }

    const response = await fetch(target, init);
    const text = await response.text();
    const responseHeaders = filterResponseHeaders(response.headers);
    appendSetCookieHeaders(response.headers, responseHeaders);

    if (!text) {
      return new NextResponse(null, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    if (responseHeaders.get('content-type')?.includes('application/json')) {
      try {
        const parsed = JSON.parse(text);
        return NextResponse.json(parsed, {
          status: response.status,
          headers: responseHeaders,
        });
      } catch (parseError) {
        console.error(
          `Backend proxy JSON parse failed for ${path}:`,
          parseError,
        );
        return NextResponse.json(
          {
            message: 'Invalid JSON response from backend',
            details: 'Backend returned non-JSON response',
            contentType: responseHeaders.get('content-type'),
          },
          { status: 502, headers: responseHeaders },
        );
      }
    }

    return new NextResponse(text, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`Backend proxy failed for ${path}:`, error);
    return NextResponse.json(
      { message: 'Backend API is unavailable.' },
      { status: 502 },
    );
  }
}
