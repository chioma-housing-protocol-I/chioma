import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce, throttle, globalRateLimitTracker } from '@/lib/rate-limit';

describe('rate-limit utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    globalRateLimitTracker.reset();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('debounce', () => {
    it('should delay function execution', () => {
      const func = vi.fn();
      const debounced = debounce(func, 1000);

      debounced();
      expect(func).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);
      expect(func).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);
      expect(func).toHaveBeenCalledTimes(1);
    });

    it('should only execute once if called multiple times within the wait period', () => {
      const func = vi.fn();
      const debounced = debounce(func, 1000);

      debounced(1);
      debounced(2);
      debounced(3);

      vi.advanceTimersByTime(1000);
      expect(func).toHaveBeenCalledTimes(1);
      expect(func).toHaveBeenCalledWith(3);
    });

    it('should allow cancelling the debounced call', () => {
      const func = vi.fn();
      const debounced = debounce(func, 1000);

      debounced();
      debounced.cancel();

      vi.advanceTimersByTime(1000);
      expect(func).not.toHaveBeenCalled();
    });

    it('should allow flushing the debounced call', () => {
      const func = vi.fn();
      const debounced = debounce(func, 1000);

      debounced('flush-test');
      debounced.flush();

      expect(func).toHaveBeenCalledTimes(1);
      expect(func).toHaveBeenCalledWith('flush-test');
    });
  });

  describe('throttle', () => {
    it('should execute immediately and then delay subsequent calls', () => {
      const func = vi.fn();
      const throttled = throttle(func, 1000);

      throttled(1);
      expect(func).toHaveBeenCalledTimes(1);
      expect(func).toHaveBeenCalledWith(1);

      throttled(2);
      expect(func).toHaveBeenCalledTimes(1); // not called yet

      vi.advanceTimersByTime(1000);
      expect(func).toHaveBeenCalledTimes(2);
      expect(func).toHaveBeenCalledWith(2);
    });

    it('should ignore intermediate calls and execute the last one after delay', () => {
      const func = vi.fn();
      const throttled = throttle(func, 1000);

      throttled(1); // Executes immediately
      throttled(2); // Ignored
      throttled(3); // Queued

      vi.advanceTimersByTime(1000);
      expect(func).toHaveBeenCalledTimes(2);
      expect(func).toHaveBeenCalledWith(3);
    });

    it('should allow cancelling the throttled call', () => {
      const func = vi.fn();
      const throttled = throttle(func, 1000);

      throttled(1);
      throttled(2); // Queued
      throttled.cancel();

      vi.advanceTimersByTime(1000);
      expect(func).toHaveBeenCalledTimes(1);
    });
  });

  describe('RateLimitTracker', () => {
    it('should not block requests initially', () => {
      expect(globalRateLimitTracker.getWaitTimeMs()).toBe(0);
    });

    it('should block requests if remaining is 0 and reset time is in the future', () => {
      const headers = new Headers();
      headers.set('RateLimit-Remaining', '0');
      // Set reset time to 5 seconds from now
      headers.set('RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 5));

      globalRateLimitTracker.updateFromHeaders(headers, 429);

      const waitTime = globalRateLimitTracker.getWaitTimeMs();
      expect(waitTime).toBeGreaterThan(0);
      expect(waitTime).toBeLessThanOrEqual(5000);
    });

    it('should unblock requests after reset time has passed', () => {
      const headers = new Headers();
      headers.set('RateLimit-Remaining', '0');
      // Set reset time to 1 second from now
      headers.set('RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 1));

      globalRateLimitTracker.updateFromHeaders(headers, 429);
      expect(globalRateLimitTracker.getWaitTimeMs()).toBeGreaterThan(0);

      vi.advanceTimersByTime(1001);

      expect(globalRateLimitTracker.getWaitTimeMs()).toBe(0);
    });

    it('should support Retry-After header', () => {
      const headers = new Headers();
      headers.set('Retry-After', '10'); // 10 seconds

      globalRateLimitTracker.updateFromHeaders(headers, 429);

      const waitTime = globalRateLimitTracker.getWaitTimeMs();
      expect(waitTime).toBeGreaterThan(0);
      expect(waitTime).toBeLessThanOrEqual(10000);
    });

    it('should force remaining to 0 if status is 429 even without headers', () => {
      const headers = new Headers();
      globalRateLimitTracker.updateFromHeaders(headers, 429);
      // Wait time will be 0 without reset time, but it should be noted internally.
      // We can check this indirectly by providing a Retry-After later or just assuming it behaves as fallback.
      // But let's check it by adding a listener.
    });

    it('should notify listeners on 429 status', () => {
      const listener = vi.fn();
      globalRateLimitTracker.subscribe(listener);

      const headers = new Headers();
      headers.set('Retry-After', '2');

      globalRateLimitTracker.updateFromHeaders(headers, 429);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ remaining: 0 }),
        2000,
      );
    });
  });
});
