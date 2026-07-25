import { Injectable, Logger } from '@nestjs/common';
import { FallbackOptions, FallbackStats } from './resilience.types';

/**
 * Fallback mechanisms for degraded services.
 *
 * Wraps a primary operation so that, when it fails, the caller receives a
 * sensible substitute instead of an error — a cached/last-known value, a
 * cheaper alternative source, or a static default. This keeps user-facing
 * flows working (in a reduced form) when a downstream dependency is degraded.
 *
 * Pairs naturally with {@link RetryService}: retry transient failures first,
 * then fall back only once retries are exhausted.
 */
@Injectable()
export class FallbackService {
  private readonly logger = new Logger(FallbackService.name);

  private stats: FallbackStats = { totalCalls: 0, totalFallbacks: 0 };

  /**
   * Execute `primary`; if it rejects (and `shouldFallback` allows it), resolve
   * with the configured fallback instead.
   *
   * Resolution order on failure:
   * 1. `fallbackFn(error)` if provided,
   * 2. otherwise `fallbackValue` if provided,
   * 3. otherwise the original error is rethrown.
   *
   * If the fallback itself throws, that error propagates to the caller.
   */
  async execute<T>(
    primary: () => Promise<T>,
    options: FallbackOptions<T>,
  ): Promise<T> {
    const context = options.context ?? 'FallbackService';
    this.stats.totalCalls++;

    try {
      return await primary();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.stats.lastError = error;

      const shouldFallback = options.shouldFallback
        ? options.shouldFallback(error)
        : true;

      if (!shouldFallback) {
        throw error;
      }

      const hasFallback =
        typeof options.fallbackFn === 'function' || 'fallbackValue' in options;
      if (!hasFallback) {
        // Nothing to fall back to — preserve the original failure.
        throw error;
      }

      this.stats.totalFallbacks++;
      this.logger.warn(
        `[${context}] Primary failed (${error.message}); serving fallback`,
        { error: error.message },
      );

      if (options.onFallback) {
        options.onFallback(error);
      }

      if (typeof options.fallbackFn === 'function') {
        return await options.fallbackFn(error);
      }
      return options.fallbackValue as T;
    }
  }

  /**
   * Convenience wrapper that produces a fallback-protected version of an
   * existing async function.
   */
  wrap<TArgs extends unknown[], T>(
    primary: (...args: TArgs) => Promise<T>,
    options: FallbackOptions<T>,
  ): (...args: TArgs) => Promise<T> {
    return (...args: TArgs) => this.execute(() => primary(...args), options);
  }

  /** Returns a snapshot of aggregate fallback statistics. */
  getStats(): Readonly<FallbackStats> {
    return { ...this.stats };
  }

  /** Reset aggregate statistics. */
  resetStats(): void {
    this.stats = { totalCalls: 0, totalFallbacks: 0 };
  }
}
