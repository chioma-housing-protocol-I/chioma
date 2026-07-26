import { NextRequest, NextResponse } from 'next/server';

export function getBackendApiBase(): string {
  return (
    process.env.BACKEND_API_BASE_URL ??
    process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ??
    'http://localhost:5000/api/v1'
  ).replace(/\/$/, '');
}

function forwardHeaders(request: NextRequest): HeadersInit {
  const headers: Record<string, string> = {};
  const auth = request.headers.get('authorization');
  if (auth) headers.authorization = auth;
  const cookie = request.headers.get('cookie');
  if (cookie) headers.cookie = cookie;
  const contentType = request.headers.get('content-type');
  if (contentType) headers['content-type'] = contentType;
  const idempotencyKey = request.headers.get('idempotency-key');
  if (idempotencyKey) headers['idempotency-key'] = idempotencyKey;
  return headers;
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
        const body = await request.arrayBuffer();
        if (body.byteLength > 0) {
          init.body = body;
        }
      }
    }

    const response = await fetch(target, init);
    const text = await response.text();
    const responseHeaders = new Headers();
    const responseContentType = response.headers.get('content-type');
    if (responseContentType) {
      responseHeaders.set('content-type', responseContentType);
    }
    appendSetCookieHeaders(response.headers, responseHeaders);

    if (!text) {
      return new NextResponse(null, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    if (responseContentType?.includes('application/json')) {
      try {
        const parsed = JSON.parse(text);
        return NextResponse.json(parsed, {
          status: response.status,
          headers: responseHeaders,
        });
      } catch (parseError) {
        console.error(`Backend proxy JSON parse failed for ${path}:`, parseError);
        console.error(`Response text (first 200 chars):`, text.substring(0, 200));
        return NextResponse.json(
          { 
            message: 'Invalid JSON response from backend',
            details: 'Backend returned non-JSON response',
            contentType: responseContentType,
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
