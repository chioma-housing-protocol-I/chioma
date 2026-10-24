import { HttpException, HttpStatus } from '@nestjs/common';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';
import { BaseAppError } from '../../errors/base.error';
import {
  ResourceNotFoundError,
  DuplicateEntryError,
  SystemError,
} from '../../errors/domain-errors';
import { ErrorCode } from '../../errors/error-codes';

/** Narrows an unknown error to read its `name` without asserting its full shape. */
function getErrorName(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'name' in error
    ? String((error as { name?: unknown }).name)
    : undefined;
}

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
      getErrorName(error) === 'EntityNotFoundError'
    ) {
      return new ResourceNotFoundError(
        ErrorCode.RESOURCE_NOT_FOUND,
        (error as Error).message || 'Resource not found',
      );
    }

    // TypeORM QueryFailedError (duplicate entry)
    if (
      (error instanceof QueryFailedError ||
        getErrorName(error) === 'QueryFailedError') &&
      (error as { code: string }).code === '23505'
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
}
