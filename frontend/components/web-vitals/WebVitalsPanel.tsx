'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Gauge, RefreshCw, Trash2 } from 'lucide-react';
import {
  CORE_WEB_VITAL_NAMES,
  type CoreWebVitalName,
  type WebVitalPayload,
  type WebVitalRating,
} from '@/lib/web-vitals';
import { useWebVitalsStore } from '@/store/webVitalsStore';

const METRIC_COPY: Record<CoreWebVitalName, { title: string; hint: string }> = {
  LCP: {
    title: 'Largest Contentful Paint',
    hint: 'How quickly the main content appears',
  },
  CLS: {
    title: 'Cumulative Layout Shift',
    hint: 'Visual stability while the page loads',
  },
  INP: {
    title: 'Interaction to Next Paint',
    hint: 'Responsiveness to clicks and taps',
  },
};

function formatValue(name: string, value: number): string {
  if (name === 'CLS') return value.toFixed(3);
  return `${Math.round(value)}ms`;
}

function ratingLabel(rating: WebVitalRating | 'unknown'): string {
  if (rating === 'needs-improvement') return 'Needs work';
  if (rating === 'unknown') return 'Pending';
  return rating.charAt(0).toUpperCase() + rating.slice(1);
}

function ratingStyles(rating: WebVitalRating | 'unknown'): string {
  switch (rating) {
    case 'good':
      return 'text-brand-green border-brand-green/30 bg-brand-green/10';
    case 'needs-improvement':
      return 'text-brass-300 border-brass-500/30 bg-brass-500/10';
    case 'poor':
      return 'text-ember border-ember/30 bg-ember/10';
    default:
      return 'text-cream-dim border-cream/10 bg-ink-800';
  }
}

function MetricTile({
  name,
  metric,
  index,
}: {
  name: CoreWebVitalName;
  metric?: WebVitalPayload;
  index: number;
}) {
  const copy = METRIC_COPY[name];

  return (
    <motion.div
      data-testid={`web-vital-card-${name}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08 * index }}
      className="py-8 px-6 lg:px-8 text-center lg:text-left"
    >
      <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass-400">
          {name}
        </p>
        {metric ? (
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide ${ratingStyles(metric.rating)}`}
          >
            {ratingLabel(metric.rating)}
          </span>
        ) : null}
      </div>

      <p className="font-display text-4xl md:text-5xl text-cream tabular-nums leading-none">
        {metric ? (
          <span className="text-brass-300">
            {formatValue(name, metric.value)}
          </span>
        ) : (
          <span className="text-cream/25">—</span>
        )}
      </p>

      <p className="mt-3 text-sm text-cream font-medium">{copy.title}</p>
      <p className="mt-1 text-sm text-cream-dim leading-snug">{copy.hint}</p>

      {metric ? (
        <p className="mt-4 font-mono text-[11px] text-cream-dim/70">
          {metric.route}
          <span className="mx-1.5 text-cream/20">·</span>
          {metric.navigationType}
        </p>
      ) : (
        <p className="mt-4 text-xs text-cream-dim/50">
          Waiting for a real-user sample…
        </p>
      )}
    </motion.div>
  );
}

export function WebVitalsPanel() {
  const sessionMetrics = useWebVitalsStore((s) => s.metrics);
  const clear = useWebVitalsStore((s) => s.clear);
  const [serverMetrics, setServerMetrics] = useState<WebVitalPayload[]>([]);
  const [serverLatest, setServerLatest] = useState<
    Partial<Record<string, WebVitalPayload>>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionLatest = useMemo(() => {
    const map: Partial<Record<string, WebVitalPayload>> = {};
    for (const m of sessionMetrics) {
      if (!map[m.name]) map[m.name] = m;
    }
    return map;
  }, [sessionMetrics]);

  const fetchServer = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/web-vitals?limit=50', {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        metrics: WebVitalPayload[];
        latest: Partial<Record<string, WebVitalPayload>>;
      };
      setServerMetrics(data.metrics ?? []);
      setServerLatest(data.latest ?? {});
    } catch {
      setError('Could not load aggregated vitals from the API sink.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Defer so the initial fetch does not setState synchronously in this effect.
    const boot = window.setTimeout(() => {
      void fetchServer();
    }, 0);
    const id = window.setInterval(() => void fetchServer(), 5000);
    return () => {
      window.clearTimeout(boot);
      window.clearInterval(id);
    };
  }, [fetchServer]);

  const displayLatest = useMemo(() => {
    return {
      ...serverLatest,
      ...sessionLatest,
    };
  }, [serverLatest, sessionLatest]);

  const history = useMemo(() => {
    const byId = new Map<string, WebVitalPayload>();
    for (const m of [...sessionMetrics, ...serverMetrics]) {
      const key = `${m.id}:${m.name}:${m.timestamp}`;
      if (!byId.has(key)) byId.set(key, m);
    }
    return Array.from(byId.values()).slice(0, 40);
  }, [sessionMetrics, serverMetrics]);

  return (
    <div data-testid="web-vitals-panel">
      {/* Intro */}
      <section className="relative pt-10 pb-16 lg:pt-14 lg:pb-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl"
            >
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brass-400 mb-6">
                <span className="w-8 rule-glint" aria-hidden />
                Real-user monitoring
              </p>

              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-cream leading-[1.08]">
                How the product{' '}
                <em className="text-brass-300 not-italic border-b-4 border-brass-500/40">
                  feels
                </em>{' '}
                in the wild.
              </h1>

              <p className="mt-6 text-lg text-cream-dim leading-relaxed max-w-xl">
                LCP, CLS, and INP from this session and the local aggregation
                sink. Routes are pathname-only, no query strings, wallets, or
                personal data.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.12 }}
              className="flex flex-wrap items-center gap-3"
            >
              <button
                type="button"
                onClick={() => void fetchServer()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-cream text-ink-900 px-5 py-2.5 text-sm font-semibold hover:bg-brass-300 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                />
                Refresh sink
              </button>
              <button
                type="button"
                onClick={clear}
                className="inline-flex items-center gap-2 rounded-full border border-cream/15 bg-ink-800 px-5 py-2.5 text-sm font-semibold text-cream hover:border-brass-500/40 hover:text-brass-300 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Clear session
              </button>
            </motion.div>
          </div>

          {error ? (
            <p className="mt-6 text-sm text-ember" role="status">
              {error}
            </p>
          ) : null}
        </div>
      </section>

      {/* Core metrics — Stats strip pattern */}
      <section className="relative border-y border-cream/8 bg-ink-800/60">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-cream/8">
            {CORE_WEB_VITAL_NAMES.map((name, index) => (
              <MetricTile
                key={name}
                name={name}
                metric={displayLatest[name]}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* History */}
      <section className="relative py-20 lg:py-28">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="max-w-2xl mb-12"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass-400 mb-4">
              Recent samples
            </p>
            <h2 className="font-display text-3xl md:text-4xl text-cream leading-tight">
              Session store and server ring buffer.
            </h2>
            <p className="mt-3 text-cream-dim text-sm leading-relaxed">
              Anonymized payloads only — metric name, value, rating, and route
              pathname.
            </p>
          </motion.div>

          {history.length === 0 ? (
            <div className="border-t border-cream/8 py-16 text-center">
              <Gauge
                className="mx-auto h-8 w-8 text-brass-400/50 mb-4"
                strokeWidth={1.5}
              />
              <p className="font-display text-2xl text-cream mb-2">
                No samples yet
              </p>
              <p className="text-sm text-cream-dim max-w-md mx-auto">
                Browse a few pages, interact with the UI, then return here. CLS
                and INP often finalize when you switch tabs or leave a page.
              </p>
            </div>
          ) : (
            <div>
              {/* Column labels */}
              <div className="hidden md:grid grid-cols-12 gap-4 border-b border-cream/8 pb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-cream-dim/60">
                <div className="col-span-2">Metric</div>
                <div className="col-span-2">Value</div>
                <div className="col-span-2">Rating</div>
                <div className="col-span-4">Route</div>
                <div className="col-span-2 text-right">Time</div>
              </div>

              <ul>
                {history.map((m, index) => (
                  <motion.li
                    key={`${m.id}-${m.name}-${m.timestamp}`}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{
                      duration: 0.35,
                      delay: Math.min(index, 8) * 0.03,
                    }}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 border-t border-cream/8 py-5 hover:border-brass-500/30 transition-colors"
                  >
                    <div className="md:col-span-2 flex items-center gap-2">
                      <span className="md:hidden text-[11px] uppercase tracking-widest text-cream-dim/50">
                        Metric
                      </span>
                      <span className="text-sm font-semibold text-cream">
                        {m.name}
                      </span>
                    </div>
                    <div className="md:col-span-2 flex items-center gap-2">
                      <span className="md:hidden text-[11px] uppercase tracking-widest text-cream-dim/50">
                        Value
                      </span>
                      <span className="font-display text-xl text-brass-300 tabular-nums">
                        {formatValue(m.name, m.value)}
                      </span>
                    </div>
                    <div className="md:col-span-2 flex items-center gap-2">
                      <span className="md:hidden text-[11px] uppercase tracking-widest text-cream-dim/50">
                        Rating
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${ratingStyles(m.rating)}`}
                      >
                        {ratingLabel(m.rating)}
                      </span>
                    </div>
                    <div className="md:col-span-4 flex items-center gap-2 min-w-0">
                      <span className="md:hidden text-[11px] uppercase tracking-widest text-cream-dim/50">
                        Route
                      </span>
                      <span className="font-mono text-xs text-cream-dim truncate">
                        {m.route}
                      </span>
                    </div>
                    <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-2">
                      <span className="md:hidden text-[11px] uppercase tracking-widest text-cream-dim/50">
                        Time
                      </span>
                      <span className="text-xs text-cream-dim/70 tabular-nums">
                        {new Date(m.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
