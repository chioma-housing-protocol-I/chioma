import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';
import * as Sentry from '@sentry/nestjs';
import { BaseAppError } from '../errors/base.error';
import { ErrorCode } from '../errors/error-codes';
import { RateLimitError } from '../errors/domain-errors';
import { ErrorResponseDto } from '../dto/error-response.dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.resolve(exception, request);

    // Log error with request context
    const requestId =
      (request as any).requestId || request.headers['x-request-id'];
    const logContext = {
      requestId,
      path: request.url,
      method: request.method,
      userId: (request as any).user?.id,
      statusCode: status,
    };

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status} [${requestId}]`,
        exception instanceof Error ? exception.stack : String(exception),
        JSON.stringify(logContext),
      );

      // Report to Sentry if it's a server error
      Sentry.captureException(exception, {
        extra: logContext,
        user: (request as any).user
          ? { id: (request as any).user.id }
          : undefined,
      });
    } else {
      this.logger.warn(
        `${request.method} ${request.url} - ${status}: ${Array.isArray(body.message) ? body.message.join(', ') : body.message} [${requestId}]`,
      );
    }

    response.status(status).json(body);
  }

  private resolve(
    exception: unknown,
    request: Request,
  ): {
    status: number;
    body: ErrorResponseDto;
  } {
    const requestId =
      (request as any).requestId || request.headers['x-request-id'];
    const path = request.url;
    const timestamp = new Date().toISOString();

    const baseResponse: Partial<ErrorResponseDto> = {
      timestamp,
      requestId,
      path,
    };

    // Handle our custom BaseAppError instances
    if (exception instanceof BaseAppError) {
      const body: ErrorResponseDto = {
        ...baseResponse,
        statusCode: exception.statusCode,
        message: exception.message,
        error: this.getErrorName(exception.statusCode),
        code: exception.code,
      } as ErrorResponseDto;

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

      // Handle rate limiting from Throttler
      if (status === 429) {
        const message =
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : ((exceptionResponse as Record<string, unknown>)
                .message as string) || 'Too Many Requests';
        return {
          status,
          body: {
            ...baseResponse,
            statusCode: status,
            message,
            error: 'Too Many Requests',
            code: ErrorCode.RATE_LIMIT_EXCEEDED,
            retryAfter: 60,
          } as ErrorResponseDto,
        };
      }

      // Handle validation errors from ValidationPipe
      if (
        status === (HttpStatus.BAD_REQUEST as number) &&
        typeof exceptionResponse === 'object'
      ) {
        const res = exceptionResponse as any;
        if (Array.isArray(res.message)) {
          return {
            status,
            body: {
              ...baseResponse,
              statusCode: status,
              message: res.message,
              error: 'Bad Request',
              code: ErrorCode.VALIDATION_FAILED,
            } as ErrorResponseDto,
          };
        }
      }

      const body =
        typeof exceptionResponse === 'object'
          ? ({
              ...baseResponse,
              ...(exceptionResponse as any),
            } as ErrorResponseDto)
          : ({
              ...baseResponse,
              statusCode: status,
              message: exceptionResponse,
              error: this.getErrorName(status),
            } as ErrorResponseDto);

      return { status, body };
    }

    // Handle TypeORM EntityNotFoundError
    if (exception instanceof EntityNotFoundError) {
      return {
        status: HttpStatus.NOT_FOUND,
        body: {
          ...baseResponse,
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Resource not found',
          error: 'Not Found',
          code: ErrorCode.RESOURCE_NOT_FOUND,
        } as ErrorResponseDto,
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
          ...baseResponse,
          statusCode: HttpStatus.CONFLICT,
          message: 'Duplicate entry found',
          error: 'Conflict',
          code: ErrorCode.DUPLICATE_ENTRY,
        } as ErrorResponseDto,
      };
    }

    // Handle generic database errors
    if (exception instanceof QueryFailedError) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: {
          ...baseResponse,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database operation failed',
          error: 'Internal Server Error',
          code: ErrorCode.DATABASE_ERROR,
        } as ErrorResponseDto,
      };
    }

    // Return generic error response for unhandled exceptions
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        ...baseResponse,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
        error: 'Internal Server Error',
        code: ErrorCode.INTERNAL_SERVER_ERROR,
      } as ErrorResponseDto,
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
