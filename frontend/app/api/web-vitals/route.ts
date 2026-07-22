import { NextRequest, NextResponse } from 'next/server';
import {
  sanitizeRoute,
  toWebVitalPayload,
  type RawWebVitalMetric,
  type WebVitalPayload,
} from '@/lib/web-vitals';

const MAX_BUFFER = 200;

/** In-process ring buffer for local aggregation / GET dashboard. */
const buffer: WebVitalPayload[] = [];

function push(payload: WebVitalPayload) {
  buffer.unshift(payload);
  if (buffer.length > MAX_BUFFER) buffer.length = MAX_BUFFER;
}

function isValidBody(body: unknown): body is RawWebVitalMetric & {
  route?: string;
  timestamp?: string;
} {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.name === 'string' &&
    typeof b.value === 'number' &&
    Number.isFinite(b.value) &&
    typeof b.id === 'string'
  );
}

/**
 * Ingest anonymized Web Vitals from the browser (sendBeacon / fetch).
 * Re-sanitizes on the server so query strings / entries never stick.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const payload = toWebVitalPayload(
    {
      name: body.name,
      value: body.value,
      rating: typeof body.rating === 'string' ? body.rating : undefined,
      delta: typeof body.delta === 'number' ? body.delta : undefined,
      id: body.id,
      navigationType:
        typeof body.navigationType === 'string'
          ? body.navigationType
          : undefined,
    },
    typeof body.route === 'string' ? body.route : sanitizeRoute('/'),
  );

  // Prefer client-provided sanitized route if already set
  if (typeof body.route === 'string') {
    payload.route = sanitizeRoute(body.route);
  }

  push(payload);

  // Structured log for terminal / log aggregation
  console.info(
    JSON.stringify({
      type: 'web_vital',
      ...payload,
    }),
  );

  return NextResponse.json({ ok: true }, { status: 202 });
}

/**
 * Recent aggregated vitals (this Node process). Useful for local demos
 * and ops dashboards without an external RUM vendor.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const name = searchParams.get('name');
  const limitRaw = searchParams.get('limit');
  const limit = Math.min(
    Math.max(parseInt(limitRaw || '50', 10) || 50, 1),
    MAX_BUFFER,
  );

  let items = buffer;
  if (name) {
    items = buffer.filter((m) => m.name === name);
  }

  const latest: Partial<Record<string, WebVitalPayload>> = {};
  for (const m of buffer) {
    if (!latest[m.name]) latest[m.name] = m;
  }

  return NextResponse.json({
    count: items.length,
    latest,
    metrics: items.slice(0, limit),
  });
}
