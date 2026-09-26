'use client';

import { create } from 'zustand';
import { withMiddleware } from './middleware';
import { cancellationManager } from '@/lib/cancellation/manager';

export interface CancellationRecord {
  key: string;
  timestamp: number;
  timeSavedMs: number;
  reason: string;
}

export interface CancellationMetricsStore {
  records: CancellationRecord[];
  totalCancelled: number;
  totalTimeSavedMs: number;
  trackCancellation: (
    key: string,
    timeSavedMs?: number,
    reason?: string,
  ) => void;
  getRecentCancellations: (limit?: number) => CancellationRecord[];
  clearMetrics: () => void;
}

export const useCancellationMetricsStore = create<CancellationMetricsStore>()(
  withMiddleware<CancellationMetricsStore>(
    (set, get) => ({
      records: [],
      totalCancelled: 0,
      totalTimeSavedMs: 0,

      trackCancellation: (key, timeSavedMs, reason) => {
        const metrics = cancellationManager.getMetrics();
        set((state) => {
          state.records.push({
            key,
            timestamp: Date.now(),
            timeSavedMs: timeSavedMs ?? 0,
            reason: reason ?? 'user',
          });
          state.totalCancelled = metrics.totalCancelled;
          state.totalTimeSavedMs = metrics.totalTimeSavedMs;
        });
      },

      getRecentCancellations: (limit = 10) => {
        return get().records.slice(-limit).reverse();
      },

      clearMetrics: () => {
        set((state) => {
          state.records = [];
          state.totalCancelled = 0;
          state.totalTimeSavedMs = 0;
        });
        cancellationManager.resetMetrics();
      },
    }),
    'cancellation-metrics',
  ),
);
