import { RetryService } from './retry.service';
import { MaxRetriesExceededError } from '../errors/retry-errors';
import { TimeoutError, NetworkError } from '../errors/retry-errors';

jest.useFakeTimers();

describe('RetryService', () => {
  let service: RetryService;

  beforeEach(() => {
    service = new RetryService();
    service.resetStats();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  // ── execute ──────────────────────────────────────────────────────────────

  describe('execute', () => {
    it('returns the result immediately when the first attempt succeeds', async () => {
      const fn = jest.fn().mockResolvedValue('ok');
      const result = await service.execute(fn);
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries and eventually succeeds', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError())
        .mockResolvedValue('success');

      const promise = service.execute(fn, {
        maxAttempts: 3,
        delay: 100,
        backoff: 'exponential',
        backoffMultiplier: 2,
      });
      // Advance past the first retry delay (100ms * 2^0 = 100ms)
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('throws MaxRetriesExceededError after exhausting all attempts', async () => {
      const err = new NetworkError('boom');
      const fn = jest.fn().mockRejectedValue(err);

      const promise = service.execute(fn, {
        maxAttempts: 3,
        delay: 10,
        backoff: 'exponential',
        backoffMultiplier: 2,
      });
      // Attach rejection handler BEFORE advancing timers to avoid unhandled-rejection warnings
      const assertion = expect(promise).rejects.toBeInstanceOf(
        MaxRetriesExceededError,
      );
      await jest.runAllTimersAsync();
      await assertion;
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('does not retry when the error is not retryable (non-axios, no code)', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('validation error'));
      // No timers involved — error is non-retryable so the promise rejects in the same microtask
      await expect(
        service.execute(fn, {
          maxAttempts: 3,
          delay: 10,
          backoff: 'exponential',
          backoffMultiplier: 2,
        }),
      ).rejects.toBeInstanceOf(MaxRetriesExceededError);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries when retryableErrors matches the thrown error class', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new TimeoutError())
        .mockResolvedValue('done');

      const promise = service.execute(fn, {
        maxAttempts: 3,
        delay: 10,
        backoff: 'linear',
        backoffMultiplier: 1,
        retryableErrors: [TimeoutError],
      });
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('done');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('does not retry when error class is not in retryableErrors', async () => {
      const fn = jest.fn().mockRejectedValue(new NetworkError());
      await expect(
        service.execute(fn, {
          maxAttempts: 3,
          delay: 10,
          backoff: 'exponential',
          backoffMultiplier: 2,
          retryableErrors: [TimeoutError],
        }),
      ).rejects.toBeInstanceOf(MaxRetriesExceededError);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('calls onRetry callback on each retry', async () => {
      const onRetry = jest.fn();
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError())
        .mockRejectedValueOnce(new NetworkError())
        .mockResolvedValue('ok');

      const promise = service.execute(fn, {
        maxAttempts: 3,
        delay: 10,
        backoff: 'exponential',
        backoffMultiplier: 2,
        onRetry,
      });
      await jest.runAllTimersAsync();
      await promise;

      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(NetworkError));
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(NetworkError));
    });

    it('tracks aggregate statistics', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError())
        .mockResolvedValue('ok');

      const promise = service.execute(fn, {
        maxAttempts: 3,
        delay: 10,
        backoff: 'exponential',
        backoffMultiplier: 2,
      });
      await jest.runAllTimersAsync();
      await promise;

      const stats = service.getStats();
      expect(stats.totalAttempts).toBe(2);
      expect(stats.totalRetries).toBe(1);
    });
  });

  // ── isRetryable ──────────────────────────────────────────────────────────

  describe('isRetryable', () => {
    it('returns true for NetworkError when listed in retryableErrors', () => {
      expect(service.isRetryable(new NetworkError(), [NetworkError])).toBe(
        true,
      );
    });

    it('returns false when error class not in retryableErrors list', () => {
      expect(service.isRetryable(new NetworkError(), [TimeoutError])).toBe(
        false,
      );
    });

    it('returns false for a plain Error with no code and no retryableErrors filter', () => {
      expect(service.isRetryable(new Error('nope'))).toBe(false);
    });

    it('returns true for Node.js ECONNRESET error', () => {
      const err = Object.assign(new Error('reset'), { code: 'ECONNRESET' });
      expect(service.isRetryable(err)).toBe(true);
    });

    it('returns true for Node.js ETIMEDOUT error', () => {
      const err = Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' });
      expect(service.isRetryable(err)).toBe(true);
    });
  });

  // ── exponential backoff ───────────────────────────────────────────────────

  describe('backoff delay', () => {
    it('uses exponential backoff: delay * multiplier^(attempt-1)', async () => {
      const delays: number[] = [];

      jest.useRealTimers();
      const spy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((fn: any, ms?: number) => {
          delays.push(ms ?? 0);
          fn();
          return 0 as any;
        });

      const fn = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError())
        .mockRejectedValueOnce(new NetworkError())
        .mockResolvedValue('ok');

      await service.execute(fn, {
        maxAttempts: 3,
        delay: 100,
        backoff: 'exponential',
        backoffMultiplier: 2,
      });

      // attempt 1 → 100 * 2^0 = 100, attempt 2 → 100 * 2^1 = 200
      expect(delays).toEqual([100, 200]);
      spy.mockRestore();
      jest.useFakeTimers();
    });

    it('uses linear backoff: delay * attempt * multiplier', async () => {
      const delays: number[] = [];

      jest.useRealTimers();
      const spy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((fn: any, ms?: number) => {
          delays.push(ms ?? 0);
          fn();
          return 0 as any;
        });

      const fn = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError())
        .mockRejectedValueOnce(new NetworkError())
        .mockResolvedValue('ok');

      await service.execute(fn, {
        maxAttempts: 3,
        delay: 100,
        backoff: 'linear',
        backoffMultiplier: 1,
      });

      // attempt 1 → 100 * 1 * 1 = 100, attempt 2 → 100 * 2 * 1 = 200
      expect(delays).toEqual([100, 200]);
      spy.mockRestore();
      jest.useFakeTimers();
    });
  });

  // ── resetStats ────────────────────────────────────────────────────────────

  describe('resetStats', () => {
    it('resets statistics to zero', async () => {
      const fn = jest.fn().mockResolvedValue('ok');
      await service.execute(fn);
      service.resetStats();

      const stats = service.getStats();
      expect(stats.totalAttempts).toBe(0);
      expect(stats.totalRetries).toBe(0);
      expect(stats.lastError).toBeUndefined();
    });
  });
});
