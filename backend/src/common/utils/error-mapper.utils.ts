import { HttpException, HttpStatus } from '@nestjs/common';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';
import { BaseAppError } from '../errors/base.error';
import { ErrorFactory } from '../errors/error-factory';
import {
  ResourceNotFoundError,
  DuplicateEntryError,
  ValidationError,
  SystemError,
} from '../errors/domain-errors';
import { ErrorCode } from '../errors/error-codes';

export interface StandardErrorResponse {
  success: false;
  message: string;
  errors?: string[];
  statusCode: number;
  code?: ErrorCode;
}

/**
 * Utility class for mapping errors to standardized formats.
 * @deprecated Use ErrorFactory instead for creating errors.
 * This class is maintained for backward compatibility.
 */
export class ErrorMapperUtils {
  /**
   * Maps a generic error to a standard HTTP Exception or BaseAppError
   */
  static mapError(error: unknown): HttpException | BaseAppError {
    // Already a BaseAppError
    if (error instanceof BaseAppError) {
      return error;
    }

    // Already an HttpException
    if (error instanceof HttpException) {
      return error;
    }

    // TypeORM EntityNotFoundError
    if (
      error instanceof EntityNotFoundError ||
      (error as any)?.name === 'EntityNotFoundError'
    ) {
      return new ResourceNotFoundError(
        ErrorCode.RESOURCE_NOT_FOUND,
        (error as Error).message || 'Resource not found',
      );
    }

    // TypeORM QueryFailedError (duplicate entry)
    if (
      (error instanceof QueryFailedError ||
        (error as any)?.name === 'QueryFailedError') &&
      (error as unknown as { code: string }).code === '23505'
    ) {
      return new DuplicateEntryError('Duplicate entry found');
    }

    // Generic Error
    if (error instanceof Error) {
      return new SystemError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        error.message || 'An unexpected error occurred',
        false,
      );
    }

    // Unknown error type
    return new SystemError(
      ErrorCode.UNKNOWN_ERROR,
      'An unknown error occurred',
      false,
    );
  }

  /**
   * Maps validation errors to a structured response
   */
  static mapValidationError(errors: string[]): StandardErrorResponse {
    return {
      success: false,
      message: 'Validation failed',
      errors,
      statusCode: HttpStatus.BAD_REQUEST,
      code: ErrorCode.VALIDATION_FAILED,
    };
  }

  /**
   * Maps database errors to a structured response
   */
  static mapDatabaseError(error: unknown): StandardErrorResponse {
    const message = error instanceof Error ? error.message : 'Database operation failed';
    
    return {
      success: false,
      message: 'Database operation failed',
      errors: [message],
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.DATABASE_ERROR,
    };
  }

  /**
   * Converts any error to a standardized error response
   */
  static toErrorResponse(error: unknown): StandardErrorResponse {
    if (error instanceof BaseAppError) {
      return {
        success: false,
        message: error.message,
        statusCode: error.statusCode,
        code: error.code,
      };
    }

    if (error instanceof HttpException) {
      const status = error.getStatus();
      const response = error.getResponse();
      const message = typeof response === 'string' 
        ? response 
        : (response as any).message || error.message;

      return {
        success: false,
        message,
        statusCode: status,
        code: ErrorFactory.getErrorCode(error),
      };
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
