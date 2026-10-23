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
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { BaseAppError } from '../errors/base.error';
import { ErrorCode } from '../errors/error-codes';
import { RateLimitError } from '../errors/domain-errors';
import { ErrorResponseDto } from '../dto/error-response.dto';

/** Express Request extended with fields added by NestJS/Passport middleware. */
interface AuthenticatedRequest extends Request {
  requestId?: string;
  user?: { id: string };
}

/** Shape of a NestJS ValidationPipe exception response body. */
interface ValidationExceptionResponse {
  message: string | string[];
  error?: string;
  statusCode?: number;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AuthenticatedRequest>();

    const { status, body, retryAfter } = this.resolve(exception, request);

    if (retryAfter !== undefined) {
      response.setHeader('Retry-After', String(retryAfter));
    }

    // Log error with request context
    const requestId =
      request.requestId ?? (request.headers['x-request-id'] as string);
    const logContext = {
      requestId,
      path: request.url,
      method: request.method,
      userId: request.user?.id,
      statusCode: status,
    };

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status} [${requestId}]`,
        exception instanceof Error ? exception.stack : String(exception),
        JSON.stringify(logContext),
      );

      // Mark the active trace span as failed so the APM (Datadog/New Relic
      // via OTLP) attributes the error to the request trace.
      const span = trace.getActiveSpan();
      if (span) {
        if (exception instanceof Error) span.recordException(exception);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: exception instanceof Error ? exception.message : undefined,
        });
      }

      // Report to Sentry if it's a server error
      Sentry.captureException(exception, {
        extra: logContext,
        user: request.user ? { id: request.user.id } : undefined,
      });
    } else {
      this.logger.warn(
        `${request.method} ${request.url} - ${status}: ${Array.isArray(body.error.message) ? body.error.message.join(', ') : body.error.message} [${requestId}]`,
      );
    }

    response.status(status).json(body);
  }

  private resolve(
    exception: unknown,
    request: AuthenticatedRequest,
  ): {
    status: number;
    body: ErrorResponseDto;
    retryAfter?: number;
  } {
    const requestId =
      request.requestId ?? (request.headers['x-request-id'] as string);
    const path = request.url;
    const timestamp = new Date().toISOString();

    const envelope = (
      status: number,
      code: ErrorCode | string,
      message: string | string[],
      details?: unknown,
    ): ErrorResponseDto => ({
      error: {
        code: code as ErrorCode,
        message,
        ...(details !== undefined ? { details } : {}),
        timestamp,
        requestId,
        path,
      },
    });

    // Handle our custom BaseAppError instances
    if (exception instanceof BaseAppError) {
      return {
        status: exception.statusCode,
        body: envelope(
          exception.statusCode,
          exception.code,
          exception.message,
          exception.context,
        ),
        // Rate limit retry timing goes on the Retry-After header, not the
        // JSON body, to avoid leaking rate-limit timing info to attackers.
        retryAfter:
          exception instanceof RateLimitError && exception.retryAfter
            ? exception.retryAfter
            : undefined,
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
          body: envelope(status, ErrorCode.RATE_LIMIT_EXCEEDED, message),
          retryAfter: 60,
        };
      }

      // Handle validation errors from ValidationPipe
      if (
        status === (HttpStatus.BAD_REQUEST as number) &&
        typeof exceptionResponse === 'object'
      ) {
        const res = exceptionResponse as ValidationExceptionResponse;
        if (Array.isArray(res.message)) {
          return {
            status,
            body: envelope(
              status,
              ErrorCode.VALIDATION_FAILED,
              res.message,
              // Individual field errors, surfaced alongside the combined
              // message array so a client can map them to form fields.
              res.message.map((issue) => ({ message: issue })),
            ),
          };
        }
      }

      if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as Record<string, unknown>;
        const { message, code, error, statusCode, ...rest } = res;
        const details = Object.keys(rest).length > 0 ? rest : undefined;
        return {
          status,
          body: envelope(
            status,
            (code as ErrorCode) ?? this.codeForStatus(status),
            (message as string | string[]) ?? this.getErrorName(status),
            details,
          ),
        };
      }

      return {
        status,
        body: envelope(
          status,
          this.codeForStatus(status),
          (exceptionResponse as string) ?? this.getErrorName(status),
        ),
      };
    }

    // Handle TypeORM EntityNotFoundError
    if (exception instanceof EntityNotFoundError) {
      return {
        status: HttpStatus.NOT_FOUND,
        body: envelope(
          HttpStatus.NOT_FOUND,
          ErrorCode.RESOURCE_NOT_FOUND,
          'Resource not found',
        ),
      };
    }

    // Handle TypeORM QueryFailedError (duplicate entry)
    if (
      exception instanceof QueryFailedError &&
      (exception as unknown as { code: string }).code === '23505'
    ) {
      return {
        status: HttpStatus.CONFLICT,
        body: envelope(
          HttpStatus.CONFLICT,
          ErrorCode.DUPLICATE_ENTRY,
          'Duplicate entry found',
        ),
      };
    }

    // Handle generic database errors
    if (exception instanceof QueryFailedError) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: envelope(
          HttpStatus.INTERNAL_SERVER_ERROR,
          ErrorCode.DATABASE_ERROR,
          'Database operation failed',
        ),
      };
    }

    // Return generic error response for unhandled exceptions
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: envelope(
        HttpStatus.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_SERVER_ERROR,
        'An unexpected error occurred',
      ),
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

  /** Falls back to a generic per-status code when an exception carries none of its own. */
  private codeForStatus(statusCode: number): ErrorCode {
    const codes: Record<number, ErrorCode> = {
      400: ErrorCode.VALIDATION_FAILED,
      401: ErrorCode.AUTH_UNAUTHORIZED,
      403: ErrorCode.AUTH_FORBIDDEN,
      404: ErrorCode.RESOURCE_NOT_FOUND,
      409: ErrorCode.BUSINESS_RULE_VIOLATION,
      429: ErrorCode.RATE_LIMIT_EXCEEDED,
      500: ErrorCode.INTERNAL_SERVER_ERROR,
      503: ErrorCode.SERVICE_UNAVAILABLE,
    };

    return codes[statusCode] ?? ErrorCode.UNKNOWN_ERROR;
  }
}
