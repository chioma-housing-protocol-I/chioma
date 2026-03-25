import { Logger } from '@nestjs/common';
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

const logger = new Logger('RetryDecorator');

function computeDelay(attempt: number, opts: RetryOptions): number {
  if (opts.backoff === 'linear') {
    return opts.delay * attempt * opts.backoffMultiplier;
  }
  return opts.delay * Math.pow(opts.backoffMultiplier, attempt - 1);
}

function isRetryable(
  error: unknown,
  retryableErrors?: Array<new (...args: any[]) => Error>,
): boolean {
  if (retryableErrors && retryableErrors.length > 0) {
    return retryableErrors.some((ErrorClass) => error instanceof ErrorClass);
  }

  if (error instanceof NetworkError || error instanceof TimeoutError) {
    return true;
  }

  if (axios.isAxiosError(error)) {
    if (!error.response) return true;
    return error.response.status >= 500;
  }

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Method decorator that wraps the decorated async method with retry logic.
 *
 * @example
 * ```ts
 * @Retry({ maxAttempts: 3, delay: 500, backoff: 'exponential', backoffMultiplier: 2 })
 * async callExternalApi(): Promise<Response> { … }
 * ```
 */
export function Retry(options: Partial<RetryOptions> = {}): MethodDecorator {
  const opts: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };

  return (
    _target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value as (
      ...args: unknown[]
    ) => Promise<unknown>;
    const methodName = String(propertyKey);

    descriptor.value = async function (...args: unknown[]) {
      let lastError: Error = new Error('Unknown error');
      let attemptsMade = 0;

      for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
        attemptsMade = attempt;
        try {
          return await originalMethod.apply(this, args);
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));

          const isLast = attempt === opts.maxAttempts;
          if (isLast || !isRetryable(lastError, opts.retryableErrors)) {
            break;
          }

          const delay = computeDelay(attempt, opts);
          logger.warn(
            `[${methodName}] Attempt ${attempt}/${opts.maxAttempts} failed: ${lastError.message}. Retrying in ${delay}ms…`,
          );

          if (opts.onRetry) {
            opts.onRetry(attempt, lastError);
          }

          await sleep(delay);
        }
      }

      logger.error(
        `[${methodName}] All ${attemptsMade} attempt(s) exhausted. Last error: ${lastError.message}`,
      );

      throw new MaxRetriesExceededError(attemptsMade, lastError);
    };

    return descriptor;
  };
}
