import { HttpStatus } from '@nestjs/common';
import { BaseAppError } from './base.error';
import { ErrorCode } from './error-codes';

/**
 * Authentication and Authorization Errors
 */
export class AuthenticationError extends BaseAppError {
  constructor(
    code: ErrorCode = ErrorCode.AUTH_UNAUTHORIZED,
    message?: string,
    context?: Record<string, unknown>,
  ) {
    super(code, HttpStatus.UNAUTHORIZED, message, true, context);
  }
}

export class AuthorizationError extends BaseAppError {
  constructor(
    message?: string,
    context?: Record<string, unknown>,
  ) {
    super(ErrorCode.AUTH_FORBIDDEN, HttpStatus.FORBIDDEN, message, true, context);
  }
}

/**
 * Validation Errors
 */
export class ValidationError extends BaseAppError {
  constructor(
    message?: string,
    context?: Record<string, unknown>,
  ) {
    super(ErrorCode.VALIDATION_FAILED, HttpStatus.BAD_REQUEST, message, true, context);
  }
}

/**
 * Resource Not Found Errors
 */
export class ResourceNotFoundError extends BaseAppError {
  constructor(
    code: ErrorCode = ErrorCode.RESOURCE_NOT_FOUND,
    message?: string,
    context?: Record<string, unknown>,
  ) {
    super(code, HttpStatus.NOT_FOUND, message, true, context);
  }
}

export class UserNotFoundError extends ResourceNotFoundError {
  constructor(userId?: string) {
    super(
      ErrorCode.USER_NOT_FOUND,
      undefined,
      userId ? { userId } : undefined,
    );
  }
}

export class PropertyNotFoundError extends ResourceNotFoundError {
  constructor(propertyId?: string) {
    super(
      ErrorCode.PROPERTY_NOT_FOUND,
      undefined,
      propertyId ? { propertyId } : undefined,
    );
  }
}

export class AgreementNotFoundError extends ResourceNotFoundError {
  constructor(agreementId?: string) {
    super(
      ErrorCode.AGREEMENT_NOT_FOUND,
      undefined,
      agreementId ? { agreementId } : undefined,
    );
  }
}

export class MaintenanceNotFoundError extends ResourceNotFoundError {
  constructor(maintenanceId?: string) {
    super(
      ErrorCode.MAINTENANCE_NOT_FOUND,
      undefined,
      maintenanceId ? { maintenanceId } : undefined,
    );
  }
}

export class ReviewNotFoundError extends ResourceNotFoundError {
  constructor(reviewId?: string) {
    super(
      ErrorCode.REVIEW_NOT_FOUND,
      undefined,
      reviewId ? { reviewId } : undefined,
    );
  }
}

export class NotificationNotFoundError extends ResourceNotFoundError {
  constructor(notificationId?: string) {
    super(
      ErrorCode.NOTIFICATION_NOT_FOUND,
      undefined,
      notificationId ? { notificationId } : undefined,
    );
  }
}

/**
 * Business Logic Errors
 */
export class BusinessRuleViolationError extends BaseAppError {
  constructor(
    message?: string,
    context?: Record<string, unknown>,
  ) {
    super(ErrorCode.BUSINESS_RULE_VIOLATION, HttpStatus.UNPROCESSABLE_ENTITY, message, true, context);
  }
}

export class DuplicateEntryError extends BaseAppError {
  constructor(
    message?: string,
    context?: Record<string, unknown>,
  ) {
    super(ErrorCode.DUPLICATE_ENTRY, HttpStatus.CONFLICT, message, true, context);
  }
}

export class InsufficientFundsError extends BaseAppError {
  constructor(
    message?: string,
    context?: Record<string, unknown>,
  ) {
    super(ErrorCode.INSUFFICIENT_FUNDS, HttpStatus.UNPROCESSABLE_ENTITY, message, true, context);
  }
}

export class InvalidStateTransitionError extends BaseAppError {
  constructor(
    message?: string,
    context?: Record<string, unknown>,
  ) {
    super(ErrorCode.INVALID_STATE_TRANSITION, HttpStatus.UNPROCESSABLE_ENTITY, message, true, context);
  }
}

export class OperationNotAllowedError extends BaseAppError {
  constructor(
    message?: string,
    context?: Record<string, unknown>,
  ) {
    super(ErrorCode.OPERATION_NOT_ALLOWED, HttpStatus.FORBIDDEN, message, true, context);
  }
}

export class ProhibitedContentError extends BaseAppError {
  constructor(
    message?: string,
    context?: Record<string, unknown>,
  ) {
    super(ErrorCode.PROHIBITED_CONTENT, HttpStatus.BAD_REQUEST, message, true, context);
  }
}

/**
 * Blockchain Errors
 */
export class BlockchainError extends BaseAppError {
  constructor(
    code: ErrorCode = ErrorCode.BLOCKCHAIN_CONTRACT_ERROR,
    message?: string,
    context?: Record<string, unknown>,
  ) {
    super(code, HttpStatus.SERVICE_UNAVAILABLE, message, true, context);
  }
}

export class BlockchainConnectionError extends BlockchainError {
  constructor(message?: string, context?: Record<string, unknown>) {
    super(ErrorCode.BLOCKCHAIN_CONNECTION_FAILED, message, context);
  }
}

export class BlockchainTransactionError extends BlockchainError {
  constructor(message?: string, context?: Record<string, unknown>) {
    super(ErrorCode.BLOCKCHAIN_TRANSACTION_FAILED, message, context);
  }
}

export class InsufficientBalanceError extends BlockchainError {
  constructor(message?: string, context?: Record<string, unknown>) {
    super(ErrorCode.BLOCKCHAIN_INSUFFICIENT_BALANCE, message, context);
  }
}

/**
 * External Service Errors
 */
export class ExternalServiceError extends BaseAppError {
  constructor(
    code: ErrorCode = ErrorCode.EXTERNAL_SERVICE_ERROR,
    message?: string,
    context?: Record<string, unknown>,
  ) {
    super(code, HttpStatus.SERVICE_UNAVAILABLE, message, true, context);
  }
}

export class EmailServiceError extends ExternalServiceError {
  constructor(message?: string, context?: Record<string, unknown>) {
    super(ErrorCode.EMAIL_SERVICE_ERROR, message, context);
  }
}

export class PaymentProviderError extends ExternalServiceError {
  constructor(message?: string, context?: Record<string, unknown>) {
    super(ErrorCode.PAYMENT_PROVIDER_ERROR, message, context);
  }
}

export class StorageServiceError extends ExternalServiceError {
  constructor(message?: string, context?: Record<string, unknown>) {
    super(ErrorCode.STORAGE_SERVICE_ERROR, message, context);
  }
}

export class KycServiceError extends ExternalServiceError {
  constructor(message?: string, context?: Record<string, unknown>) {
    super(ErrorCode.KYC_SERVICE_ERROR, message, context);
  }
}

/**
 * Rate Limiting Errors
 */
export class RateLimitError extends BaseAppError {
  public readonly retryAfter?: number;

  constructor(
    message?: string,
    retryAfter?: number,
    context?: Record<string, unknown>,
  ) {
    super(ErrorCode.RATE_LIMIT_EXCEEDED, HttpStatus.TOO_MANY_REQUESTS, message, true, context);
    this.retryAfter = retryAfter;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

export class SuspiciousActivityError extends BaseAppError {
  constructor(
    message?: string,
    context?: Record<string, unknown>,
  ) {
    super(ErrorCode.SUSPICIOUS_ACTIVITY, HttpStatus.TOO_MANY_REQUESTS, message, true, context);
  }
}

/**
 * System Errors
 */
export class SystemError extends BaseAppError {
  constructor(
    code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    message?: string,
    isOperational = false,
    context?: Record<string, unknown>,
  ) {
    super(code, HttpStatus.INTERNAL_SERVER_ERROR, message, isOperational, context);
  }
}

export class ConfigurationError extends SystemError {
  constructor(message?: string, context?: Record<string, unknown>) {
    super(ErrorCode.CONFIGURATION_ERROR, message, false, context);
  }
}

export class ServiceUnavailableError extends BaseAppError {
  constructor(
    message?: string,
    context?: Record<string, unknown>,
  ) {
    super(ErrorCode.SERVICE_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE, message, true, context);
  }
}
