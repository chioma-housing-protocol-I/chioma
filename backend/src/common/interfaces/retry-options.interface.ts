export interface RetryOptions {
  /** Maximum number of attempts (including the first call). Default: 3 */
  maxAttempts: number;
  /** Initial delay in milliseconds before the first retry. Default: 1000 */
  delay: number;
  /** Backoff strategy: 'linear' multiplies delay by attempt number, 'exponential' doubles it. Default: 'exponential' */
  backoff: 'linear' | 'exponential';
  /** Multiplier applied per retry for the chosen backoff strategy. Default: 2 */
  backoffMultiplier: number;
  /**
   * Error classes that should trigger a retry.
   * When omitted, any network/transient error causes a retry.
   */
  retryableErrors?: Array<new (...args: any[]) => Error>;
  /** Optional callback invoked before each retry attempt. */
  onRetry?: (attempt: number, error: Error) => void;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  delay: 1000,
  backoff: 'exponential',
  backoffMultiplier: 2,
};
