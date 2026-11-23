import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Observable, catchError } from 'rxjs';
import { TimeoutException } from './errors/retry-errors';

/** PostgreSQL SQLSTATE for a cancelled statement (statement_timeout). */
const STATEMENT_TIMEOUT_CODE = '57014';

/**
 * True when a driver or TypeORM error represents a query that exceeded its
 * statement timeout. Both the pg SQLSTATE and the common driver error names
 * are handled so the mapping works for direct and replicated connections.
 */
export function isDatabaseTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const driverError = (error as QueryFailedError).driverError;
  if (
    driverError &&
    typeof driverError === 'object' &&
    (driverError as { code?: unknown }).code === STATEMENT_TIMEOUT_CODE
  ) {
    return true;
  }

  if (/statement timeout|query timeout/i.test(error.message)) {
    return true;
  }

  return ['QueryTimeoutError', 'StatementTimeoutError'].includes(error.name);
}

/**
 * Converts a driver timeout into the application-level TimeoutException that
 * the global exception filter already knows how to serialize. All other
 * errors are returned untouched so existing error handling is preserved.
 */
export function mapDatabaseTimeoutError(error: unknown): unknown {
  if (!isDatabaseTimeoutError(error)) {
    return error;
  }

  const context =
    error instanceof QueryFailedError
      ? { query: error.query }
      : {
          originalMessage:
            error instanceof Error ? error.message : String(error),
        };

  return new TimeoutException('Database query timed out', context);
}

/**
 * Thin HTTP-boundary interceptor. The real enforcement is the PostgreSQL
 * `statement_timeout` configured on the data source; this only translates a
 * driver timeout into a clean 408 response instead of leaking a 500.
 */
@Injectable()
export class DatabaseTimeoutInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error: unknown) => {
        throw mapDatabaseTimeoutError(error);
      }),
    );
  }
}
