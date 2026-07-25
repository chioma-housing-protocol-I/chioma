import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { globalRetryMetrics, globalCircuitBreaker } from '@/lib/errors';
import { withRetry } from '@/lib/errors/recovery';

describe('useRetryState', () => {
  beforeEach(() => {
    globalRetryMetrics.resetMetrics();
    globalCircuitBreaker.clear();
  });

  it('should integrate with retry metrics', async () => {
    await withRetry(async () => 'ok', { endpoint: '/integrate-test' });

    const metrics = globalRetryMetrics.getMetrics('/integrate-test');
    expect(metrics).toBeDefined();
    expect(metrics!.totalAttempts).toBe(1);
    expect(metrics!.successes).toBe(1);
  });

  it('should integrate with circuit breaker', async () => {
    const breaker = globalCircuitBreaker.getBreaker('integrate-breaker');
    expect(breaker.getState()).toBe('CLOSED');

    await breaker.execute(() => Promise.resolve('ok'));
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('should track retry failures', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    await expect(
      withRetry(fn, {
        maxAttempts: 2,
        endpoint: '/fail-track',
      }),
    ).rejects.toThrow('fail');

    const metrics = globalRetryMetrics.getMetrics('/fail-track');
    expect(metrics).toBeDefined();
    expect(metrics!.exhausted).toBe(1);
    expect(metrics!.totalAttempts).toBe(2);
  });
});

describe('globalCircuitBreaker', () => {
  afterEach(() => {
    globalCircuitBreaker.clear();
  });

  it('should open and reject', async () => {
    const breaker = globalCircuitBreaker.getBreaker('test-global', {
      failureThreshold: 0.1,
      windowSize: 1,
      timeout: 60000,
    });

    await expect(
      breaker.execute(() => Promise.reject(new Error('fail'))),
    ).rejects.toThrow('fail');
    expect(breaker.getState()).toBe('OPEN');
  });
});
