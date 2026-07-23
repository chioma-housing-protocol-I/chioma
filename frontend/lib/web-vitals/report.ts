import { toWebVitalPayload } from './sanitize';
import type { RawWebVitalMetric, WebVitalPayload } from './types';

declare global {
  interface Window {
    __CHIOMA_WEB_VITALS_REPORTER__?: (payload: WebVitalPayload) => void;
  }
}

export type WebVitalSink = (payload: WebVitalPayload) => void;

let extraSink: WebVitalSink | null = null;

/** Register an in-app sink (e.g. zustand store). */
export function setWebVitalSink(sink: WebVitalSink | null) {
  extraSink = sink;
}

function postToApi(payload: WebVitalPayload) {
  if (typeof window === 'undefined') return;

  const body = JSON.stringify(payload);

  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      const sent = navigator.sendBeacon('/api/web-vitals', blob);
      if (sent) return;
    }
  } catch {
    // fall through to fetch
  }

  void fetch('/api/web-vitals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Swallow network errors — vitals must never break the app
  });
}

/**
 * Report a single Web Vital. Safe for production: no PII, non-throwing.
 */
export function reportWebVital(
  metric: RawWebVitalMetric,
  route?: string | null,
) {
  const payload = toWebVitalPayload(
    metric,
    route ??
      (typeof window !== 'undefined' ? window.location.pathname : undefined),
  );

  if (process.env.NODE_ENV !== 'production') {
    console.info('[Chioma Web Vital]', payload);
  }

  try {
    extraSink?.(payload);
  } catch {
    // ignore sink failures
  }

  if (typeof window !== 'undefined' && window.__CHIOMA_WEB_VITALS_REPORTER__) {
    try {
      window.__CHIOMA_WEB_VITALS_REPORTER__(payload);
    } catch {
      // ignore external reporter failures
    }
  }

  postToApi(payload);

  return payload;
}
