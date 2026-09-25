import { HttpStatus } from '@nestjs/common';
import { BaseAppError } from '../errors/base.error';
import { ErrorCode } from '../errors/error-codes';

/**
 * Thrown when a bulkhead compartment has no free execution slot and its
 * waiting queue is full. Surfaced as HTTP 503 so callers/clients can back off.
 */
export class BulkheadCapacityExceededError extends BaseAppError {
  public readonly compartment: string;

  constructor(compartment: string, maxConcurrent: number, maxQueue: number) {
    super(
      ErrorCode.BULKHEAD_CAPACITY_EXCEEDED,
      HttpStatus.SERVICE_UNAVAILABLE,
      `Bulkhead "${compartment}" is at capacity (max ${maxConcurrent} concurrent, ${maxQueue} queued)`,
      true,
      { compartment, maxConcurrent, maxQueue },
    );
    this.compartment = compartment;
  }
}

/**
 * Thrown when a feature is requested while the system has shed it as part of
 * graceful degradation.
 */
export class FeatureDisabledError extends BaseAppError {
  public readonly feature: string;

  constructor(feature: string, level: string) {
    super(
      ErrorCode.FEATURE_DISABLED,
      HttpStatus.SERVICE_UNAVAILABLE,
      `Feature "${feature}" is disabled while the system is degraded (level: ${level})`,
      true,
      { feature, level },
    );
    this.feature = feature;
  }
}

/**
 * Thrown when an external call does not complete within the configured
 * deadline. Surfaced as HTTP 408 so clients know the upstream, not their
 * request, was at fault.
 */
export class ExternalCallTimeoutError extends BaseAppError {
  public readonly operationContext: string;
  public readonly timeoutMs: number;

  constructor(operationContext: string, timeoutMs: number) {
    super(
      ErrorCode.EXTERNAL_SERVICE_TIMEOUT,
      HttpStatus.REQUEST_TIMEOUT,
      `External call "${operationContext}" timed out after ${timeoutMs} ms`,
      true,
      { operationContext, timeoutMs },
    );
    this.operationContext = operationContext;
    this.timeoutMs = timeoutMs;
  }
}
