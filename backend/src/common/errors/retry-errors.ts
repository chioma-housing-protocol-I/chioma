import { HttpStatus } from '@nestjs/common';
import { BaseAppError } from './base.error';
import { ErrorCode } from './error-codes';

/** Thrown when an external call times out. */
export class TimeoutError extends BaseAppError {
  constructor(message?: string, context?: Record<string, unknown>) {
    super(
      ErrorCode.NETWORK_TIMEOUT,
      HttpStatus.REQUEST_TIMEOUT,
      message,
      true,
      context,
    );
  }
}

/** Thrown when a network-level failure occurs (e.g. ECONNRESET, ENOTFOUND). */
export class NetworkError extends BaseAppError {
  constructor(message?: string, context?: Record<string, unknown>) {
    super(
      ErrorCode.NETWORK_ERROR,
      HttpStatus.SERVICE_UNAVAILABLE,
      message,
      true,
      context,
    );
  }
}

/** Thrown when all retry attempts are exhausted. Wraps the last underlying error. */
export class MaxRetriesExceededError extends BaseAppError {
  public readonly attempts: number;
  public readonly cause: Error;

  constructor(attempts: number, cause: Error) {
    super(
      ErrorCode.MAX_RETRIES_EXCEEDED,
      HttpStatus.SERVICE_UNAVAILABLE,
      `Operation failed after ${attempts} attempt(s): ${cause.message}`,
      true,
      { attempts, originalError: cause.message },
    );
    this.attempts = attempts;
    this.cause = cause;
  }
}
