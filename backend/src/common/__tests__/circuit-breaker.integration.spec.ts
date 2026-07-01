import { Logger } from '@nestjs/common';
import {
  CircuitBreakerOpenError,
  CircuitBreakerService,
  type CircuitBreakerMetrics,
} from '../resilience/circuit-breaker.service';

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe('Circuit Breaker Integration', () => {
  let service: CircuitBreakerService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    service = new CircuitBreakerService();
  });

  afterEach(() => {
    jest.useRealTimers();
    service.clear();
    jest.restoreAllMocks();
  });

  describe('state transitions', () => {
    it('moves from CLOSED to OPEN when the failure threshold is reached', async () => {
      const events: Array<Record<string, unknown>> = [];
      service.on('state_changed', (event) => events.push(event));
      service.on('request_failure', (event) => events.push(event));

      const breaker = service.getBreaker('api', {
        failureThreshold: 0.5,
        successThreshold: 1,
        timeout: 100,
        windowSize: 2,
      });

      await expect(
        breaker.execute(async () => {
          throw new Error('upstream-down');
        }),
      ).rejects.toThrow('upstream-down');

      expect(service.getMetricsForBreaker('api')).toMatchObject({
        state: 'CLOSED',
        failures: 1,
        successes: 0,
        rejects: 0,
      });

      await expect(
        breaker.execute(async () => {
          throw new Error('upstream-down');
        }),
      ).rejects.toThrow('upstream-down');

      expect(service.getMetricsForBreaker('api')).toMatchObject({
        state: 'OPEN',
        failures: 2,
        successes: 0,
        rejects: 0,
      });
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Circuit breaker OPENED for api',
      );
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            from: 'CLOSED',
            to: 'OPEN',
            breaker: 'api',
          }),
        ]),
      );
    });

    it('rejects requests immediately while OPEN and counts them as rejects', async () => {
      const breaker = service.getBreaker('payments', {
        failureThreshold: 0.5,
        successThreshold: 1,
        timeout: 100,
        windowSize: 2,
      });

      await expect(
        breaker.execute(async () => {
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');
      await expect(
        breaker.execute(async () => {
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');

      await expect(
        breaker.execute(async () => 'should-not-run'),
      ).rejects.toBeInstanceOf(CircuitBreakerOpenError);

      expect(service.getMetricsForBreaker('payments')).toMatchObject({
        state: 'OPEN',
        failures: 2,
        successes: 0,
        rejects: 1,
      });
      expect(Logger.prototype.log).not.toHaveBeenCalledWith(
        expect.stringContaining('CLOSED for payments'),
      );
    });
  });

  describe('recovery and fallback', () => {
    it('transitions to HALF_OPEN after the recovery timeout and back to CLOSED after a successful probe', async () => {
      const events: Array<Record<string, unknown>> = [];
      service.on('state_changed', (event) => events.push(event));

      const breaker = service.getBreaker('ledger', {
        failureThreshold: 0.5,
        successThreshold: 1,
        timeout: 250,
        windowSize: 2,
      });

      await expect(
        breaker.execute(async () => {
          throw new Error('temporary-failure');
        }),
      ).rejects.toThrow('temporary-failure');
      await expect(
        breaker.execute(async () => {
          throw new Error('temporary-failure');
        }),
      ).rejects.toThrow('temporary-failure');

      expect(service.getMetricsForBreaker('ledger')?.state).toBe('OPEN');

      await jest.advanceTimersByTimeAsync(251);

      expect(service.getMetricsForBreaker('ledger')).toMatchObject({
        state: 'HALF_OPEN',
        failures: 0,
        successes: 0,
      });
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Circuit breaker HALF_OPEN for ledger, testing...',
      );

      const result = await breaker.execute(async () => 'recovered');
      expect(result).toBe('recovered');

      expect(service.getMetricsForBreaker('ledger')).toMatchObject({
        state: 'CLOSED',
        failures: 0,
        successes: 0,
      });
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Circuit breaker CLOSED for ledger',
      );
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            from: 'OPEN',
            to: 'HALF_OPEN',
            breaker: 'ledger',
          }),
          expect.objectContaining({
            from: 'HALF_OPEN',
            to: 'CLOSED',
            breaker: 'ledger',
          }),
        ]),
      );
    });

    it('returns a fallback response while the breaker is open', async () => {
      const breaker = service.getBreaker('inventory', {
        failureThreshold: 0.5,
        successThreshold: 1,
        timeout: 100,
        windowSize: 2,
      });

      await expect(
        breaker.execute(async () => {
          throw new Error('dependency-down');
        }),
      ).rejects.toThrow('dependency-down');
      await expect(
        breaker.execute(async () => {
          throw new Error('dependency-down');
        }),
      ).rejects.toThrow('dependency-down');

      const fallback = await breaker
        .execute(async () => 'live-data')
        .catch(() => 'cached-data');

      expect(fallback).toBe('cached-data');
      expect(service.getMetricsForBreaker('inventory')).toMatchObject({
        state: 'OPEN',
        rejects: 1,
      });
    });

    it('reopens immediately when the half-open probe fails', async () => {
      const breaker = service.getBreaker('shipping', {
        failureThreshold: 0.5,
        successThreshold: 1,
        timeout: 200,
        windowSize: 2,
      });

      await expect(
        breaker.execute(async () => {
          throw new Error('bad-gateway');
        }),
      ).rejects.toThrow('bad-gateway');
      await expect(
        breaker.execute(async () => {
          throw new Error('bad-gateway');
        }),
      ).rejects.toThrow('bad-gateway');

      await jest.advanceTimersByTimeAsync(201);

      await expect(
        breaker.execute(async () => {
          throw new Error('probe-failed');
        }),
      ).rejects.toThrow('probe-failed');

      expect(service.getMetricsForBreaker('shipping')).toMatchObject({
        state: 'OPEN',
        failures: 1,
        successes: 0,
      });
    });
  });

  describe('metrics and monitoring', () => {
    it('exposes aggregate metrics and reset behavior for monitoring', async () => {
      const breaker = service.getBreaker('notifications', {
        failureThreshold: 0.5,
        successThreshold: 1,
        timeout: 100,
        windowSize: 2,
      });

      await breaker.execute(async () => 'ok');
      await expect(
        breaker.execute(async () => {
          throw new Error('monitoring-failure');
        }),
      ).rejects.toThrow('monitoring-failure');

      const snapshot = service.getMetrics();
      const metrics = snapshot.notifications;

      expect(metrics).toMatchObject({
        state: 'CLOSED',
        successes: 1,
        failures: 1,
        rejects: 0,
      });
      expect(metrics.lastFailureTime).toBeGreaterThan(0);

      service.reset('notifications');
      expect(service.getMetricsForBreaker('notifications')).toMatchObject({
        state: 'CLOSED',
        successes: 0,
        failures: 0,
        rejects: 0,
        lastFailureTime: undefined,
      });

      service.resetAll();
      expect(service.getMetricsForBreaker('notifications')).toMatchObject({
        state: 'CLOSED',
        successes: 0,
        failures: 0,
        rejects: 0,
      });
    });

    it('clears breaker state when reset and clear are called', async () => {
      const breaker = service.getBreaker('search', {
        failureThreshold: 0.5,
        successThreshold: 1,
        timeout: 100,
        windowSize: 2,
      });

      await expect(
        breaker.execute(async () => {
          throw new Error('search-down');
        }),
      ).rejects.toThrow('search-down');
      await expect(
        breaker.execute(async () => {
          throw new Error('search-down');
        }),
      ).rejects.toThrow('search-down');

      expect(service.getMetricsForBreaker('search')?.state).toBe('OPEN');

      service.reset('search');
      expect(service.getMetricsForBreaker('search')).toMatchObject({
        state: 'CLOSED',
        failures: 0,
        successes: 0,
        rejects: 0,
      });

      service.clear();
      expect(service.getMetricsForBreaker('search')).toBeNull();
      expect(service.getMetrics()).toEqual({});
    });
  });
});
