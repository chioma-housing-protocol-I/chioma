import { NextRequest, NextResponse } from 'next/server';
import {
  sanitizeRoute,
  toWebVitalPayload,
  type RawWebVitalMetric,
  type WebVitalPayload,
} from '@/lib/web-vitals';

const MAX_BUFFER = 200;
const MAX_BODY_BYTES = 4_096;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60;
const VALID_WEB_VITAL_NAMES = new Set([
  'CLS',
  'FCP',
  'FID',
  'INP',
  'LCP',
  'TTFB',
]);
/** Hard cap on items accepted from a single batched request. */
const MAX_BATCH_ITEMS = 25;

/** In-process ring buffer for local aggregation / GET dashboard. */
const buffer: WebVitalPayload[] = [];
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function push(payload: WebVitalPayload) {
  buffer.unshift(payload);
  if (buffer.length > MAX_BUFFER) buffer.length = MAX_BUFFER;
}

function clientKey(request: NextRequest): string {
  const forwardedFor = request.headers
    .get('x-forwarded-for')
    ?.split(',')[0]
    ?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  return forwardedFor || realIp || 'unknown';
}

function isRateLimited(request: NextRequest): boolean {
  const key = clientKey(request);
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) return true;
  bucket.count += 1;
  return false;
}

type RawWebVitalBody = RawWebVitalMetric & {
  route?: string;
  timestamp?: string;
};

function isValidBody(body: unknown): body is RawWebVitalBody {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.name === 'string' &&
    VALID_WEB_VITAL_NAMES.has(b.name) &&
    typeof b.value === 'number' &&
    Number.isFinite(b.value) &&
    b.value >= 0 &&
    typeof b.id === 'string' &&
    b.id.length > 0 &&
    b.id.length <= 128 &&
    (b.rating === undefined || typeof b.rating === 'string') &&
    (b.delta === undefined ||
      (typeof b.delta === 'number' && Number.isFinite(b.delta))) &&
    (b.navigationType === undefined || typeof b.navigationType === 'string') &&
    (b.route === undefined || typeof b.route === 'string')
  );
}

function buildPayload(body: RawWebVitalBody): WebVitalPayload {
  const payload = toWebVitalPayload(
    {
      name: body.name,
      value: body.value,
      rating: body.rating,
      delta: body.delta,
      id: body.id,
      navigationType: body.navigationType,
    },
    typeof body.route === 'string' ? body.route : sanitizeRoute('/'),
  );

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
  const contentLength = Number.parseInt(
    request.headers.get('content-length') || '0',
    10,
  );
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  if (isRateLimited(request)) {
    return NextResponse.json(
      { error: 'Too many web vitals submissions' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const items = (Array.isArray(body) ? body : [body]).slice(0, MAX_BATCH_ITEMS);
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
