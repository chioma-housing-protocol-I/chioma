import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE =
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ??
  'http://localhost:5000/api';

const buildUrl = (path: string): string =>
  `${BACKEND_API_BASE.replace(/\/$/, '')}${path}`;

const extractForwardHeaders = (request: NextRequest): HeadersInit => {
  const headers: Record<string, string> = {
    accept: 'text/event-stream',
  };

  const auth = request.headers.get('authorization');
  if (auth) headers.authorization = auth;
  const cookie = request.headers.get('cookie');
  if (cookie) headers.cookie = cookie;

  return headers;
};

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(buildUrl('/maintenance/stream'), {
      method: 'GET',
      headers: extractForwardHeaders(request),
      cache: 'no-store',
    });

    if (!response.ok || !response.body) {
      return NextResponse.json(
        { message: 'Maintenance stream is unavailable.' },
        { status: 502 },
      );
    }

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
      },
    });
  } catch {
    return NextResponse.json(
      { message: 'Maintenance stream is unavailable.' },
      { status: 502 },
    );
  }
}
