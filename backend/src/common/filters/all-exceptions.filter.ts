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
import {
  TimeoutError,
  NetworkError,
  MaxRetriesExceededError,
} from '../errors/retry-errors';
import {
  EncryptionError,
  DecryptionFailedError,
} from '../services/encryption.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, body } = this.resolve(exception);
    response.status(status).json(body);
  }

  private resolve(exception: unknown): {
    status: number;
    body: Record<string, unknown>;
  } {
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
          body: { statusCode: status, message, retryAfter: 60 },
        };
      }

      return {
        status,
        body:
          typeof exceptionResponse === 'object'
            ? (exceptionResponse as Record<string, unknown>)
            : { statusCode: status, message: exceptionResponse },
      };
    }

    if (exception instanceof EntityNotFoundError) {
      return {
        status: HttpStatus.NOT_FOUND,
        body: {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Resource not found',
          error: 'Not Found',
        },
      };
    }

    if (
      exception instanceof QueryFailedError &&
      (exception as unknown as { code: string }).code === '23505'
    ) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Duplicate entry found',
          error: 'Bad Request',
        },
      };
    }

    if (exception instanceof TimeoutError) {
      return {
        status: HttpStatus.REQUEST_TIMEOUT,
        body: {
          statusCode: HttpStatus.REQUEST_TIMEOUT,
          message: exception.message,
          error: 'Request Timeout',
        },
      };
    }

    if (
      exception instanceof NetworkError ||
      exception instanceof MaxRetriesExceededError
    ) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        body: {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: exception.message,
          error: 'Service Unavailable',
        },
      };
    }

    if (exception instanceof DecryptionFailedError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          statusCode: HttpStatus.BAD_REQUEST,
          message: exception.message,
          error: 'Bad Request',
        },
      };
    }

    if (exception instanceof EncryptionError) {
      this.logger.error(
        'Encryption error during request',
        exception instanceof Error ? exception.stack : String(exception),
      );
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'An internal error occurred',
          error: 'Internal Server Error',
        },
      };
    }

    this.logger.error(
      'Unhandled exception',
      exception instanceof Error ? exception.stack : String(exception),
    );
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
        error: 'Internal Server Error',
      },
    };
  }
}
