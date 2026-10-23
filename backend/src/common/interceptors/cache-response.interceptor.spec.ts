import { ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { CacheResponseInterceptor } from './cache-response.interceptor';
import { CacheService } from '../cache/cache.service';

function makeContext(
  opts: { path?: string; method?: string; originalUrl?: string } = {},
): ExecutionContext {
  const req = {
    path: opts.path ?? '/properties',
    method: opts.method ?? 'GET',
    originalUrl: opts.originalUrl ?? opts.path ?? '/properties',
    url: opts.originalUrl ?? opts.path ?? '/properties',
  };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

const flushImmediate = () => new Promise<void>((r) => setImmediate(r));

describe('CacheResponseInterceptor', () => {
  let interceptor: CacheResponseInterceptor;
  let cacheService: jest.Mocked<
    Pick<CacheService, 'get' | 'set' | 'invalidateDependencies'>
  >;

  beforeEach(() => {
    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      invalidateDependencies: jest.fn().mockResolvedValue(undefined),
    };
    interceptor = new CacheResponseInterceptor(
      cacheService as unknown as CacheService,
    );
  });

  it('calls through to the handler on a cache miss and caches the result', async () => {
    const handlerResult = { id: '1', title: 'A property' };
    const handle = jest.fn().mockReturnValue(of(handlerResult));

    const result = await interceptor.intercept(
      makeContext({ path: '/properties', originalUrl: '/properties?page=1' }),
      { handle },
    );

    await new Promise<void>((resolve) =>
      result.subscribe({ complete: resolve }),
    );
    await flushImmediate();

    expect(handle).toHaveBeenCalledTimes(1);
    expect(cacheService.set).toHaveBeenCalledWith(
      'http:response:/properties?page=1',
      handlerResult,
      60_000,
      ['http:response:dep:/properties'],
    );
  });

  it('returns the cached value without calling the handler on a cache hit', async () => {
    const cached = { id: '1', title: 'Cached property' };
    cacheService.get.mockResolvedValue(cached);
    const handle = jest.fn().mockReturnValue(of({ id: '1', title: 'Fresh' }));

    const result = await interceptor.intercept(
      makeContext({ path: '/properties', originalUrl: '/properties?page=1' }),
      { handle },
    );

    const emitted = await new Promise((resolve) => {
      result.subscribe({ next: resolve });
    });

    expect(emitted).toEqual(cached);
    expect(handle).not.toHaveBeenCalled();
  });

  it('caches two different query strings on the same path separately', async () => {
    const handle = jest.fn().mockReturnValue(of({ page: 'whatever' }));

    await (
      await interceptor.intercept(
        makeContext({ path: '/properties', originalUrl: '/properties?page=1' }),
        { handle },
      )
    ).toPromise();
    await (
      await interceptor.intercept(
        makeContext({ path: '/properties', originalUrl: '/properties?page=2' }),
        { handle },
      )
    ).toPromise();
    await flushImmediate();

    const cacheKeys = cacheService.set.mock.calls.map((call) => call[0]);
    expect(cacheKeys).toEqual([
      'http:response:/properties?page=1',
      'http:response:/properties?page=2',
    ]);
  });

  it('does not cache non-GET, non-mutating-recognized requests like HEAD', async () => {
    const handle = jest.fn().mockReturnValue(of({}));

    await (
      await interceptor.intercept(makeContext({ method: 'HEAD' }), { handle })
    ).toPromise();
    await flushImmediate();

    expect(cacheService.get).not.toHaveBeenCalled();
    expect(cacheService.set).not.toHaveBeenCalled();
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'invalidates the base resource cache after a successful %s mutation',
    async (method) => {
      const handle = jest.fn().mockReturnValue(of({ success: true }));

      const result = await interceptor.intercept(
        makeContext({ method, path: '/properties/abc' }),
        { handle },
      );
      await new Promise<void>((resolve) =>
        result.subscribe({ complete: resolve }),
      );
      await flushImmediate();

      expect(cacheService.invalidateDependencies).toHaveBeenCalledWith([
        'http:response:dep:/properties',
      ]);
    },
  );

  it('does not invalidate the cache before the mutation handler completes', async () => {
    const handle = jest.fn().mockReturnValue(of({ success: true }));

    await interceptor.intercept(
      makeContext({ method: 'POST', path: '/properties' }),
      {
        handle,
      },
    );

    // invalidateDependencies is wired via a `tap` on the handler's own
    // observable, so synchronously after calling intercept (before the
    // observable has been subscribed to / completed) it must not have run
    // yet.
    expect(cacheService.invalidateDependencies).not.toHaveBeenCalled();
  });

  it('tags a nested resource path by its first path segment only', async () => {
    const handle = jest.fn().mockReturnValue(of({}));

    const result = await interceptor.intercept(
      makeContext({ method: 'PATCH', path: '/properties/abc/reviews/1' }),
      { handle },
    );
    await new Promise<void>((resolve) =>
      result.subscribe({ complete: resolve }),
    );
    await flushImmediate();

    expect(cacheService.invalidateDependencies).toHaveBeenCalledWith([
      'http:response:dep:/properties',
    ]);
  });
});
