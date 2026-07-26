import { TimeoutService } from './timeout.service';
import { ExternalCallTimeoutError } from './resilience.errors';

/** Returns a promise that resolves after `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Creates a promise plus its resolver so a test can control settlement. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('TimeoutService', () => {
  let service: TimeoutService;

  beforeEach(() => {
    jest.useFakeTimers();
    service = new TimeoutService();
  });

  afterEach(() => {
    jest.useRealTimers();
    service.resetMetrics();
  });

  // ── execute ───────────────────────────────────────────────────────────────

  describe('execute', () => {
    it('returns the resolved value when fn settles before the deadline', async () => {
      const result = await service.execute(async () => 'ok', {
        context: 'fast-call',
        timeoutMs: 1_000,
      });
      expect(result).toBe('ok');
    });

    it('propagates rejection from fn without wrapping it', async () => {
      const cause = new Error('upstream-error');
      await expect(
        service.execute(
          async () => {
            throw cause;
          },
          { context: 'failing-call', timeoutMs: 1_000 },
        ),
      ).rejects.toThrow('upstream-error');
    });

    it('throws ExternalCallTimeoutError when the deadline fires', async () => {
      const d = deferred<string>();

      const race = service.execute(() => d.promise, {
        context: 'slow-kyc',
        timeoutMs: 500,
      });

      // Advance time past the deadline.
      jest.advanceTimersByTime(501);

      await expect(race).rejects.toBeInstanceOf(ExternalCallTimeoutError);

      // Settle the dangling promise so there are no stray async operations.
      d.resolve('late');
    });

    it('ExternalCallTimeoutError carries the correct context and timeoutMs', async () => {
      const d = deferred<string>();

      const race = service.execute(() => d.promise, {
        context: 'payment-status',
        timeoutMs: 3_000,
      });

      jest.advanceTimersByTime(3_001);

      const err = await race.catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ExternalCallTimeoutError);
      expect((err as ExternalCallTimeoutError).operationContext).toBe(
        'payment-status',
      );
      expect((err as ExternalCallTimeoutError).timeoutMs).toBe(3_000);

      d.resolve('late');
    });

    it('uses DEFAULT_TIMEOUT_MS when timeoutMs is omitted', async () => {
      const d = deferred<string>();

      const race = service.execute(() => d.promise, {
        context: 'default-deadline',
      });

      // Just before default (10 000 ms): should still be pending.
      jest.advanceTimersByTime(9_999);
      // Ensure we are not yet rejected.
      const pending = await Promise.race([
        race.catch(() => 'rejected'),
        Promise.resolve('still-pending'),
      ]);
      expect(pending).toBe('still-pending');

      // Past the default deadline.
      jest.advanceTimersByTime(2);
      await expect(race).rejects.toBeInstanceOf(ExternalCallTimeoutError);

      d.resolve('late');
    });

    it('calls onTimeout with the correct context and timeoutMs', async () => {
      const onTimeout = jest.fn();
      const d = deferred<string>();

      const race = service.execute(() => d.promise, {
        context: 'webhook',
        timeoutMs: 200,
        onTimeout,
      });

      jest.advanceTimersByTime(201);
      await race.catch(() => null);

      expect(onTimeout).toHaveBeenCalledWith('webhook', 200);

      d.resolve('late');
    });

    it('does NOT call onTimeout when fn resolves in time', async () => {
      const onTimeout = jest.fn();

      await service.execute(async () => 'fast', {
        context: 'fast',
        timeoutMs: 500,
        onTimeout,
      });

      expect(onTimeout).not.toHaveBeenCalled();
    });

    it('uses a default context label when context is omitted', async () => {
      await service.execute(async () => 'ok');
      const metrics = service.getMetrics('external-call');
      expect(metrics).toBeDefined();
      expect(metrics!.totalCalls).toBe(1);
    });
  });

  // ── wrap ─────────────────────────────────────────────────────────────────

  describe('wrap', () => {
    it('produces a timeout-protected version of an existing function', async () => {
      const fetch = jest.fn().mockResolvedValue({ status: 'settled' });
      const safeFetch = service.wrap(fetch, {
        context: 'safe-fetch',
        timeoutMs: 1_000,
      });

      const result = await safeFetch('arg1', 42);
      expect(result).toEqual({ status: 'settled' });
      expect(fetch).toHaveBeenCalledWith('arg1', 42);
    });

    it('times out the wrapped function when it is too slow', async () => {
      const d = deferred<string>();
      const slowFn = jest.fn().mockReturnValue(d.promise);
      const safeFn = service.wrap(slowFn, {
        context: 'slow-wrap',
        timeoutMs: 100,
      });

      const race = safeFn();
      jest.advanceTimersByTime(101);

      await expect(race).rejects.toBeInstanceOf(ExternalCallTimeoutError);

      d.resolve('late');
    });
  });

  // ── metrics ───────────────────────────────────────────────────────────────

  describe('metrics', () => {
    it('returns undefined for an unknown context', () => {
      expect(service.getMetrics('nope')).toBeUndefined();
    });

    it('tracks totalCalls correctly across successes and timeouts', async () => {
      // Successful call.
      await service.execute(async () => 'ok', {
        context: 'svc',
        timeoutMs: 500,
      });

      // Timed-out call.
      const d = deferred<string>();
      const race = service.execute(() => d.promise, {
        context: 'svc',
        timeoutMs: 200,
      });
      jest.advanceTimersByTime(201);
      await race.catch(() => null);

      const m = service.getMetrics('svc');
      expect(m?.totalCalls).toBe(2);
      expect(m?.totalTimeouts).toBe(1);
      expect(m?.lastTimeoutMs).toBe(200);

      d.resolve('late');
    });

    it('reports metrics for all contexts via getAllMetrics', async () => {
      await service.execute(async () => 1, { context: 'a', timeoutMs: 500 });
      await service.execute(async () => 2, { context: 'b', timeoutMs: 500 });

      const all = service.getAllMetrics();
      expect(all.map((m) => m.context).sort()).toEqual(['a', 'b']);
    });

    it('returns a defensive snapshot — mutations do not affect stored state', async () => {
      await service.execute(async () => 'ok', {
        context: 'snap',
        timeoutMs: 500,
      });

      const snapshot = service.getMetrics('snap')!;
      snapshot.totalCalls = 999;

      expect(service.getMetrics('snap')!.totalCalls).toBe(1);
    });

    it('resetMetrics clears all accumulated data', async () => {
      await service.execute(async () => 'ok', {
        context: 'to-clear',
        timeoutMs: 500,
      });
      service.resetMetrics();
      expect(service.getMetrics('to-clear')).toBeUndefined();
      expect(service.getAllMetrics()).toHaveLength(0);
    });
  });

  // ── timer cleanup ──────────────────────────────────────────────────────────

  describe('timer cleanup', () => {
    it('does not fire the timeout callback after fn resolves', async () => {
      const onTimeout = jest.fn();
      const d = deferred<string>();

      const race = service.execute(() => d.promise, {
        context: 'cleanup-check',
        timeoutMs: 5_000,
        onTimeout,
      });

      // Settle well before the deadline.
      d.resolve('done');
      await race;

      // Advance past the deadline to confirm the timer was cleared.
      jest.advanceTimersByTime(6_000);

      expect(onTimeout).not.toHaveBeenCalled();
    });
  });
});
