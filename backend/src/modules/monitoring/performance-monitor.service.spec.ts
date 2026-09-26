import { Test, TestingModule } from '@nestjs/testing';
import {
  PerformanceMonitorService,
  PerformanceMetrics,
} from './performance-monitor.service';
import { MetricsService } from './metrics.service';
import { AlertService } from './alert.service';

const mockMetrics = {
  recordHttpRequest: jest.fn(),
  recordHttpDuration: jest.fn(),
};
const mockAlert = { handleAlert: jest.fn() };

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

describe('PerformanceMonitorService', () => {
  let service: PerformanceMonitorService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceMonitorService,
        { provide: MetricsService, useValue: mockMetrics },
        { provide: AlertService, useValue: mockAlert },
      ],
    }).compile();
    service = module.get(PerformanceMonitorService);
  });

  describe('getEndpointStats', () => {
    it('correctly parses parameterised paths containing colons', () => {
      service.recordRequestMetrics(
        makeMetric('GET', '/api/properties/:id', 120),
      );
      const stats = service.getEndpointStats('GET', '/api/properties/:id');
      expect(stats).not.toBeNull();
      expect(stats.endpoint).toBe('/api/properties/:id');
      expect(stats.method).toBe('GET');
    });

    it('returns null for an endpoint with no data', () => {
      expect(service.getEndpointStats('GET', '/api/unknown')).toBeNull();
    });
  });

  describe('getResponseTimeStats', () => {
    beforeEach(() => {
      service.recordRequestMetrics(
        makeMetric('GET', '/api/properties/:id', 80),
      );
      service.recordRequestMetrics(
        makeMetric('GET', '/api/properties/:id', 1200),
      );
      service.recordRequestMetrics(makeMetric('POST', '/api/payments', 300));
    });

    it('returns generatedAt, windowSeconds, and routes array', () => {
      const result = service.getResponseTimeStats(60);
      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('windowSeconds', 60);
      expect(Array.isArray(result.routes)).toBe(true);
    });

    it('each route entry has required fields', () => {
      const { routes } = service.getResponseTimeStats(60);
      expect(routes.length).toBeGreaterThan(0);
      ['route', 'count', 'rps', 'p50Ms', 'p95Ms', 'p99Ms', 'slowCount'].forEach(
        (f) => expect(routes[0]).toHaveProperty(f),
      );
    });

    it('counts slow requests correctly', () => {
      const { routes } = service.getResponseTimeStats(60);
      const r = routes.find((x) => x.route === 'GET /api/properties/:id');
      expect(r!.slowCount).toBe(1);
    });

    it('excludes data outside the window', () => {
      expect(service.getResponseTimeStats(0).routes).toHaveLength(0);
    });

    it('sorts routes by p99Ms descending', () => {
      const { routes } = service.getResponseTimeStats(60);
      for (let i = 1; i < routes.length; i++) {
        expect(routes[i - 1].p99Ms).toBeGreaterThanOrEqual(routes[i].p99Ms);
      }
    });
  });

  describe('getSlowEndpoints', () => {
    beforeEach(() => {
      service.recordRequestMetrics(makeMetric('GET', '/api/fast', 50));
      service.recordRequestMetrics(makeMetric('GET', '/api/slow', 800));
      service.recordRequestMetrics(makeMetric('POST', '/api/slow', 1200));
    });

    it('returns endpoints sorted by avgResponseTime descending', () => {
      const results = service.getSlowEndpoints(10);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].avgResponseTime).toBeGreaterThanOrEqual(
          results[i].avgResponseTime,
        );
      }
    });

    it('respects the limit parameter', () => {
      expect(service.getSlowEndpoints(1).length).toBeLessThanOrEqual(1);
    });

    it('filters by threshold', () => {
      const results = service.getSlowEndpoints(10, 500);
      expect(results.every((r) => r.avgResponseTime >= 500)).toBe(true);
    });

    it('returns empty array when no data matches threshold', () => {
      expect(service.getSlowEndpoints(10, 9999)).toHaveLength(0);
    });
  });

  describe('getEndpointPercentiles', () => {
    beforeEach(() => {
      [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].forEach((rt) =>
        service.recordRequestMetrics(makeMetric('GET', '/api/test', rt)),
      );
    });

    it('returns null for unknown endpoint', () => {
      expect(service.getEndpointPercentiles('GET', '/api/missing')).toBeNull();
    });

    it('returns p50, p75, p90, p95, p99', () => {
      const p = service.getEndpointPercentiles('GET', '/api/test');
      ['p50', 'p75', 'p90', 'p95', 'p99'].forEach((k) =>
        expect(p).toHaveProperty(k),
      );
    });

    it('percentiles are in ascending order', () => {
      const p = service.getEndpointPercentiles('GET', '/api/test')!;
      expect(p.p50).toBeLessThanOrEqual(p.p75);
      expect(p.p75).toBeLessThanOrEqual(p.p90);
      expect(p.p90).toBeLessThanOrEqual(p.p95);
      expect(p.p95).toBeLessThanOrEqual(p.p99);
    });
  });

  describe('getAllEndpointPercentiles', () => {
    it('returns an entry per tracked endpoint', () => {
      service.recordRequestMetrics(makeMetric('GET', '/api/a', 100));
      service.recordRequestMetrics(makeMetric('POST', '/api/b', 200));
      const all = service.getAllEndpointPercentiles();
      expect(all.length).toBeGreaterThanOrEqual(2);
      expect(all[0]).toHaveProperty('p95');
    });

    it('returns results sorted by p95 descending', () => {
      service.recordRequestMetrics(makeMetric('GET', '/api/fast', 10));
      service.recordRequestMetrics(makeMetric('GET', '/api/slow', 900));
      const all = service.getAllEndpointPercentiles();
      for (let i = 1; i < all.length; i++) {
        expect(all[i - 1].p95).toBeGreaterThanOrEqual(all[i].p95);
      }
    });

    it('returns empty array when no data recorded', () => {
      expect(service.getAllEndpointPercentiles()).toHaveLength(0);
    });
  });
});
