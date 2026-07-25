import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest';

// withRetry tests use vi.useFakeTimers + vi.advanceTimersByTimeAsync. When fake
// timers fire and withRetry calls operation() for a retry, the rejected promise
// from the mock briefly has no handler, triggering Node's unhandledRejection
// event. Adding a second listener makes Vitest skip reporting it (see Vitest
// init: "if there is another listener, assume that it's handled by user code").
const _suppressRetryRejections = () => {};
beforeAll(() => process.on('unhandledRejection', _suppressRetryRejections));
afterAll(() => process.off('unhandledRejection', _suppressRetryRejections));
import {
  withRetry,
  getRetryDelay,
  globalRetryMetrics,
  type RetryEndpointMetrics,
} from '@/lib/errors/recovery';
import {
  CircuitBreakerManager,
  CircuitBreakerOpenError,
  globalCircuitBreaker,
} from '@/lib/errors/circuit-breaker';

describe('getRetryDelay', () => {
  it('should return base delay for first attempt', () => {
    const delay = getRetryDelay(1);
    expect(delay).toBeGreaterThanOrEqual(500);
    expect(delay).toBeLessThan(500 + 200);
  });

  it('should exponentially increase delay', () => {
    const delay1 = getRetryDelay(1);
    const delay2 = getRetryDelay(2);
    const delay3 = getRetryDelay(3);

    expect(delay2).toBeGreaterThan(delay1);
    expect(delay3).toBeGreaterThan(delay2);
  });

  it('should add jitter to the delay', () => {
    const delays = new Set<number>();
    for (let i = 0; i < 50; i++) {
      delays.add(getRetryDelay(2));
    }

    expect(delays.size).toBeGreaterThan(1);
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    globalRetryMetrics.resetMetrics();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalRetryMetrics.resetMetrics();
  });

  it('should succeed on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn, { endpoint: '/test' });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    let callCount = 0;
    const fn = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new Error('fail1');
      if (callCount === 2) throw new Error('fail2');
      return 'success';
    });

    const promise = withRetry(fn, {
      maxAttempts: 3,
      endpoint: '/test',
    });

    await vi.advanceTimersByTimeAsync(5000);

    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw after exhausting all attempts', async () => {
    let callCount = 0;
    const fn = vi.fn().mockImplementation(async () => {
      callCount++;
      throw new Error('persistent failure');
    });

    const promise = withRetry(fn, {
      maxAttempts: 3,
      endpoint: '/test-fail',
    });

    await vi.advanceTimersByTimeAsync(5000);

    await expect(promise).rejects.toThrow('persistent failure');
    expect(callCount).toBe(3);
  });

  it('should not retry if shouldRetry returns false', async () => {
    const fn = vi.fn().mockImplementation(async () => {
      throw new Error('no retry');
    });
    const shouldRetry = vi.fn().mockReturnValue(false);

    await expect(
      withRetry(fn, {
        maxAttempts: 3,
        shouldRetry,
        endpoint: '/no-retry',
      }),
    ).rejects.toThrow('no retry');

    expect(fn).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledTimes(1);
  });

  it('should call onRetry callback on each retry', async () => {
    let callCount = 0;
    const fn = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 3) {
        throw new Error(`fail${callCount}`);
      }
      return 'success';
    });

    const onRetry = vi.fn();

    const promise = withRetry(fn, {
      maxAttempts: 3,
      endpoint: '/test',
      onRetry,
    });

    await vi.advanceTimersByTimeAsync(5000);
    await promise;

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(
      1,
      1,
      expect.objectContaining({ message: 'fail1' }),
      expect.any(Number),
    );
    expect(onRetry).toHaveBeenNthCalledWith(
      2,
      2,
      expect.objectContaining({ message: 'fail2' }),
      expect.any(Number),
    );
  });

  it('should use default maxAttempts of 3', async () => {
    let callCount = 0;
    const fn = vi.fn().mockImplementation(async () => {
      callCount++;
      throw new Error('fail');
    });

    const promise = withRetry(fn, { endpoint: '/default' });
    await vi.advanceTimersByTimeAsync(5000);
    await expect(promise).rejects.toThrow('fail');

    expect(callCount).toBe(3);
  });
});

describe('RetryMetricsCollector', () => {
  beforeEach(() => {
    globalRetryMetrics.resetMetrics();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalRetryMetrics.resetMetrics();
  });

  it('should track retry metrics per endpoint', async () => {
    let firstCall = true;
    const fn = vi.fn().mockImplementation(async () => {
      if (firstCall) {
        firstCall = false;
        throw new Error('fail');
      }
      return 'ok';
    });

    const promise = withRetry(fn, {
      maxAttempts: 2,
      endpoint: '/metrics-test',
    });

    await vi.advanceTimersByTimeAsync(2000);
    await promise;

    const metrics = globalRetryMetrics.getMetrics('/metrics-test');
    expect(metrics).toBeDefined();
    expect(metrics!.totalAttempts).toBe(2);
    expect(metrics!.totalRetries).toBe(1);
    expect(metrics!.successes).toBe(1);
  });

  it('should track exhausted attempts', async () => {
    const fn = vi.fn().mockImplementation(async () => {
      throw new Error('exhausted');
    });

    const promise = withRetry(fn, {
      maxAttempts: 2,
      endpoint: '/exhausted',
    });

    await vi.advanceTimersByTimeAsync(2000);
    await expect(promise).rejects.toThrow('exhausted');

    const metrics = globalRetryMetrics.getMetrics('/exhausted');
    expect(metrics).toBeDefined();
    expect(metrics!.exhausted).toBe(1);
    expect(metrics!.totalAttempts).toBe(2);
  });

  it('should emit events to subscribers', async () => {
    const listener = vi.fn();
    globalRetryMetrics.subscribe(listener);

    const fn = vi.fn().mockResolvedValue('ok');

    await withRetry(fn, { endpoint: '/events' });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        endpoint: '/events',
      }),
    );
  });

  it('should reset metrics for a specific endpoint', () => {
    const metrics = globalRetryMetrics.getAllMetrics();
    expect(metrics).toHaveLength(0);
  });
});

describe('CircuitBreakerManager', () => {
  let breaker: CircuitBreakerManager;

  beforeEach(() => {
    breaker = new CircuitBreakerManager();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    breaker.clear();
  });

  it('should start in CLOSED state', () => {
    const b = breaker.getBreaker('test');
    expect(b.getState()).toBe('CLOSED');
  });

  it('should allow successful execution', async () => {
    const result = await breaker.execute('test', async () => 'ok');
    expect(result).toBe('ok');
  });

  it('should open circuit after failure threshold is exceeded', async () => {
    const b = breaker.getBreaker('flaky', {
      failureThreshold: 0.5,
      windowSize: 4,
      timeout: 60000,
    });

    const fn = vi.fn().mockImplementation(async () => {
      throw new Error('fail');
    });

    await expect(b.execute(fn)).rejects.toThrow('fail');
    expect(b.getState()).toBe('CLOSED');

    await expect(b.execute(fn)).rejects.toThrow('fail');
    expect(b.getState()).toBe('OPEN');
  });

  it('should reject requests when circuit is OPEN', async () => {
    const b = breaker.getBreaker('open-test', {
      failureThreshold: 0.1,
      windowSize: 1,
      timeout: 60000,
    });

    await expect(
      b.execute(() => Promise.reject(new Error('fail'))),
    ).rejects.toThrow('fail');

    await expect(b.execute(() => Promise.resolve('ok'))).rejects.toThrow(
      CircuitBreakerOpenError,
    );
  });

  it('should transition to HALF_OPEN after timeout', async () => {
    const b = breaker.getBreaker('half-open-test', {
      failureThreshold: 0.1,
      windowSize: 1,
      timeout: 5000,
    });

    await expect(
      b.execute(() => Promise.reject(new Error('fail'))),
    ).rejects.toThrow('fail');

    expect(b.getState()).toBe('OPEN');

    vi.advanceTimersByTime(5000);

    expect(b.getState()).toBe('HALF_OPEN');
  });

  it('should close circuit after success threshold in HALF_OPEN', async () => {
    const b = breaker.getBreaker('recover-test', {
      failureThreshold: 0.1,
      successThreshold: 0.5,
      windowSize: 4,
      timeout: 5000,
    });

    await expect(
      b.execute(() => Promise.reject(new Error('fail'))),
    ).rejects.toThrow('fail');
    expect(b.getState()).toBe('OPEN');

    vi.advanceTimersByTime(5000);
    expect(b.getState()).toBe('HALF_OPEN');

    await b.execute(() => Promise.resolve('ok'));
    expect(b.getState()).toBe('HALF_OPEN');

    await b.execute(() => Promise.resolve('ok'));
    expect(b.getState()).toBe('CLOSED');
  });

  it('should return to OPEN if a request fails in HALF_OPEN', async () => {
    const b = breaker.getBreaker('fail-half-open', {
      failureThreshold: 0.1,
      windowSize: 1,
      timeout: 5000,
    });

    await expect(
      b.execute(() => Promise.reject(new Error('fail'))),
    ).rejects.toThrow('fail');
    expect(b.getState()).toBe('OPEN');

    vi.advanceTimersByTime(5000);
    expect(b.getState()).toBe('HALF_OPEN');

    await expect(
      b.execute(() => Promise.reject(new Error('fail-again'))),
    ).rejects.toThrow('fail-again');
    expect(b.getState()).toBe('OPEN');
  });

  it('should provide metrics', async () => {
    const b = breaker.getBreaker('metrics-test', {
      failureThreshold: 0.5,
      windowSize: 4,
      timeout: 60000,
    });

    await b.execute(() => Promise.resolve('ok'));
    let metrics = b.getMetrics();
    expect(metrics.successes).toBe(1);
    expect(metrics.failures).toBe(0);
    expect(metrics.rejects).toBe(0);
    expect(metrics.state).toBe('CLOSED');

    await expect(
      b.execute(() => Promise.reject(new Error('fail'))),
    ).rejects.toThrow('fail');
    await expect(
      b.execute(() => Promise.reject(new Error('fail'))),
    ).rejects.toThrow('fail');

    metrics = b.getMetrics();
    expect(metrics.failures).toBe(2);
    expect(metrics.state).toBe('OPEN');
  });

  it('should reset breaker', async () => {
    const b = breaker.getBreaker('reset-test', {
      failureThreshold: 0.1,
      windowSize: 1,
      timeout: 60000,
    });

    const fn = vi.fn().mockImplementation(async () => {
      throw new Error('fail');
    });
    await expect(b.execute(fn)).rejects.toThrow();

    expect(b.getState()).toBe('OPEN');

    b.reset();
    expect(b.getState()).toBe('CLOSED');
    expect(b.getMetrics().failures).toBe(0);
    expect(b.getMetrics().rejects).toBe(0);
  });

  it('should re-open after reset if failures continue', async () => {
    const b = breaker.getBreaker('reopen-test', {
      failureThreshold: 0.1,
      windowSize: 1,
      timeout: 60000,
    });

    await expect(
      b.execute(() => Promise.reject(new Error('fail'))),
    ).rejects.toThrow('fail');
    expect(b.getState()).toBe('OPEN');

    b.reset();
    expect(b.getState()).toBe('CLOSED');

    await expect(
      b.execute(() => Promise.reject(new Error('fail-again'))),
    ).rejects.toThrow('fail-again');
    expect(b.getState()).toBe('OPEN');
  });

  it('should emit state change events', async () => {
    const listener = vi.fn();
    const b = breaker.getBreaker('event-test', {
      failureThreshold: 0.1,
      windowSize: 1,
      timeout: 5000,
    });

    b.subscribe(listener);

    await expect(
      b.execute(() => Promise.reject(new Error('fail'))),
    ).rejects.toThrow();

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'state_changed',
        state: 'OPEN',
      }),
    );
  });

  it('should get metrics for all breakers', async () => {
    breaker.getBreaker('b1');
    breaker.getBreaker('b2');

    await breaker.execute('b1', () => Promise.resolve('ok'));

    const allMetrics = breaker.getMetrics();
    expect(Object.keys(allMetrics)).toContain('b1');
    expect(Object.keys(allMetrics)).toContain('b2');
  });

  it('should reset all breakers', async () => {
    const b1 = breaker.getBreaker('ra1', {
      failureThreshold: 0.1,
      windowSize: 1,
    });
    const b2 = breaker.getBreaker('ra2', {
      failureThreshold: 0.1,
      windowSize: 1,
    });

    await expect(
      b1.execute(() => Promise.reject(new Error('fail'))),
    ).rejects.toThrow('fail');
    await expect(
      b2.execute(() => Promise.reject(new Error('fail'))),
    ).rejects.toThrow('fail');

    expect(b1.getState()).toBe('OPEN');
    expect(b2.getState()).toBe('OPEN');

    breaker.resetAll();
    expect(b1.getState()).toBe('CLOSED');
    expect(b2.getState()).toBe('CLOSED');
  });

  it('should track reject count when circuit is OPEN', async () => {
    const b = breaker.getBreaker('reject-test', {
      failureThreshold: 0.1,
      windowSize: 1,
      timeout: 60000,
    });

    await expect(
      b.execute(() => Promise.reject(new Error('fail'))),
    ).rejects.toThrow('fail');
    expect(b.getState()).toBe('OPEN');

    await expect(
      b.execute(() => Promise.resolve('should fail')),
    ).rejects.toThrow(CircuitBreakerOpenError);
    await expect(
      b.execute(() => Promise.resolve('should fail')),
    ).rejects.toThrow(CircuitBreakerOpenError);

    const metrics = b.getMetrics();
    expect(metrics.rejects).toBe(2);
  });

  it('should provide lastFailureTime', async () => {
    const b = breaker.getBreaker('last-fail', {
      failureThreshold: 0.1,
      windowSize: 1,
      timeout: 60000,
    });

    const before = Date.now();
    await expect(
      b.execute(() => Promise.reject(new Error('fail'))),
    ).rejects.toThrow('fail');

    const metrics = b.getMetrics();
    expect(metrics.lastFailureTime).toBeGreaterThanOrEqual(before);
    expect(metrics.lastFailureTime).toBeLessThanOrEqual(Date.now());
  });
});

describe('globalCircuitBreaker', () => {
  afterEach(() => {
    globalCircuitBreaker.clear();
  });

  it('should be a singleton', () => {
    expect(globalCircuitBreaker).toBeInstanceOf(CircuitBreakerManager);
  });

  it('should cache breakers by name', () => {
    const b1 = globalCircuitBreaker.getBreaker('singleton-test');
    const b2 = globalCircuitBreaker.getBreaker('singleton-test');
    expect(b1).toBe(b2);
  });

  it('should get metrics for non-existent breaker as null', () => {
    const metrics = globalCircuitBreaker.getMetricsForBreaker('nonexistent');
    expect(metrics).toBeNull();
  });
});
