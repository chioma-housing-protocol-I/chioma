import { describe, it, expect, beforeEach } from 'vitest';
import { useCancellationMetricsStore } from '@/store/cancellation-metrics-store';
import { cancellationManager } from '@/lib/cancellation/manager';

describe('useCancellationMetricsStore', () => {
  beforeEach(() => {
    useCancellationMetricsStore.getState().clearMetrics();
    cancellationManager.resetMetrics();
  });

  it('starts with zero metrics', () => {
    const state = useCancellationMetricsStore.getState();
    expect(state.totalCancelled).toBe(0);
    expect(state.totalTimeSavedMs).toBe(0);
    expect(state.records).toEqual([]);
  });

  it('trackCancellation adds a record and updates totals', () => {
    cancellationManager.createSignal('test-key');
    cancellationManager.cancel('test-key');

    useCancellationMetricsStore
      .getState()
      .trackCancellation('test-key', 100, 'user');

    const state = useCancellationMetricsStore.getState();
    expect(state.totalCancelled).toBe(1);
    expect(state.records).toHaveLength(1);
    expect(state.records[0].key).toBe('test-key');
    expect(state.records[0].timeSavedMs).toBe(100);
    expect(state.records[0].reason).toBe('user');
  });

  it('getRecentCancellations returns records in reverse order', () => {
    cancellationManager.createSignal('key-1');
    cancellationManager.cancel('key-1');
    useCancellationMetricsStore
      .getState()
      .trackCancellation('key-1', 50, 'user');

    cancellationManager.createSignal('key-2');
    cancellationManager.cancel('key-2');
    useCancellationMetricsStore
      .getState()
      .trackCancellation('key-2', 100, 'timeout');

    const recent = useCancellationMetricsStore
      .getState()
      .getRecentCancellations(2);
    expect(recent).toHaveLength(2);
    expect(recent[0].key).toBe('key-2');
    expect(recent[1].key).toBe('key-1');
  });

  it('clearMetrics resets everything', () => {
    cancellationManager.createSignal('test-key');
    cancellationManager.cancel('test-key');
    useCancellationMetricsStore.getState().trackCancellation('test-key');

    useCancellationMetricsStore.getState().clearMetrics();

    const state = useCancellationMetricsStore.getState();
    expect(state.totalCancelled).toBe(0);
    expect(state.totalTimeSavedMs).toBe(0);
    expect(state.records).toEqual([]);
  });
});
