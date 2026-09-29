import { Injectable, Logger } from '@nestjs/common';

export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  /** Initial backoff delay in ms */
  initialDelayMs?: number;
  /** Maximum backoff delay in ms */
  maxDelayMs?: number;
  /** Backoff multiplier (exponential) */
  multiplier?: number;
  /** Add random jitter to backoff (0-1) */
  jitterFactor?: number;
  /** Predicate to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
  /** Name for logging */
  name?: string;
}

export interface RetryMetrics {
  totalAttempts: number;
  failedAttempts: number;
  successfulRetries: number;
  lastError?: Error;
}

export const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 10_000,
  multiplier: 2,
  jitterFactor: 0.1,
  isRetryable: isDefaultRetryable,
  name: 'retry',
};

/**
 * Centralized retry service with exponential backoff and jitter.
 * Provides a consistent retry strategy across the application.
 */
@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);
  private metrics = new Map<string, RetryMetrics>();

  /**
   * Execute function with automatic retries on failure
   */
  async execute<T>(
    name: string,
    fn: () => Promise<T>,
    options?: RetryOptions,
  ): Promise<T> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options, name };
    const metricsKey = opts.name;

    if (!this.metrics.has(metricsKey)) {
      this.metrics.set(metricsKey, {
        totalAttempts: 0,
        failedAttempts: 0,
        successfulRetries: 0,
      });
    }

    const metrics = this.metrics.get(metricsKey)!;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
      metrics.totalAttempts++;

      try {
        const result = await fn();
        if (attempt > 0) {
          metrics.successfulRetries++;
          this.logger.debug(
            `${opts.name} succeeded on attempt ${attempt + 1}/${opts.maxAttempts}`,
          );
        }
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        metrics.failedAttempts++;

        if (!opts.isRetryable(error)) {
          throw error;
        }

        if (attempt === opts.maxAttempts - 1) {
          metrics.lastError = lastError;
          throw new RetryExhaustedError(opts.name, opts.maxAttempts, lastError);
        }

        const delay = this.calculateDelay(
          attempt,
          opts.initialDelayMs,
          opts.maxDelayMs,
          opts.multiplier,
          opts.jitterFactor,
        );

        this.logger.debug(
          `${opts.name} failed (attempt ${attempt + 1}/${opts.maxAttempts}), retrying in ${delay}ms`,
          lastError,
        );

        await this.sleep(delay);
      }
    }

    throw (
      lastError ||
      new Error(`${opts.name} failed after ${opts.maxAttempts} attempts`)
    );
  }

  /**
   * Get metrics for a retry operation
   */
  getMetrics(name: string): RetryMetrics | null {
    return this.metrics.get(name) || null;
  }

  /**
   * Get all retry metrics
   */
  getAllMetrics(): Record<string, RetryMetrics> {
    const all: Record<string, RetryMetrics> = {};
    this.metrics.forEach((metrics, name) => {
      all[name] = metrics;
    });
    return all;
  }

  /**
   * Reset metrics for a retry operation
   */
  resetMetrics(name: string): void {
    this.metrics.delete(name);
  }

  private calculateDelay(
    attempt: number,
    initialDelayMs: number,
    maxDelayMs: number,
    multiplier: number,
    jitterFactor: number,
  ): number {
    const exponentialDelay = initialDelayMs * Math.pow(multiplier, attempt);
    const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
    const jitter = cappedDelay * jitterFactor * Math.random();
    return cappedDelay + jitter;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Default retry predicate: retry on network/timeout errors, not on client errors
 */
export function isDefaultRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const isClientError =
    message.includes('validation') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('not found');

  const isRetryable =
    error.name === 'TimeoutError' ||
    error.name === 'NetworkError' ||
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    message.includes('econnreset') ||
    message.includes('socket hang up') ||
    message.includes('temporarily unavailable');

  return isRetryable && !isClientError;
}

export class RetryExhaustedError extends Error {
  constructor(
    public readonly operation: string,
    public readonly maxAttempts: number,
    public readonly lastError: Error,
  ) {
    super(
      `${operation} failed after ${maxAttempts} attempts: ${lastError.message}`,
    );
    this.name = 'RetryExhaustedError';
  }
}
