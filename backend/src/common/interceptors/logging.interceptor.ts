import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import * as Sentry from '@sentry/nestjs';
import { sanitizeBody } from '../middleware/logger.middleware';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('LoggingInterceptor');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const body = sanitizeBody(req.body);

    // Store on res.locals (safe across lifecycle)
    res.locals.requestBody = body;

    // Enrich Sentry scope with request context for better error attribution
    Sentry.getCurrentScope().setContext('request', {
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    if (req.user?.id) {
      Sentry.setUser({ id: req.user.id, email: req.user.email });
    }

    return next.handle().pipe(
      tap({
        error: (error: Error) => {
          // Errors are captured by Sentry's global error handler already,
          // but we add extra context and log it through our LoggerService.
          this.logger.error(`${req.method} ${req.url} - Error`, error, {
            method: req.method,
            url: req.url,
          });

          Sentry.addBreadcrumb({
            category: 'http',
            message: `${req.method} ${req.url} - Error: ${error.message}`,
            level: 'error',
          });
        },
      }),
    );
  }
}
