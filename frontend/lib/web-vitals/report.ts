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

// ── Batching ────────────────────────────────────────────────────────────────
// Metrics finalize one at a time (LCP, CLS, INP, ...), but sending each as
// its own HTTP request multiplies network overhead for no benefit - the
// server doesn't need to know the instant one lands. Queue them and flush
// as a single request, either after a short coalescing window or
// immediately when the page is hidden/unloaded, since late-finalizing
// metrics like CLS often only settle right as the user navigates away.

const FLUSH_DELAY_MS = 300;
const MAX_BATCH_SIZE = 10;

let queue: WebVitalPayload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function sendBatch(batch: WebVitalPayload[]) {
  if (typeof window === 'undefined' || batch.length === 0) return;

  const body = JSON.stringify(batch);

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

/** Flush any queued metrics immediately, as a single batched request. */
export function flushWebVitals() {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.length === 0) return;

  const batch = queue;
  queue = [];
  sendBatch(batch);
}

function scheduleFlush() {
  if (flushTimer !== null) return;
  flushTimer = setTimeout(flushWebVitals, FLUSH_DELAY_MS);
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushWebVitals();
  });
  window.addEventListener('pagehide', flushWebVitals);
}

/**
 * Report a single Web Vital. Safe for production: no PII, non-throwing.
 * Queued and sent to the server in a batch rather than one request per metric.
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

  queue.push(payload);
  if (queue.length >= MAX_BATCH_SIZE) {
    flushWebVitals();
  } else {
    scheduleFlush();
  }

  return payload;
}
