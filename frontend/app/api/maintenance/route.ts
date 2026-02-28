import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE =
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ??
  'http://localhost:5000/api';

const buildUrl = (path: string): string =>
  `${BACKEND_API_BASE.replace(/\/$/, '')}${path}`;

const extractForwardHeaders = (request: NextRequest): HeadersInit => {
  const headers: Record<string, string> = {};
  const auth = request.headers.get('authorization');
  if (auth) headers.authorization = auth;
  const cookie = request.headers.get('cookie');
  if (cookie) headers.cookie = cookie;
  return headers;
};

const proxyError = () =>
  NextResponse.json(
    { message: 'Maintenance API is unavailable.' },
    { status: 502 },
  );

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(buildUrl('/maintenance'), {
      method: 'GET',
      headers: extractForwardHeaders(request),
      cache: 'no-store',
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    return NextResponse.json(body, { status: response.status });
  } catch {
    return proxyError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const response = await fetch(buildUrl('/maintenance'), {
      method: 'POST',
      headers: extractForwardHeaders(request),
      body: formData,
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    return NextResponse.json(body, { status: response.status });
  } catch {
    return proxyError();
  }
}
