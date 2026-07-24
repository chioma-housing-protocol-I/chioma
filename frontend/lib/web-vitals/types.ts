/**
 * PII-safe Core Web Vitals payload.
 * Never include wallet addresses, emails, query strings, or DOM entries.
 */

export const CORE_WEB_VITAL_NAMES = ['LCP', 'CLS', 'INP'] as const;

export type CoreWebVitalName = (typeof CORE_WEB_VITAL_NAMES)[number];

type KnownWebVitalName = CoreWebVitalName | 'FCP' | 'TTFB' | 'FID';

/** Known vitals plus open string for forward-compat with next/web-vitals. */
export type WebVitalName = KnownWebVitalName | (string & {});

export type WebVitalRating = 'good' | 'needs-improvement' | 'poor';

/** Shape accepted from next/web-vitals Metric (subset we use). */
export interface RawWebVitalMetric {
  name: string;
  value: number;
  rating?: string;
  delta?: number;
  id: string;
  navigationType?: string;
  /** Must never be forwarded — can contain DOM / attribution details. */
  entries?: unknown;
}

export interface WebVitalPayload {
  name: WebVitalName;
  value: number;
  rating: WebVitalRating | 'unknown';
  delta: number;
  id: string;
  navigationType: string;
  /** Pathname only — no query or hash. */
  route: string;
  timestamp: string;
}

export function isCoreWebVitalName(name: string): name is CoreWebVitalName {
  return (CORE_WEB_VITAL_NAMES as readonly string[]).includes(name);
}
