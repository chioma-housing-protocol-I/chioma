import { describe, it, expect, beforeEach } from 'vitest';
import {
  cancellationManager,
  isCancellationError,
} from '@/lib/cancellation/manager';
import { AppError } from '@/lib/errors/types';

describe('cancellationManager', () => {
  beforeEach(() => {
    cancellationManager.cancelAll('navigation');
    cancellationManager.resetMetrics();
  });

  describe('createSignal', () => {
    it('returns a signal and key', () => {
      const { signal, key } = cancellationManager.createSignal('test-key');
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(key).toBe('test-key');
      expect(signal.aborted).toBe(false);
    });

    it('cancels any existing signal with the same key first', () => {
      const { signal: signal1 } = cancellationManager.createSignal('test-key');
      const { signal: signal2 } = cancellationManager.createSignal('test-key');
      expect(signal1.aborted).toBe(true);
      expect(signal2.aborted).toBe(false);
    });
  });

  describe('cancel', () => {
    it('cancels a specific key', () => {
      cancellationManager.createSignal('test-key');
      const result = cancellationManager.cancel('test-key');
      expect(result).toBe(true);
      expect(cancellationManager.isActive('test-key')).toBe(false);
    });

    it('returns false for unknown key', () => {
      const result = cancellationManager.cancel('unknown');
      expect(result).toBe(false);
    });

    it('returns false for already cancelled key', () => {
      cancellationManager.createSignal('test-key');
      cancellationManager.cancel('test-key');
      const result = cancellationManager.cancel('test-key');
      expect(result).toBe(false);
    });
  });

  describe('cancelAll', () => {
    it('cancels all active signals', () => {
      cancellationManager.createSignal('key-1');
      cancellationManager.createSignal('key-2');
      cancellationManager.createSignal('key-3');
      const count = cancellationManager.cancelAll();
      expect(count).toBe(3);
      expect(cancellationManager.activeCount()).toBe(0);
    });
  });

  describe('isActive', () => {
    it('returns true for active key', () => {
      cancellationManager.createSignal('test-key');
      expect(cancellationManager.isActive('test-key')).toBe(true);
    });

    it('returns false for cancelled key', () => {
      cancellationManager.createSignal('test-key');
      cancellationManager.cancel('test-key');
      expect(cancellationManager.isActive('test-key')).toBe(false);
    });

    it('returns false for unknown key', () => {
      expect(cancellationManager.isActive('unknown')).toBe(false);
    });
  });

  describe('activeKeys', () => {
    it('returns all active keys', () => {
      cancellationManager.createSignal('key-1');
      cancellationManager.createSignal('key-2');
      const active = cancellationManager.activeKeys();
      expect(active).toEqual(expect.arrayContaining(['key-1', 'key-2']));
      expect(active).toHaveLength(2);
    });
  });

  describe('getMetrics', () => {
    it('returns zero metrics initially', () => {
      const metrics = cancellationManager.getMetrics();
      expect(metrics.totalCancelled).toBe(0);
      expect(metrics.totalTimeSavedMs).toBe(0);
      expect(metrics.activeRequests).toBe(0);
    });

    it('tracks cancelled requests', () => {
      cancellationManager.createSignal('key-1');
      cancellationManager.cancel('key-1');
      const metrics = cancellationManager.getMetrics();
      expect(metrics.totalCancelled).toBe(1);
      expect(metrics.totalTimeSavedMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('resetMetrics', () => {
    it('resets all metrics to zero', () => {
      cancellationManager.createSignal('key-1');
      cancellationManager.cancel('key-1');
      cancellationManager.resetMetrics();
      const metrics = cancellationManager.getMetrics();
      expect(metrics.totalCancelled).toBe(0);
      expect(metrics.totalTimeSavedMs).toBe(0);
    });
  });

  describe('classifyCancellationError', () => {
    it('classifies a DOMException AbortError as REQUEST_CANCELLED', () => {
      const error = new DOMException(
        'The user aborted a request.',
        'AbortError',
      );
      const appError = cancellationManager.classifyCancellationError(
        error,
        'test',
      );
      expect(appError.code).toBe('REQUEST_CANCELLED');
      expect(appError.category).toBe('network');
      expect(appError.severity).toBe('info');
    });
  });
});

describe('isCancellationError', () => {
  it('returns true for REQUEST_CANCELLED AppError', () => {
    const error = new AppError({
      code: 'REQUEST_CANCELLED',
      category: 'network',
      severity: 'info',
      message: 'Cancelled',
      userMessage: 'Cancelled',
      recoverable: true,
    });
    expect(isCancellationError(error)).toBe(true);
  });

  it('returns true for DOMException AbortError', () => {
    const error = new DOMException('Aborted', 'AbortError');
    expect(isCancellationError(error)).toBe(true);
  });

  it('returns false for other errors', () => {
    expect(isCancellationError(new Error('generic'))).toBe(false);
    expect(isCancellationError('string error')).toBe(false);
    expect(isCancellationError(null)).toBe(false);
  });
});
