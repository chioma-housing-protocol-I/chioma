import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../services/logger.service';
import { sanitizeBody } from '../middleware/logger.middleware';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    if (req.path === '/health') {
      return next.handle();
    }

    const { method, url } = req;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (responseBody: unknown) => {
          const duration = Date.now() - startTime;
          this.logger.info(`Response: ${method} ${url}`, {
            duration,
            statusCode: res.statusCode,
            response: sanitizeBody(responseBody),
          });
        },
        error: (error: unknown) => {
          const duration = Date.now() - startTime;
          this.logger.error(`Error: ${method} ${url}`, error instanceof Error ? error : new Error(String(error)), {
            duration,
            statusCode: (error as any)?.status || 500,
          });
        },
      }),
    );
  }
}
