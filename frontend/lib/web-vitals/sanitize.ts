import type {
  RawWebVitalMetric,
  WebVitalPayload,
  WebVitalRating,
} from './types';

const ALLOWED_RATINGS: readonly WebVitalRating[] = [
  'good',
  'needs-improvement',
  'poor',
];

/**
 * Strip query/hash and reject absolute URLs so metrics never carry PII
 * from search params (wallet, email, tokens, etc.).
 */
export function sanitizeRoute(input?: string | null): string {
  if (!input || typeof input !== 'string') return '/';

  let path = input.trim();

  try {
    if (/^https?:\/\//i.test(path)) {
      path = new URL(path).pathname;
    }
  } catch {
    return '/';
  }

  const q = path.indexOf('?');
  if (q !== -1) path = path.slice(0, q);
  const h = path.indexOf('#');
  if (h !== -1) path = path.slice(0, h);

  path = path.replace(/\/{2,}/g, '/');
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

  return path || '/';
}

function toRating(rating?: string): WebVitalRating | 'unknown' {
  if (rating && (ALLOWED_RATINGS as readonly string[]).includes(rating)) {
    return rating as WebVitalRating;
  }
  return 'unknown';
}

/**
 * Build a PII-safe payload. Explicitly omits `entries` and any user identifiers.
 */
export function toWebVitalPayload(
  metric: RawWebVitalMetric,
  route?: string | null,
): WebVitalPayload {
  return {
    name: metric.name,
    value: Number.isFinite(metric.value) ? metric.value : 0,
    rating: toRating(metric.rating),
    delta: Number.isFinite(metric.delta) ? (metric.delta as number) : 0,
    id: typeof metric.id === 'string' ? metric.id.slice(0, 64) : 'unknown',
    navigationType:
      typeof metric.navigationType === 'string'
        ? metric.navigationType
        : 'unknown',
    route: sanitizeRoute(route),
    timestamp: new Date().toISOString(),
  };
}
