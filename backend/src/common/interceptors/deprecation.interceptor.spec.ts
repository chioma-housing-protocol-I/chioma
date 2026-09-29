import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';

import { DeprecationInterceptor } from './deprecation.interceptor';
import { Deprecated } from '../decorators/deprecated.decorator';

class TestController {
  @Deprecated({
    sunsetDate: '2026-12-31T00:00:00Z',
    migrationGuideUrl: 'https://docs.example.com/migrate',
    replacementEndpoint: '/api/v2/widgets',
    message: 'internal note',
  })
  deprecatedHandler() {}

  @Deprecated()
  bareDeprecatedHandler() {}

  activeHandler() {}
}

function makeContext(
  handler: () => void,
  opts: { method?: string; path?: string } = {},
): { context: ExecutionContext; response: { setHeader: jest.Mock } } {
  const request = { method: opts.method ?? 'GET', path: opts.path ?? '/test' };
  const response = { setHeader: jest.fn() };

  const context = {
    getHandler: () => handler,
    getClass: () => TestController,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;

  return { context, response };
}

const nextHandler: CallHandler = { handle: () => of('ok') };

describe('DeprecationInterceptor', () => {
  let interceptor: DeprecationInterceptor;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new DeprecationInterceptor(new Reflector());
    loggerWarnSpy = jest
      .spyOn((interceptor as any).logger, 'warn')
      .mockImplementation(() => {});
  });

  it('passes through untouched when the route is not deprecated', (done) => {
    const { context, response } = makeContext(
      TestController.prototype.activeHandler,
    );

    interceptor.intercept(context, nextHandler).subscribe((value) => {
      expect(value).toBe('ok');
      expect(response.setHeader).not.toHaveBeenCalled();
      expect(loggerWarnSpy).not.toHaveBeenCalled();
      done();
    });
  });

  it('sets Deprecation, Sunset and Link headers for a fully configured route', (done) => {
    const { context, response } = makeContext(
      TestController.prototype.deprecatedHandler,
      { method: 'GET', path: '/messaging/history' },
    );

    interceptor.intercept(context, nextHandler).subscribe((value) => {
      expect(value).toBe('ok');
      expect(response.setHeader).toHaveBeenCalledWith('Deprecated', 'true');
      expect(response.setHeader).toHaveBeenCalledWith(
        'Sunset',
        new Date('2026-12-31T00:00:00Z').toUTCString(),
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        'Link',
        '</api/v2/widgets>; rel="successor-version", <https://docs.example.com/migrate>; rel="deprecation"',
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Deprecated endpoint called: GET /messaging/history',
        expect.objectContaining({ message: 'internal note' }),
      );
      done();
    });
  });

  it('only sets the Deprecated header when no other options are configured', (done) => {
    const { context, response } = makeContext(
      TestController.prototype.bareDeprecatedHandler,
    );

    interceptor.intercept(context, nextHandler).subscribe(() => {
      expect(response.setHeader).toHaveBeenCalledWith('Deprecated', 'true');
      expect(response.setHeader).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it('ignores an unparseable sunsetDate instead of sending a garbage header', (done) => {
    class BadDateController {
      @Deprecated({ sunsetDate: 'not-a-date' })
      handler() {}
    }

    const { context, response } = makeContext(
      BadDateController.prototype.handler,
    );

    interceptor.intercept(context, nextHandler).subscribe(() => {
      expect(response.setHeader).toHaveBeenCalledWith('Deprecated', 'true');
      expect(response.setHeader).not.toHaveBeenCalledWith(
        'Sunset',
        expect.anything(),
      );
      done();
    });
  });
});
