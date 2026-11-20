import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Observable, catchError, from, lastValueFrom, throwError } from 'rxjs';
import { DatabaseBackpressureService } from './database-backpressure.service';

@Injectable()
export class DatabaseBackpressureInterceptor implements NestInterceptor {
  constructor(
    private readonly backpressureService: DatabaseBackpressureService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return from(
      this.backpressureService.run(() => lastValueFrom(next.handle())),
    ).pipe(
      catchError((error: unknown) => {
        if (this.isPoolExhaustionError(error)) {
          return throwError(
            () =>
              new ServiceUnavailableException({
                statusCode: 503,
                error: 'Service Unavailable',
                message:
                  'Database pool exhausted while handling the request',
                code: 'DB_POOL_EXHAUSTED',
              }),
          );
        }
        return throwError(() => error as Error);
      }),
    );
  }

  private isPoolExhaustionError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout exceeded when trying to connect') ||
      message.includes('too many clients already') ||
      message.includes('remaining connection slots are reserved') ||
      message.includes('connection pool exhausted') ||
      message.includes('sorry, too many clients')
    );
  }
}
