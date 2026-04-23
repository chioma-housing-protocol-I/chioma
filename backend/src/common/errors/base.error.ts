import { HttpStatus } from '@nestjs/common';
import { ErrorCode, ERROR_MESSAGES } from './error-codes';

/**
 * Base application error class that all custom errors should extend.
 * Provides consistent structure for error handling across the application.
 */
export class BaseAppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: HttpStatus;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    statusCode: HttpStatus,
    message?: string,
    isOperational = true,
    context?: Record<string, unknown>,
  ) {
    super(message || ERROR_MESSAGES[code]);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.context = context;
    this.name = this.constructor.name;

    // Maintains proper stack trace for where error was thrown (V8 only)
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Converts the error to a JSON-serializable object
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
    };
  }
}
