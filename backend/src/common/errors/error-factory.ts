import { HttpException, HttpStatus } from '@nestjs/common';
import { BaseAppError } from './base.error';
import { ErrorCode } from './error-codes';
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  ResourceNotFoundError,
  BusinessRuleViolationError,
  SystemError,
} from './domain-errors';

/**
 * Factory class for creating standardized errors.
 * Provides convenient methods for common error scenarios.
 */
export class ErrorFactory {
  /**
   * Creates an authentication error
   */
  static unauthorized(
    message?: string,
    context?: Record<string, unknown>,
  ): AuthenticationError {
    return new AuthenticationError(
      ErrorCode.AUTH_UNAUTHORIZED,
      message,
      context,
    );
  }

  /**
   * Creates an authorization/forbidden error
   */
  static forbidden(
    message?: string,
    context?: Record<string, unknown>,
  ): AuthorizationError {
    return new AuthorizationError(message, context);
  }

  /**
   * Creates a validation error
   */
  static validation(
    message?: string,
    context?: Record<string, unknown>,
  ): ValidationError {
    return new ValidationError(message, context);
  }

  /**
   * Creates a not found error
   */
  static notFound(
    code: ErrorCode = ErrorCode.RESOURCE_NOT_FOUND,
    message?: string,
    context?: Record<string, unknown>,
  ): ResourceNotFoundError {
    return new ResourceNotFoundError(code, message, context);
  }

  /**
   * Creates a business rule violation error
   */
  static businessRule(
    message?: string,
    context?: Record<string, unknown>,
  ): BusinessRuleViolationError {
    return new BusinessRuleViolationError(message, context);
  }

  /**
   * Creates a system/internal error
   */
  static internal(
    message?: string,
    context?: Record<string, unknown>,
  ): SystemError {
    return new SystemError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      message,
      false,
      context,
    );
  }

  /**
   * Converts any error to a BaseAppError
   */
  static fromError(error: unknown, context?: Record<string, unknown>): BaseAppError {
    // Already a BaseAppError
    if (error instanceof BaseAppError) {
      return error;
    }

    // HttpException from NestJS
    if (error instanceof HttpException) {
      const status = error.getStatus();
      const response = error.getResponse();
      const message = typeof response === 'string' 
        ? response 
        : (response as any).message || error.message;

      return new BaseAppError(
        this.httpStatusToErrorCode(status),
        status,
        message,
        true,
        context,
      );
    }

    // Generic Error
    if (error instanceof Error) {
      return new SystemError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        error.message,
        false,
        { ...context, originalError: error.name },
      );
    }

    // Unknown error type
    return new SystemError(
      ErrorCode.UNKNOWN_ERROR,
      'An unknown error occurred',
      false,
      { ...context, errorType: typeof error },
    );
  }

  /**
   * Maps HTTP status codes to error codes
   */
  private static httpStatusToErrorCode(status: HttpStatus): ErrorCode {
    const mapping: Record<number, ErrorCode> = {
      [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_FAILED,
      [HttpStatus.UNAUTHORIZED]: ErrorCode.AUTH_UNAUTHORIZED,
      [HttpStatus.FORBIDDEN]: ErrorCode.AUTH_FORBIDDEN,
      [HttpStatus.NOT_FOUND]: ErrorCode.RESOURCE_NOT_FOUND,
      [HttpStatus.CONFLICT]: ErrorCode.DUPLICATE_ENTRY,
      [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCode.BUSINESS_RULE_VIOLATION,
      [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMIT_EXCEEDED,
      [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCode.INTERNAL_SERVER_ERROR,
      [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.SERVICE_UNAVAILABLE,
    };

    return mapping[status] || ErrorCode.UNKNOWN_ERROR;
  }

  /**
   * Checks if an error is operational (expected) or programming error
   */
  static isOperational(error: unknown): boolean {
    if (error instanceof BaseAppError) {
      return error.isOperational;
    }
    if (error instanceof HttpException) {
      return true;
    }
    return false;
  }

  /**
   * Extracts error code from any error
   */
  static getErrorCode(error: unknown): ErrorCode {
    if (error instanceof BaseAppError) {
      return error.code;
    }
    return ErrorCode.UNKNOWN_ERROR;
  }

  /**
   * Extracts HTTP status code from any error
   */
  static getStatusCode(error: unknown): number {
    if (error instanceof BaseAppError) {
      return error.statusCode;
    }
    if (error instanceof HttpException) {
      return error.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
