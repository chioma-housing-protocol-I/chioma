import { NextRequest, NextResponse } from 'next/server';
import {
  sanitizeRoute,
  toWebVitalPayload,
  type RawWebVitalMetric,
  type WebVitalPayload,
} from '@/lib/web-vitals';

const MAX_BUFFER = 200;
/** Hard cap on items accepted from a single batched request. */
const MAX_BATCH_ITEMS = 25;

/** In-process ring buffer for local aggregation / GET dashboard. */
const buffer: WebVitalPayload[] = [];

function push(payload: WebVitalPayload) {
  buffer.unshift(payload);
  if (buffer.length > MAX_BUFFER) buffer.length = MAX_BUFFER;
}

type RawWebVitalBody = RawWebVitalMetric & { route?: string; timestamp?: string };

function isValidBody(body: unknown): body is RawWebVitalBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.name === 'string' &&
    typeof b.value === 'number' &&
    Number.isFinite(b.value) &&
    typeof b.id === 'string'
  );
}

function buildPayload(body: RawWebVitalBody): WebVitalPayload {
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

  return payload;
}

/**
 * Ingest anonymized Web Vitals from the browser (sendBeacon / fetch).
 * Re-sanitizes on the server so query strings / entries never stick.
 *
 * Accepts either a single metric object (legacy shape) or an array of
 * metrics (the client batches multiple metrics into one request rather
 * than sending one per event). Invalid items within a batch are skipped
 * rather than failing the whole request; only an empty/all-invalid body
 * is rejected.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const items = (Array.isArray(body) ? body : [body]).slice(
    0,
    MAX_BATCH_ITEMS,
  );
  const validItems = items.filter(isValidBody);

  if (validItems.length === 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  for (const item of validItems) {
    const payload = buildPayload(item);
    push(payload);

    // Structured log for terminal / log aggregation
    console.info(
      JSON.stringify({
        type: 'web_vital',
        ...payload,
      }),
    );
  }

  return NextResponse.json(
    { ok: true, received: validItems.length },
    { status: 202 },
  );
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
