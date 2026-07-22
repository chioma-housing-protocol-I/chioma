'use client';

import { create } from 'zustand';
import { withMiddleware } from './middleware';
import type { WebVitalPayload } from '@/lib/web-vitals';

const MAX_ENTRIES = 100;

interface WebVitalsState {
  metrics: WebVitalPayload[];
  addMetric: (payload: WebVitalPayload) => void;
  clear: () => void;
  /** Latest sample per metric name (session). */
  latestByName: () => Partial<Record<string, WebVitalPayload>>;
}

export const useWebVitalsStore = create<WebVitalsState>()(
  withMiddleware(
    (set, get) => ({
      metrics: [],
      addMetric: (payload) =>
        set((state) => {
          state.metrics.unshift(payload);
          if (state.metrics.length > MAX_ENTRIES) {
            state.metrics.length = MAX_ENTRIES;
          }
        }),
      clear: () =>
        set((state) => {
          state.metrics = [];
        }),
      latestByName: () => {
        const map: Partial<Record<string, WebVitalPayload>> = {};
        for (const m of get().metrics) {
          if (!map[m.name]) map[m.name] = m;
        }
        return map;
      },
    }),
    'web-vitals',
  ),
);
