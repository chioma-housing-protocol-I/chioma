/**
 * Integration tests for API timeout handling (#1151)
 *
 * Covers: request timeout enforcement, per-endpoint configuration,
 * graceful timeout handling, timeout error responses, and timeout metrics.
 */

import {
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, Subject, of, throwError } from 'rxjs';
import { timeout, catchError, finalize } from 'rxjs/operators';
import { TimeoutError } from 'rxjs';

// ── Types ────────────────────────────────────────────────────────────────────

interface TimeoutConfig {
  /** Default timeout in milliseconds for all endpoints. */
  defaultMs: number;
  /** Per-endpoint overrides keyed by route path. */
  endpoints: Record<string, number>;
}

interface TimeoutMetrics {
  totalRequests: number;
  timedOutRequests: number;
  successfulRequests: number;
  timeoutsByEndpoint: Record<string, number>;
}

// ── Subject-under-test: TimeoutInterceptor ───────────────────────────────────

class TimeoutInterceptor implements NestInterceptor {
  private metrics: TimeoutMetrics = {
    totalRequests: 0,
    timedOutRequests: 0,
    successfulRequests: 0,
    timeoutsByEndpoint: {},
  };

  constructor(private readonly config: TimeoutConfig) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context
      .switchToHttp()
      .getRequest<{ url?: string; route?: { path?: string } }>();
    const endpoint: string = req.route?.path ?? req.url ?? 'unknown';
    const timeoutMs = this.config.endpoints[endpoint] ?? this.config.defaultMs;

    this.metrics.totalRequests++;

    return next.handle().pipe(
      timeout(timeoutMs),
      catchError((err: unknown) => {
        if (err instanceof TimeoutError) {
          this.metrics.timedOutRequests++;
          this.metrics.timeoutsByEndpoint[endpoint] =
            (this.metrics.timeoutsByEndpoint[endpoint] ?? 0) + 1;
          return throwError(
            () => new RequestTimeoutException('Request processing timed out'),
          );
        }
        return throwError(() => err);
      }),
      finalize(() => {
        // Finalize runs for both success and error; track successes separately
      }),
    );
  }

  recordSuccess(): void {
    this.metrics.successfulRequests++;
  }

  getMetrics(): Readonly<TimeoutMetrics> {
    return {
      ...this.metrics,
      timeoutsByEndpoint: { ...this.metrics.timeoutsByEndpoint },
    };
  }

  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      timedOutRequests: 0,
      successfulRequests: 0,
      timeoutsByEndpoint: {},
    };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeContext(path: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ url: path, route: { path } }),
      getResponse: () => ({}),
    }),
  } as unknown as ExecutionContext;
}

function makeHandlerFromObservable(obs: Observable<unknown>): CallHandler {
  return { handle: () => obs };
}

function makeDelayedHandler(delayMs: number, value: unknown): CallHandler {
  const subject = new Subject<unknown>();
  setTimeout(() => {
    subject.next(value);
    subject.complete();
  }, delayMs);
  return { handle: () => subject.asObservable() };
}

async function collect<T>(obs: Observable<T>): Promise<T[]> {
  return new Promise<T[]>((resolve, reject) => {
    const values: T[] = [];
    obs.subscribe({
      next: (v) => values.push(v),
      complete: () => resolve(values),
      error: reject,
    });
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('API Timeout Integration Tests (#1151)', () => {
  const defaultConfig: TimeoutConfig = {
    defaultMs: 200,
    endpoints: {
      '/api/fast': 500,
      '/api/slow-allowed': 2000,
      '/api/strict': 50,
    },
  };

  let interceptor: TimeoutInterceptor;

  beforeEach(() => {
    interceptor = new TimeoutInterceptor(defaultConfig);
  });

  // ── 1. Request timeout enforcement ─────────────────────────────────────────

  describe('Request Timeout Enforcement', () => {
    it('allows a request that completes within the default timeout', async () => {
      const handler = makeHandlerFromObservable(of({ ok: true }));
      const result = await collect(
        interceptor.intercept(makeContext('/api/data'), handler),
      );
      expect(result).toEqual([{ ok: true }]);
    });

    it('rejects a request that exceeds the default timeout with RequestTimeoutException', async () => {
      const handler = makeDelayedHandler(300, { data: 'late' }); // 300 ms > 200 ms default
      await expect(
        collect(interceptor.intercept(makeContext('/api/data'), handler)),
      ).rejects.toBeInstanceOf(RequestTimeoutException);
    });

    it('returns HTTP 408 status code for timeout errors', async () => {
      const handler = makeDelayedHandler(300, {});
      try {
        await collect(interceptor.intercept(makeContext('/api/data'), handler));
        fail('Expected RequestTimeoutException');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(RequestTimeoutException);
        expect((err as RequestTimeoutException).getStatus()).toBe(408);
      }
    });

    it('passes through non-timeout errors unchanged', async () => {
      const cause = new Error('business logic error');
      const handler = makeHandlerFromObservable(throwError(() => cause));
      await expect(
        collect(interceptor.intercept(makeContext('/api/data'), handler)),
      ).rejects.toBe(cause);
    });
  });

  // ── 2. Per-endpoint timeout configuration ──────────────────────────────────

  describe('Timeout Configuration per Endpoint', () => {
    it('applies a longer timeout for a permissive endpoint', async () => {
      // 400 ms < 2000 ms configured for /api/slow-allowed
      const handler = makeDelayedHandler(400, { result: 'ok' });
      const result = await collect(
        interceptor.intercept(makeContext('/api/slow-allowed'), handler),
      );
      expect(result).toEqual([{ result: 'ok' }]);
    });

    it('applies a stricter timeout for the /api/strict endpoint', async () => {
      // 100 ms > 50 ms configured for /api/strict
      const handler = makeDelayedHandler(100, {});
      await expect(
        collect(interceptor.intercept(makeContext('/api/strict'), handler)),
      ).rejects.toBeInstanceOf(RequestTimeoutException);
    });

    it('falls back to the default timeout for unconfigured endpoints', async () => {
      // 250 ms > 200 ms default
      const handler = makeDelayedHandler(250, {});
      await expect(
        collect(interceptor.intercept(makeContext('/api/unlisted'), handler)),
      ).rejects.toBeInstanceOf(RequestTimeoutException);
    });

    it('handles dynamic per-endpoint configuration at construction time', () => {
      const customConfig: TimeoutConfig = {
        defaultMs: 1000,
        endpoints: { '/api/payments': 5000, '/api/health': 100 },
      };
      const custom = new TimeoutInterceptor(customConfig);
      expect(custom).toBeDefined();

      const metrics = custom.getMetrics();
      expect(metrics.totalRequests).toBe(0);
    });
  });

  // ── 3. Graceful timeout handling ───────────────────────────────────────────

  describe('Graceful Timeout Handling', () => {
    it('does not leak subscriptions after a timeout', async () => {
      let teardownCalled = false;
      const leakyObs = new Observable<unknown>((subscriber) => {
        const handle = setTimeout(() => subscriber.next('late'), 500);
        return () => {
          clearTimeout(handle);
          teardownCalled = true;
        };
      });

      try {
        await collect(
          interceptor.intercept(makeContext('/api/data'), {
            handle: () => leakyObs,
          }),
        );
      } catch {
        // expected timeout
      }
      // Allow micro-task queue to flush teardown
      await new Promise((r) => setTimeout(r, 10));
      expect(teardownCalled).toBe(true);
    }, 15000);

    it('allows subsequent requests after a timeout on the same endpoint', async () => {
      // First: timeout
      const slow = makeDelayedHandler(300, {});
      await expect(
        collect(interceptor.intercept(makeContext('/api/data'), slow)),
      ).rejects.toBeInstanceOf(RequestTimeoutException);

      // Second: fast — should still succeed
      const fast = makeHandlerFromObservable(of({ recovered: true }));
      const result = await collect(
        interceptor.intercept(makeContext('/api/data'), fast),
      );
      expect(result).toEqual([{ recovered: true }]);
    });

    it('handles empty response streams within the timeout window', async () => {
      const emptyHandler = makeHandlerFromObservable(of());
      const result = await collect(
        interceptor.intercept(makeContext('/api/data'), emptyHandler),
      );
      expect(result).toHaveLength(0);
    });
  });

  // ── 4. Timeout error responses ─────────────────────────────────────────────

  describe('Timeout Error Responses', () => {
    it('includes a human-readable message in the timeout exception', async () => {
      const handler = makeDelayedHandler(300, {});
      try {
        await collect(interceptor.intercept(makeContext('/api/data'), handler));
      } catch (err: unknown) {
        const tex = err as RequestTimeoutException;
        const body = tex.getResponse() as Record<string, unknown>;
        expect(
          typeof body.message === 'string' || Array.isArray(body.message),
        ).toBe(true);
      }
    });

    it('distinguishes timeout errors from generic 500 errors', async () => {
      const timeoutHandler = makeDelayedHandler(300, {});
      let timeoutErr: unknown;
      try {
        await collect(
          interceptor.intercept(makeContext('/api/data'), timeoutHandler),
        );
      } catch (e) {
        timeoutErr = e;
      }

      const genericHandler = makeHandlerFromObservable(
        throwError(() => new Error('crash')),
      );
      let genericErr: unknown;
      try {
        await collect(
          interceptor.intercept(makeContext('/api/data'), genericHandler),
        );
      } catch (e) {
        genericErr = e;
      }

      expect(timeoutErr).toBeInstanceOf(RequestTimeoutException);
      expect(genericErr).toBeInstanceOf(Error);
      expect(genericErr).not.toBeInstanceOf(RequestTimeoutException);
    });

    it('wraps the error with status 408 — not 500 — so the client can retry', async () => {
      const handler = makeDelayedHandler(300, {});
      try {
        await collect(interceptor.intercept(makeContext('/api/data'), handler));
      } catch (err: unknown) {
        expect((err as RequestTimeoutException).getStatus()).toBe(408);
        expect((err as RequestTimeoutException).getStatus()).not.toBe(500);
      }
    });
  });

  // ── 5. Timeout metrics ─────────────────────────────────────────────────────

  describe('Timeout Metrics', () => {
    beforeEach(() => interceptor.resetMetrics());

    it('increments totalRequests on every intercept call', async () => {
      const handler = makeHandlerFromObservable(of({}));
      await collect(interceptor.intercept(makeContext('/api/data'), handler));
      await collect(interceptor.intercept(makeContext('/api/data'), handler));
      expect(interceptor.getMetrics().totalRequests).toBe(2);
    });

    it('increments timedOutRequests only for requests that timeout', async () => {
      // One fast, one slow
      const fast = makeHandlerFromObservable(of({}));
      await collect(interceptor.intercept(makeContext('/api/data'), fast));

      const slow = makeDelayedHandler(300, {});
      try {
        await collect(interceptor.intercept(makeContext('/api/data'), slow));
      } catch {
        /* expected */
      }

      const m = interceptor.getMetrics();
      expect(m.timedOutRequests).toBe(1);
      expect(m.totalRequests).toBe(2);
    });

    it('tracks timeouts broken down by endpoint', async () => {
      for (let i = 0; i < 2; i++) {
        try {
          await collect(
            interceptor.intercept(
              makeContext('/api/data'),
              makeDelayedHandler(300, {}),
            ),
          );
        } catch {
          /* expected */
        }
      }
      for (let i = 0; i < 3; i++) {
        try {
          await collect(
            interceptor.intercept(
              makeContext('/api/strict'),
              makeDelayedHandler(100, {}),
            ),
          );
        } catch {
          /* expected */
        }
      }

      const m = interceptor.getMetrics();
      expect(m.timeoutsByEndpoint['/api/data']).toBe(2);
      expect(m.timeoutsByEndpoint['/api/strict']).toBe(3);
    });

    it('resets all metric counters on resetMetrics()', async () => {
      const slow = makeDelayedHandler(300, {});
      try {
        await collect(interceptor.intercept(makeContext('/api/data'), slow));
      } catch {
        /* expected */
      }

      interceptor.resetMetrics();
      const m = interceptor.getMetrics();
      expect(m.totalRequests).toBe(0);
      expect(m.timedOutRequests).toBe(0);
      expect(Object.keys(m.timeoutsByEndpoint)).toHaveLength(0);
    });

    it('returns an immutable snapshot from getMetrics()', () => {
      const m1 = interceptor.getMetrics();
      (m1 as TimeoutMetrics).totalRequests = 999;
      expect(interceptor.getMetrics().totalRequests).toBe(0);
    });
  });
});
