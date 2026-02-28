import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as Sentry from '@sentry/nestjs';
import { sanitizeBody } from '../middleware/logger.middleware';

const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-api-key'];

function sanitizeHeaders(
  headers: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    result[key] = SENSITIVE_HEADERS.includes(key.toLowerCase())
      ? '[REDACTED]'
      : value;
  }
  return result;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    if (req.path === '/health') {
      return next.handle();
    }

    const { method, url, ip } = req;
    const correlationId: string =
      (req as Record<string, any>).correlationId ||
      (req.headers['x-request-id'] as string) ||
      'unknown';
    const userAgent: string = (req.headers['user-agent'] as string) || '';
    const sanitizedBody = sanitizeBody(req.body);
    const sanitizedHeaders = sanitizeHeaders(
      req.headers as Record<string, unknown>,
    );
    const startTime = Date.now();

    // Store sanitized body on res.locals for middleware to access
    res.locals.requestBody = sanitizedBody;

    Sentry.getCurrentScope().setContext('request', {
      method,
      url,
      userAgent,
      ip,
      correlationId,
    });

    if (req.user?.id) {
      Sentry.setUser({ id: req.user.id, email: req.user.email });
    }

    this.logger.log(
      `Incoming ${method} ${url} [${correlationId}] ` +
        `ip=${ip} userId=${req.user?.id ?? 'anonymous'} ` +
        `body=${JSON.stringify(sanitizedBody)} ` +
        `headers=${JSON.stringify(sanitizedHeaders)}`,
    );

    return next.handle().pipe(
      tap({
        next: (responseBody: unknown) => {
          const duration = Date.now() - startTime;
          const statusCode: number = res.statusCode;

          this.logger.log(
            `Outgoing ${method} ${url} ${statusCode} ${duration}ms [${correlationId}] ` +
              `response=${JSON.stringify(sanitizeBody(responseBody))}`,
          );
        },
        error: (error: unknown) => {
          const duration = Date.now() - startTime;
          const statusCode = (error as { status?: number })?.status ?? 500;
          const message =
            error instanceof Error ? error.message : String(error);
          const stack = error instanceof Error ? error.stack : undefined;

          this.logger.error(
            `Error ${method} ${url} ${statusCode} ${duration}ms [${correlationId}] ${message}`,
            stack,
          );

          Sentry.addBreadcrumb({
            category: 'http',
            message: `${method} ${url} - Error: ${message}`,
            level: 'error',
          });
        },
      }),
    );
  }
}
