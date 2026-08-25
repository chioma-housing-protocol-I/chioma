import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE =
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ??
  'http://localhost:5000/api';

const HEARTBEAT_INTERVAL_MS = 15_000;
const MAX_CONNECTIONS_PER_CLIENT = 3;
const connectionCounts = new Map<string, number>();

const encoder = new TextEncoder();

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

function getConnectionKey(request: NextRequest): string {
  const auth = request.headers.get('authorization');
  if (auth) return `auth:${auth.slice(0, 80)}`;

  const cookie = request.headers.get('cookie');
  if (cookie) return `cookie:${cookie.slice(0, 120)}`;

  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  return `ip:${forwardedFor || realIp || 'unknown'}`;
}

function acquireConnection(key: string): boolean {
  const current = connectionCounts.get(key) ?? 0;
  if (current >= MAX_CONNECTIONS_PER_CLIENT) return false;
  connectionCounts.set(key, current + 1);
  return true;
}

function releaseConnection(key: string) {
  const current = connectionCounts.get(key) ?? 0;
  if (current <= 1) {
    connectionCounts.delete(key);
    return;
  }
  connectionCounts.set(key, current - 1);
}

export async function GET(request: NextRequest) {
  const connectionKey = getConnectionKey(request);
  if (!acquireConnection(connectionKey)) {
    return NextResponse.json(
      { message: 'Too many maintenance stream connections.' },
      { status: 429 },
    );
  }

  const upstreamAbort = new AbortController();
  const release = () => {
    upstreamAbort.abort();
    releaseConnection(connectionKey);
  };

  try {
    const response = await fetch(buildUrl('/maintenance/stream'), {
      method: 'GET',
      headers: extractForwardHeaders(request),
      cache: 'no-store',
      signal: upstreamAbort.signal,
    });

    if (!response.ok || !response.body) {
      release();
      return NextResponse.json(
        { message: 'Maintenance stream is unavailable.' },
        { status: 502 },
      );
    }

    const reader = response.body.getReader();
    let released = false;
    let closed = false;
    let heartbeat: ReturnType<typeof setInterval> | undefined;

    const cleanup = () => {
      if (released) return;
      released = true;
      if (heartbeat) clearInterval(heartbeat);
      release();
      reader.cancel().catch(() => undefined);
    };

    request.signal.addEventListener('abort', cleanup, { once: true });

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        heartbeat = setInterval(() => {
          if (!closed) {
            controller.enqueue(encoder.encode(': heartbeat\n\n'));
          }
        }, HEARTBEAT_INTERVAL_MS);

        const pump = async () => {
          try {
            while (!released) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) controller.enqueue(value);
            }
            if (!closed) {
              closed = true;
              controller.close();
            }
          } catch (error) {
            if (!closed) {
              closed = true;
              controller.error(error);
            }
          } finally {
            cleanup();
          }
        };

        pump();
      },
      cancel() {
        closed = true;
        cleanup();
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
      },
    });
  } catch {
    release();
    return NextResponse.json(
      { message: 'Maintenance stream is unavailable.' },
      { status: 502 },
    );
  }
}
