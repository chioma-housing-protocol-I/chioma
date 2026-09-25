import { Injectable, Logger } from '@nestjs/common';
import {
  DEFAULT_TIMEOUT_MS,
  TimeoutMetrics,
  TimeoutOptions,
} from './resilience.types';
import { ExternalCallTimeoutError } from './resilience.errors';

/**
 * Timeout enforcement for external calls.
 *
 * Wraps any async operation in a race against a configurable deadline. When
 * the deadline expires the caller receives an {@link ExternalCallTimeoutError}
 * (HTTP 408) instead of waiting indefinitely — or until the OS/network layer
 * decides to give up — for a misbehaving downstream service.
 *
 * Pairs naturally with {@link BulkheadService} (cap _concurrency_) and
 * {@link FallbackService} (serve a substitute when the call times out):
 *
 * ```ts
 * const result = await this.fallback.execute(
 *   () => this.timeout.execute(() => this.kycClient.verify(payload), {
 *     context: 'kyc-verify',
 *     timeoutMs: 5_000,
 *   }),
 *   { fallbackValue: cachedDecision },
 * );
 * ```
 */
@Injectable()
export class TimeoutService {
  private readonly logger = new Logger(TimeoutService.name);

  /** Per-context aggregate metrics, keyed by `options.context`. */
  private readonly metrics = new Map<string, TimeoutMetrics>();

  /**
   * Race `fn` against a deadline.
   *
   * - If `fn` resolves before the deadline the timer is cancelled and the
   *   resolved value is returned normally.
   * - If `fn` rejects before the deadline the timer is cancelled and the
   *   rejection propagates to the caller as-is.
   * - If the deadline fires first, `onTimeout` is called (if supplied), the
   *   timeout counter is incremented, and an {@link ExternalCallTimeoutError}
   *   is thrown.
   *
   * The underlying timer is always cleared before this method returns, so
   * long-running `fn` promises that eventually settle do not keep the event
   * loop alive.
   */
  async execute<T>(
    fn: () => Promise<T>,
    options: TimeoutOptions = {},
  ): Promise<T> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const context = options.context ?? 'external-call';

    this.touch(context, timeoutMs);

    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(new ExternalCallTimeoutError(context, timeoutMs));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([fn(), timeoutPromise]);
      clearTimeout(timer);
      return result;
    } catch (err) {
      clearTimeout(timer);

      if (err instanceof ExternalCallTimeoutError) {
        this.recordTimeout(context, timeoutMs);

        if (options.onTimeout) {
          options.onTimeout(context, timeoutMs);
        }

        this.logger.warn(
          `[${context}] External call timed out after ${timeoutMs} ms`,
          { context, timeoutMs },
        );
      }

      throw err;
    }
  }

  /**
   * Convenience wrapper that returns a pre-configured timeout-protected
   * version of an existing async function.
   *
   * ```ts
   * const safeFetch = this.timeout.wrap(
   *   (id: string) => this.paymentProvider.fetchStatus(id),
   *   { context: 'payment-status', timeoutMs: 8_000 },
   * );
   * const status = await safeFetch(paymentId);
   * ```
   */
  wrap<TArgs extends unknown[], T>(
    fn: (...args: TArgs) => Promise<T>,
    options: TimeoutOptions = {},
  ): (...args: TArgs) => Promise<T> {
    return (...args: TArgs) => this.execute(() => fn(...args), options);
  }

  /**
   * Returns a point-in-time snapshot of the metrics for the named context,
   * or `undefined` if that context has never been used.
   */
  getMetrics(context: string): TimeoutMetrics | undefined {
    const entry = this.metrics.get(context);
    return entry ? { ...entry } : undefined;
  }

  /** Returns snapshots for every context seen so far. */
  getAllMetrics(): TimeoutMetrics[] {
    return Array.from(this.metrics.values()).map((m) => ({ ...m }));
  }

  /** Resets all accumulated metrics. Primarily useful in tests. */
  resetMetrics(): void {
    this.metrics.clear();
  }

  // ── private helpers ────────────────────────────────────────────────────────

  /** Ensure a metrics entry exists for `context` and bump `totalCalls`. */
  private touch(context: string, timeoutMs: number): void {
    const entry = this.metrics.get(context);
    if (entry) {
      entry.totalCalls++;
    } else {
      this.metrics.set(context, {
        context,
        totalCalls: 1,
        totalTimeouts: 0,
        lastTimeoutMs: undefined,
      });
    }
    // Keep lastTimeoutMs in sync with the most-recently configured deadline.
    // We update it after a real timeout fires via recordTimeout; here we just
    // make sure the entry exists so the first getMetrics() call is meaningful.
    void timeoutMs; // acknowledged — not stored until a timeout actually fires
  }

  /** Bump the timeout counter and record the effective deadline. */
  private recordTimeout(context: string, timeoutMs: number): void {
    const entry = this.metrics.get(context);
    if (entry) {
      entry.totalTimeouts++;
      entry.lastTimeoutMs = timeoutMs;
    }
  }
}
