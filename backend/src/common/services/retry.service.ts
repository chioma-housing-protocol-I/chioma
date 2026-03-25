import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  RetryOptions,
  DEFAULT_RETRY_OPTIONS,
} from '../interfaces/retry-options.interface';
import {
  MaxRetriesExceededError,
  NetworkError,
  TimeoutError,
} from '../errors/retry-errors';

export interface RetryStats {
  totalAttempts: number;
  totalRetries: number;
  lastError?: Error;
}

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  /** Running aggregate statistics (reset on service restart). */
  private stats: RetryStats = { totalAttempts: 0, totalRetries: 0 };

  /**
   * Execute `fn` with the given retry options.
   * Throws `MaxRetriesExceededError` when all attempts are exhausted.
   */
  async execute<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {},
    context = 'RetryService',
  ): Promise<T> {
    const opts: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: Error = new Error('Unknown error');
    let attemptsMade = 0;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      attemptsMade = attempt;
      this.stats.totalAttempts++;
      try {
        return await fn();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.stats.lastError = lastError;

        const isLast = attempt === opts.maxAttempts;
        if (isLast || !this.isRetryable(lastError, opts.retryableErrors)) {
          break;
        }

        const delay = this.computeDelay(attempt, opts);
        this.stats.totalRetries++;
        this.logger.warn(
          `[${context}] Attempt ${attempt}/${opts.maxAttempts} failed: ${lastError.message}. Retrying in ${delay}ms…`,
          { attempt, delay, error: lastError.message },
        );

        if (opts.onRetry) {
          opts.onRetry(attempt, lastError);
        }

        await this.sleep(delay);
      }
    }

    this.logger.error(
      `[${context}] All ${attemptsMade} attempt(s) exhausted. Last error: ${lastError.message}`,
      { attempts: attemptsMade, error: lastError.message },
    );

    throw new MaxRetriesExceededError(attemptsMade, lastError);
  }

  /** Returns a snapshot of aggregate retry statistics. */
  getStats(): Readonly<RetryStats> {
    return { ...this.stats };
  }

  /** Reset aggregate statistics. */
  resetStats(): void {
    this.stats = { totalAttempts: 0, totalRetries: 0 };
  }

  /**
   * Determines whether an error should trigger a retry.
   *
   * - If `retryableErrors` is provided: only retry when the error is an
   *   instance of one of those classes.
   * - Otherwise: retry on Axios network failures (no response), HTTP 5xx,
   *   and connection/timeout codes.
   */
  isRetryable(
    error: unknown,
    retryableErrors?: Array<new (...args: any[]) => Error>,
  ): boolean {
    if (retryableErrors && retryableErrors.length > 0) {
      return retryableErrors.some((ErrorClass) => error instanceof ErrorClass);
    }

    // Our own retryable error classes are always retriable by default
    if (error instanceof NetworkError || error instanceof TimeoutError) {
      return true;
    }

    // Axios-specific transient failures
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        // Network-level error (ECONNRESET, ENOTFOUND, timeout, etc.)
        return true;
      }
      return error.response.status >= 500;
    }

    // Node.js network/timeout error codes
    const code = (error as NodeJS.ErrnoException).code;
    if (
      code &&
      [
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'ECONNREFUSED',
        'ECONNABORTED',
      ].includes(code)
    ) {
      return true;
    }

    return false;
  }

  private computeDelay(attempt: number, opts: RetryOptions): number {
    if (opts.backoff === 'linear') {
      return opts.delay * attempt * opts.backoffMultiplier;
    }
    // exponential: delay * multiplier^(attempt-1)
    return opts.delay * Math.pow(opts.backoffMultiplier, attempt - 1);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
