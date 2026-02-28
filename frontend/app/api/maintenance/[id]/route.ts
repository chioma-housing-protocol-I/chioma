import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE =
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ??
  'http://localhost:5000/api';

const buildUrl = (path: string): string =>
  `${BACKEND_API_BASE.replace(/\/$/, '')}${path}`;

const extractForwardHeaders = (request: NextRequest): HeadersInit => {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  const auth = request.headers.get('authorization');
  if (auth) headers.authorization = auth;
  const cookie = request.headers.get('cookie');
  if (cookie) headers.cookie = cookie;
  return headers;
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const payload = await request.json();

  try {
    const response = await fetch(buildUrl(`/maintenance/${id}`), {
      method: 'PATCH',
      headers: extractForwardHeaders(request),
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    return NextResponse.json(body, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: 'Maintenance API is unavailable.' },
      { status: 502 },
    );
  }
}
