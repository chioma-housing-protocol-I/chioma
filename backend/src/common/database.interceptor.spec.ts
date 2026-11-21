import { CallHandler, ExecutionContext } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { of, throwError } from 'rxjs';
import {
  DatabaseTimeoutInterceptor,
  isDatabaseTimeoutError,
  mapDatabaseTimeoutError,
} from './database.interceptor';
import { TimeoutException } from './errors/retry-errors';

describe('database query timeout enforcement (#2185)', () => {
  const context = {} as ExecutionContext;

  const pgTimeout = () =>
    new QueryFailedError(
      'SELECT 1',
      [],
      Object.assign(new Error('canceling statement due to statement timeout'), {
        code: '57014',
      }),
    );

  it('recognizes PostgreSQL statement timeouts', () => {
    expect(isDatabaseTimeoutError(pgTimeout())).toBe(true);
    expect(
      isDatabaseTimeoutError(
        Object.assign(new Error('query timeout exceeded'), {
          name: 'QueryTimeoutError',
        }),
      ),
    ).toBe(true);
  });

  it('does not treat ordinary database errors as timeouts', () => {
    expect(
      isDatabaseTimeoutError(
        new QueryFailedError('SELECT 1', [], new Error('syntax error')),
      ),
    ).toBe(false);
    expect(isDatabaseTimeoutError(new Error('bad request'))).toBe(false);
  });

  it('maps a driver timeout to TimeoutException without changing other errors', () => {
    expect(mapDatabaseTimeoutError(pgTimeout())).toBeInstanceOf(
      TimeoutException,
    );

    const plain = new Error('other failure');
    expect(mapDatabaseTimeoutError(plain)).toBe(plain);
  });

  it('maps timeouts emitted by a handler through the interceptor', async () => {
    const interceptor = new DatabaseTimeoutInterceptor();
    const next: CallHandler = {
      handle: () => throwError(() => pgTimeout()),
    };

    await expect(
      new Promise((resolve, reject) => {
        interceptor
          .intercept(context, next)
          .subscribe({ next: resolve, error: reject });
      }),
    ).rejects.toBeInstanceOf(TimeoutException);
  });

  it('passes successful results through unchanged', async () => {
    const interceptor = new DatabaseTimeoutInterceptor();
    const next: CallHandler = { handle: () => of('ok') };

    await expect(
      new Promise((resolve, reject) => {
        interceptor
          .intercept(context, next)
          .subscribe({ next: resolve, error: reject });
      }),
    ).resolves.toBe('ok');
  });
});
