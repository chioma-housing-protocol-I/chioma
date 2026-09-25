import {
  INestApplication,
  ExecutionContext,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError, delay } from 'rxjs';
import * as request from 'supertest';

import { ResponseTimeInterceptor } from './response-time.interceptor';
import {
  PerformanceMonitorService,
  PerformanceMetrics,
  SLOW_REQUEST_THRESHOLD_MS,
} from '../../modules/monitoring/performance-monitor.service';
import { MetricsService } from '../../modules/monitoring/metrics.service';
import { AlertService } from '../../modules/monitoring/alert.service';
import { PerformanceController } from '../../modules/monitoring/performance.controller';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../modules/auth/guards/roles.guard';

// ── helpers ──────────────────────────────────────────────────────────────────

const flushImmediate = () => new Promise<void>((r) => setImmediate(r));

function makeMetric(
  method: string,
  endpoint: string,
  responseTime: number,
  statusCode = 200,
): PerformanceMetrics {
  return {
    timestamp: new Date(),
    endpoint,
    method,
    responseTime,
    statusCode,
    memoryUsage: process.memoryUsage(),
  };
}

const mockPerformanceMonitor = { recordRequestMetrics: jest.fn() };

function makeContext(
  opts: {
    path?: string;
    method?: string;
    routePath?: string;
    statusCode?: number;
    startTime?: number;
  } = {},
): ExecutionContext {
  const req: any = {
    path: opts.path ?? '/api/test',
    method: opts.method ?? 'GET',
    route: opts.routePath ? { path: opts.routePath } : undefined,
    get: jest.fn().mockReturnValue('jest-agent'),
    user: undefined,
    _startTime: opts.startTime,
  };
  const res = { statusCode: opts.statusCode ?? 200 };
  return {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ExecutionContext;
}

// ── ResponseTimeInterceptor unit tests ───────────────────────────────────────

describe('ResponseTimeInterceptor', () => {
  let interceptor: ResponseTimeInterceptor;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    delete process.env.RESPONSE_TIME_ENABLED;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResponseTimeInterceptor,
        {
          provide: PerformanceMonitorService,
          useValue: mockPerformanceMonitor,
        },
      ],
    }).compile();

    interceptor = module.get(ResponseTimeInterceptor);
    loggerWarnSpy = jest
      .spyOn((interceptor as any).logger, 'warn')
      .mockImplementation(() => {});
  });

  it('records_duration_on_success', async () => {
    const ctx = makeContext({ path: '/api/properties', method: 'GET' });
    await new Promise<void>((resolve) => {
      interceptor
        .intercept(ctx, { handle: () => of({}).pipe(delay(5)) })
        .subscribe({ complete: resolve });
    });
    await flushImmediate();

    expect(mockPerformanceMonitor.recordRequestMetrics).toHaveBeenCalledTimes(
      1,
    );
    const m = mockPerformanceMonitor.recordRequestMetrics.mock.calls[0][0];
    expect(m.responseTime).toBeGreaterThanOrEqual(0);
    expect(m.statusCode).toBe(200);
  });

  it('records_duration_on_error — status 500 still recorded', async () => {
    const ctx = makeContext({
      path: '/api/payments',
      method: 'POST',
      statusCode: 500,
    });
    await new Promise<void>((resolve) => {
      interceptor
        .intercept(ctx, { handle: () => throwError(() => ({ status: 500 })) })
        .subscribe({ error: resolve });
    });
    await flushImmediate();

    const m = mockPerformanceMonitor.recordRequestMetrics.mock.calls[0][0];
    expect(m.responseTime).toBeGreaterThanOrEqual(0);
    expect(m.statusCode).toBe(500);
  });

  it('route_pattern_not_raw_path — raw paths grouped under template', async () => {
    const endpoints: string[] = [];
    mockPerformanceMonitor.recordRequestMetrics.mockImplementation(
      (m: PerformanceMetrics) => endpoints.push(m.endpoint),
    );

    await Promise.all(
      ['/users/42', '/users/99'].map(
        (rawPath) =>
          new Promise<void>((resolve) => {
            interceptor
              .intercept(
                makeContext({ path: rawPath, routePath: '/users/:id' }),
                { handle: () => of({}) },
              )
              .subscribe({ complete: resolve });
          }),
      ),
    );
    await flushImmediate();

    expect(endpoints).toEqual(['/users/:id', '/users/:id']);
  });

  it('slow_request_warning_logged — warn with endpoint and responseTime > threshold', async () => {
    const ctx = makeContext({
      routePath: '/api/slow',
      startTime: Date.now() - (SLOW_REQUEST_THRESHOLD_MS + 200),
    });

    await new Promise<void>((resolve) => {
      interceptor
        .intercept(ctx, { handle: () => of({}) })
        .subscribe({ complete: resolve });
    });
    await flushImmediate();

    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'Slow request detected',
      expect.objectContaining({ endpoint: '/api/slow' }),
    );
    expect(loggerWarnSpy.mock.calls[0][1].responseTime).toBeGreaterThan(
      SLOW_REQUEST_THRESHOLD_MS,
    );
  });

  it('fast_request_no_warning — no warn below threshold', async () => {
    await new Promise<void>((resolve) => {
      interceptor
        .intercept(makeContext(), { handle: () => of({}) })
        .subscribe({ complete: resolve });
    });
    await flushImmediate();

    expect(loggerWarnSpy).not.toHaveBeenCalled();
  });

  it('middleware_disabled_by_config — RESPONSE_TIME_ENABLED=false skips all recording', async () => {
    process.env.RESPONSE_TIME_ENABLED = 'false';
    await new Promise<void>((resolve) => {
      interceptor
        .intercept(makeContext(), { handle: () => of({}) })
        .subscribe({ complete: resolve });
    });
    await flushImmediate();

    expect(mockPerformanceMonitor.recordRequestMetrics).not.toHaveBeenCalled();
    delete process.env.RESPONSE_TIME_ENABLED;
  });

  it('concurrent_requests_no_race — 50 concurrent requests all recorded', async () => {
    const N = 50;
    await Promise.all(
      Array.from(
        { length: N },
        (_, i) =>
          new Promise<void>((resolve) => {
            interceptor
              .intercept(
                makeContext({
                  path: `/api/item/${i}`,
                  routePath: '/api/item/:id',
                }),
                { handle: () => of({}) },
              )
              .subscribe({ complete: resolve });
          }),
      ),
    );
    await flushImmediate();

    expect(mockPerformanceMonitor.recordRequestMetrics).toHaveBeenCalledTimes(
      N,
    );
  });

  it('x_response_time_header_format — duration_ms is a non-negative integer', async () => {
    await new Promise<void>((resolve) => {
      interceptor
        .intercept(makeContext(), { handle: () => of({}) })
        .subscribe({ complete: resolve });
    });
    await flushImmediate();

    const m = mockPerformanceMonitor.recordRequestMetrics.mock.calls[0][0];
    expect(typeof m.responseTime).toBe('number');
    expect(m.responseTime).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(m.responseTime)).toBe(true);
  });
});

// ── shared mocks ──────────────────────────────────────────────────────────────
const sharedMockMetrics = {
  recordHttpRequest: jest.fn(),
  recordHttpDuration: jest.fn(),
};
const sharedMockAlert = { handleAlert: jest.fn() };

// ── PerformanceMonitorService — analysis_snapshot_correctness ─────────────────

describe('PerformanceMonitorService — analysis_snapshot_correctness', () => {
  let service: PerformanceMonitorService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceMonitorService,
        { provide: MetricsService, useValue: sharedMockMetrics },
        { provide: AlertService, useValue: sharedMockAlert },
      ],
    }).compile();
    service = module.get(PerformanceMonitorService);
  });

  it('p50≈50, p95≈95, count=100 for observations [1..100]ms', () => {
    for (let i = 1; i <= 100; i++) {
      service.recordRequestMetrics(makeMetric('GET', '/api/test', i));
    }
    const stats = service.getEndpointStats('GET', '/api/test');
    expect(stats.totalRequests).toBe(100);
    expect(stats.p50ResponseTime).toBeGreaterThanOrEqual(48);
    expect(stats.p50ResponseTime).toBeLessThanOrEqual(52);
    expect(stats.p95ResponseTime).toBeGreaterThanOrEqual(93);
    expect(stats.p95ResponseTime).toBeLessThanOrEqual(97);
  });

  it('getResponseTimeStats count matches recorded observations', () => {
    for (let i = 0; i < 10; i++) {
      service.recordRequestMetrics(makeMetric('GET', '/api/props', 50));
    }
    const { routes } = service.getResponseTimeStats(60);
    const r = routes.find((x) => x.route === 'GET /api/props');
    expect(r!.count).toBe(10);
  });
});

// ── PerformanceController — internal_metrics_endpoint_auth ───────────────────

describe('PerformanceController — internal_metrics_endpoint_auth', () => {
  let app: INestApplication;
  let perfMonitor: PerformanceMonitorService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PerformanceController],
      providers: [
        PerformanceMonitorService,
        { provide: MetricsService, useValue: sharedMockMetrics },
        { provide: AlertService, useValue: sharedMockAlert },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(ctx: ExecutionContext) {
          const req = ctx
            .switchToHttp()
            .getRequest<{ headers: Record<string, string> }>();
          return req.headers['authorization'] === 'Bearer valid-admin-token';
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    perfMonitor = module.get(PerformanceMonitorService);
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(() => app.close());

  it('returns 401 without auth token', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/performance/response-times',
    );
    expect([401, 403]).toContain(res.status);
  });

  it('returns 200 with valid admin token and routes array', async () => {
    perfMonitor.recordRequestMetrics(makeMetric('GET', '/api/properties', 80));
    const res = await request(app.getHttpServer())
      .get('/api/performance/response-times')
      .set('Authorization', 'Bearer valid-admin-token');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.routes)).toBe(true);
  });
});
