import {
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';

export interface StandardErrorResponse {
  success: false;
  message: string;
  errors?: string[];
  statusCode: number;
}

export class ErrorMapperUtils {
  /**
   * Maps a generic error to a standard HTTP Exception
   */
  static mapError(error: any): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    if (error instanceof EntityNotFoundError) {
      return new NotFoundException(error.message || 'Resource not found');
    }

    if (error instanceof QueryFailedError && (error as unknown as { code: string }).code === '23505') {
      return new BadRequestException('Duplicate entry found');
    }

    return new InternalServerErrorException(
      error.message || 'An unexpected error occurred',
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
    };
  }

  /**
   * Maps database errors to a structured response
   */
  static mapDatabaseError(error: any): StandardErrorResponse {
    return {
      success: false,
      message: 'Database operation failed',
      errors: [error.message],
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };
  }
}
