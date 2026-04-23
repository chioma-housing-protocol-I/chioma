import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';
import { BaseAppError } from '../errors/base.error';
import { ErrorCode } from '../errors/error-codes';
import {
  TimeoutError,
  NetworkError,
  MaxRetriesExceededError,
} from '../errors/retry-errors';
import {
  EncryptionError,
  DecryptionFailedError,
} from '../services/encryption.service';
import { RateLimitError } from '../errors/domain-errors';

interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  code?: ErrorCode;
  timestamp?: string;
  retryAfter?: number;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const { status, body } = this.resolve(exception);

    // Log error with request context
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (status >= 400) {
      this.logger.warn(
        `${request.method} ${request.url} - ${status}: ${body.message}`,
      );
    }

    response.status(status).json(body);
  }

  private resolve(exception: unknown): {
    status: number;
    body: ErrorResponse;
  } {
    // Handle our custom BaseAppError instances
    if (exception instanceof BaseAppError) {
      const body: ErrorResponse = {
        statusCode: exception.statusCode,
        message: exception.message,
        error: this.getErrorName(exception.statusCode),
        code: exception.code,
        timestamp: exception.timestamp.toISOString(),
      };

      // Add retryAfter for rate limit errors
      if (exception instanceof RateLimitError && exception.retryAfter) {
        body.retryAfter = exception.retryAfter;
      }

      return {
        status: exception.statusCode,
        body,
      };
    }

    // Handle NestJS HttpException
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (status === 429) {
        const message =
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : ((exceptionResponse as Record<string, unknown>)
                .message as string) || 'Too Many Requests';
        return {
          status,
          body: {
            statusCode: status,
            message,
            error: 'Too Many Requests',
            code: ErrorCode.RATE_LIMIT_EXCEEDED,
            retryAfter: 60,
          },
        };
      }

      const body =
        typeof exceptionResponse === 'object'
          ? (exceptionResponse as ErrorResponse)
          : {
              statusCode: status,
              message: exceptionResponse,
              error: this.getErrorName(status),
            };

      return { status, body };
    }

    // Handle TypeORM EntityNotFoundError
    if (exception instanceof EntityNotFoundError) {
      return {
        status: HttpStatus.NOT_FOUND,
        body: {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Resource not found',
          error: 'Not Found',
          code: ErrorCode.RESOURCE_NOT_FOUND,
        },
      };
    }

    // Handle TypeORM QueryFailedError (duplicate entry)
    if (
      exception instanceof QueryFailedError &&
      (exception as unknown as { code: string }).code === '23505'
    ) {
      return {
        status: HttpStatus.CONFLICT,
        body: {
          statusCode: HttpStatus.CONFLICT,
          message: 'Duplicate entry found',
          error: 'Conflict',
          code: ErrorCode.DUPLICATE_ENTRY,
        },
      };
    }

    // Handle generic database errors
    if (exception instanceof QueryFailedError) {
      this.logger.error(
        'Database query failed',
        exception instanceof Error ? exception.stack : String(exception),
      );
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database operation failed',
          error: 'Internal Server Error',
          code: ErrorCode.DATABASE_ERROR,
        },
      };
    }

    // Log unhandled exceptions
    this.logger.error(
      'Unhandled exception',
      exception instanceof Error ? exception.stack : String(exception),
    );

    // Return generic error response
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
        error: 'Internal Server Error',
        code: ErrorCode.INTERNAL_SERVER_ERROR,
      },
    };
  }

  private getErrorName(statusCode: number): string {
    const errorNames: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      408: 'Request Timeout',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      503: 'Service Unavailable',
    };

    return errorNames[statusCode] || 'Error';
  }
}
