import { PerformanceMiddleware } from './performance.middleware';

describe('PerformanceMiddleware', () => {
  let performanceMonitor: { recordRequestMetrics: jest.Mock };
  let middleware: PerformanceMiddleware;

  beforeEach(() => {
    performanceMonitor = { recordRequestMetrics: jest.fn() };
    middleware = new PerformanceMiddleware(performanceMonitor as any);
  });

  function makeReqRes(path: string, routePath?: string) {
    const req: any = {
      path,
      method: 'GET',
      route: routePath ? { path: routePath } : undefined,
      get: jest.fn().mockReturnValue('jest-agent'),
    };
    const res: any = {
      statusCode: 200,
      end: jest.fn(),
      send: jest.fn(),
    };
    return { req, res };
  }

  it('records the matched route template for a recognized route (res.end)', () => {
    const { req, res } = makeReqRes('/api/users/42', '/api/users/:id');
    middleware.use(req, res, () => {});

    res.end();

    expect(performanceMonitor.recordRequestMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: '/api/users/:id' }),
    );
  });

  it('collapses an unmatched route into a bounded "unmatched" bucket, not the raw path (#2036, res.end)', () => {
    const { req, res } = makeReqRes('/api/does-not-exist/42');
    middleware.use(req, res, () => {});

    res.end();

    expect(performanceMonitor.recordRequestMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'unmatched' }),
    );
  });

  it('collapses an unmatched route into a bounded "unmatched" bucket, not the raw path (#2036, res.send)', () => {
    const { req, res } = makeReqRes('/api/another-missing-one');
    middleware.use(req, res, () => {});

    res.send();

    expect(performanceMonitor.recordRequestMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'unmatched' }),
    );
  });

  it('does not record metrics for non-API, non-health paths', () => {
    const { req, res } = makeReqRes('/static/logo.png');
    middleware.use(req, res, () => {});

    res.end();

    expect(performanceMonitor.recordRequestMetrics).not.toHaveBeenCalled();
  });
});
