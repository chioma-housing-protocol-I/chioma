import './setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { BulkheadService } from '../src/common/resilience/bulkhead.service';
import { FallbackService } from '../src/common/resilience/fallback.service';
import { DegradationService } from '../src/common/resilience/degradation.service';
import { IncidentService } from '../src/common/resilience/incident.service';
import {
  DegradationLevel,
  FeaturePriority,
  IncidentSeverity,
} from '../src/common/resilience/resilience.types';
import { BulkheadCapacityExceededError } from '../src/common/resilience/resilience.errors';

describe('Chaos Engineering: Resilience (e2e)', () => {
  let app: INestApplication;
  let bulkheadService: BulkheadService;
  let fallbackService: FallbackService;
  let degradationService: DegradationService;
  let incidentService: IncidentService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    bulkheadService = moduleFixture.get(BulkheadService);
    fallbackService = moduleFixture.get(FallbackService);
    degradationService = moduleFixture.get(DegradationService);
    incidentService = moduleFixture.get(IncidentService);

    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    fallbackService.resetStats();
  });

  describe('Bulkhead isolation under load spikes', () => {
    it('prevents a saturated compartment from exhausting shared resources', async () => {
      bulkheadService.configure('chaos-slow', {
        maxConcurrent: 2,
        maxQueue: 2,
      });
      bulkheadService.configure('chaos-fast', {
        maxConcurrent: 10,
        maxQueue: 10,
      });

      const hold = new Promise<void>(() => {});
      const slowCalls = Array.from({ length: 4 }, () =>
        bulkheadService.execute('chaos-slow', () => hold),
      );

      await new Promise((r) => setImmediate(r));

      const fastResults = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          bulkheadService.execute('chaos-fast', async () => `fast-${i}`),
        ),
      );

      expect(fastResults).toEqual([
        'fast-0',
        'fast-1',
        'fast-2',
        'fast-3',
        'fast-4',
      ]);

      const slowMetrics = bulkheadService.getMetrics('chaos-slow');
      expect(slowMetrics?.totalRejected).toBe(0);

      const fastMetrics = bulkheadService.getMetrics('chaos-fast');
      expect(fastMetrics?.totalRejected).toBe(0);
      expect(fastMetrics?.totalExecuted).toBe(5);
    });

    it('rejects calls beyond capacity with BulkheadCapacityExceededError', async () => {
      bulkheadService.configure('chaos-tight', {
        maxConcurrent: 1,
        maxQueue: 0,
      });

      const hold = new Promise<void>(() => {});
      const first = bulkheadService.execute('chaos-tight', () => hold);

      await new Promise((r) => setImmediate(r));

      await expect(
        bulkheadService.execute('chaos-tight', async () => 'overflow'),
      ).rejects.toBeInstanceOf(BulkheadCapacityExceededError);

      const metrics = bulkheadService.getMetrics('chaos-tight');
      expect(metrics?.totalRejected).toBe(1);
    });
  });

  describe('Fallback behavior under dependency failure', () => {
    it('serves fallback value when primary operation fails', async () => {
      const result = await fallbackService.execute(
        async () => {
          throw new Error('db connection lost');
        },
        {
          fallbackValue: { cached: true, data: [] },
          context: 'chaos-fallback',
        },
      );

      expect(result).toEqual({ cached: true, data: [] });
      expect(fallbackService.getStats().totalFallbacks).toBe(1);
    });

    it('invokes fallbackFn with the original error context', async () => {
      const originalError = new Error('timeout connecting to stellar');
      const fallbackFn = jest.fn().mockResolvedValue('degraded-response');

      const result = await fallbackService.execute(
        async () => {
          throw originalError;
        },
        { fallbackFn, context: 'chaos-fallback-fn' },
      );

      expect(result).toBe('degraded-response');
      expect(fallbackFn).toHaveBeenCalledWith(originalError);
    });

    it('rethrows when shouldFallback predicate returns false', async () => {
      await expect(
        fallbackService.execute(
          async () => {
            throw new Error('fatal: validation failed');
          },
          {
            fallbackValue: 'cached',
            shouldFallback: (err) => !err.message.includes('fatal'),
            context: 'chaos-should-not-fallback',
          },
        ),
      ).rejects.toThrow('fatal: validation failed');

      expect(fallbackService.getStats().totalFallbacks).toBe(0);
    });

    it('chains fallback after fallbackFn failure gracefully', async () => {
      const result = await fallbackService.execute(
        async () => {
          throw new Error('primary down');
        },
        {
          fallbackFn: async () => {
            throw new Error('fallback also down');
          },
          fallbackValue: 'ultimate-safety-net',
          context: 'chaos-chained',
        },
      );

      expect(result).toBe('ultimate-safety-net');
    });
  });

  describe('Graceful degradation during simulated outages', () => {
    it('sheds optional features under PARTIAL degradation', () => {
      degradationService.registerFeature(
        'chaos-payments',
        FeaturePriority.ESSENTIAL,
      );
      degradationService.registerFeature(
        'chaos-search',
        FeaturePriority.STANDARD,
      );
      degradationService.registerFeature(
        'chaos-recommendations',
        FeaturePriority.OPTIONAL,
      );

      degradationService.setLevel(
        DegradationLevel.PARTIAL,
        'chaos: simulated high latency',
      );

      expect(degradationService.isFeatureEnabled('chaos-payments')).toBe(true);
      expect(degradationService.isFeatureEnabled('chaos-search')).toBe(true);
      expect(degradationService.isFeatureEnabled('chaos-recommendations')).toBe(
        false,
      );
      expect(degradationService.isDegraded()).toBe(true);
    });

    it('keeps only essential features under SEVERE degradation', () => {
      degradationService.setLevel(
        DegradationLevel.SEVERE,
        'chaos: simulated db outage',
      );

      expect(degradationService.isFeatureEnabled('chaos-payments')).toBe(true);
      expect(degradationService.isFeatureEnabled('chaos-search')).toBe(false);
      expect(degradationService.isFeatureEnabled('chaos-recommendations')).toBe(
        false,
      );
    });

    it('returns to NORMAL when degradation is lifted', () => {
      degradationService.setLevel(DegradationLevel.PARTIAL, 'simulated issue');
      expect(degradationService.isDegraded()).toBe(true);

      degradationService.setLevel(DegradationLevel.NORMAL, 'recovered');
      expect(degradationService.isDegraded()).toBe(false);
      expect(degradationService.isFeatureEnabled('chaos-recommendations')).toBe(
        true,
      );
    });
  });

  describe('Incident lifecycle automation', () => {
    it('declares an incident and auto-degrades the system for SEV1', () => {
      const incident = incidentService.declare({
        title: 'Chaos: simulated database outage',
        severity: IncidentSeverity.SEV1,
        description: 'Injected failure for chaos engineering validation',
        category: 'database',
        affectedServices: ['postgres-primary'],
      });

      expect(incident.id).toMatch(/^INC-\d{4}-\d{3}$/);
      expect(incident.status).toBe('open');

      expect(degradationService.getLevel()).toBe(DegradationLevel.SEVERE);
    });

    it('tracks incident mitigation and resolution timeline', () => {
      const incident = incidentService.declare({
        title: 'Chaos: simulated cache failure',
        severity: IncidentSeverity.SEV2,
        category: 'cache',
        affectedServices: ['redis'],
      });

      const mitigated = incidentService.mitigate(
        incident.id,
        'failover to replica',
      );
      expect(mitigated.status).toBe('mitigating');
      expect(mitigated.mitigatedAt).toBeDefined();

      const resolved = incidentService.resolve(
        incident.id,
        'cache cluster recovered',
      );
      expect(resolved.status).toBe('resolved');
      expect(resolved.resolvedAt).toBeDefined();

      const metrics = incidentService.getMetrics(incident.id);
      expect(metrics.timeToDetectMs).toBeGreaterThanOrEqual(0);
      expect(metrics.timeToMitigateMs).toBeGreaterThanOrEqual(0);
      expect(metrics.timeToResolveMs).toBeGreaterThanOrEqual(0);
    });

    it('restores NORMAL degradation after all incidents resolved', () => {
      const open = incidentService.listOpen();
      expect(open.length).toBe(0);
      expect(degradationService.getLevel()).toBe(DegradationLevel.NORMAL);
    });
  });

  describe('Cascading failure prevention', () => {
    it('isolates failures so one saturated compartment does not affect others', async () => {
      bulkheadService.configure('chaos-leaky', {
        maxConcurrent: 1,
        maxQueue: 0,
      });
      bulkheadService.configure('chaos-healthy', {
        maxConcurrent: 5,
        maxQueue: 5,
      });

      const neverResolve = new Promise<void>(() => {});

      const stuck = bulkheadService.execute('chaos-leaky', () => neverResolve);
      await new Promise((r) => setImmediate(r));

      const healthyResults = await Promise.all(
        Array.from({ length: 3 }, (_, i) =>
          bulkheadService.execute('chaos-healthy', async () => `healthy-${i}`),
        ),
      );

      expect(healthyResults).toEqual(['healthy-0', 'healthy-1', 'healthy-2']);

      const leakyMetrics = bulkheadService.getMetrics('chaos-leaky');
      expect(leakyMetrics?.totalExecuted).toBe(1);
    });

    it('recovers after a rejected compartment allows new calls when capacity frees', async () => {
      bulkheadService.configure('chaos-recover', {
        maxConcurrent: 1,
        maxQueue: 1,
      });

      let release: () => void;
      const hold = new Promise<void>((r) => {
        release = r;
      });

      const first = bulkheadService.execute('chaos-recover', () => hold);
      const second = bulkheadService.execute(
        'chaos-recover',
        async () => 'queued',
      );
      await new Promise((r) => setImmediate(r));

      await expect(
        bulkheadService.execute('chaos-recover', async () => 'rejected'),
      ).rejects.toBeInstanceOf(BulkheadCapacityExceededError);

      release!();
      await first;
      await second;

      const result = await bulkheadService.execute(
        'chaos-recover',
        async () => 'recovered',
      );
      expect(result).toBe('recovered');

      const metrics = bulkheadService.getMetrics('chaos-recover');
      expect(metrics?.totalExecuted).toBe(3);
    });
  });

  describe('Health endpoint resilience under simulated stress', () => {
    it('returns a valid health response with resilience status fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(600);
        });

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('response time degrades gracefully under concurrent requests', async () => {
      const concurrency = 20;
      const start = Date.now();

      const results = await Promise.all(
        Array.from({ length: concurrency }, () =>
          request(app.getHttpServer()).get('/health'),
        ),
      );

      const elapsed = Date.now() - start;

      results.forEach((res) => {
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(600);
      });

      expect(elapsed).toBeLessThan(15000);
    });
  });

  describe('Resilience pattern interplay', () => {
    it('bulkhead + fallback work together to prevent total failure', async () => {
      bulkheadService.configure('chaos-interplay', {
        maxConcurrent: 2,
        maxQueue: 2,
      });

      const results = await Promise.allSettled(
        Array.from({ length: 5 }, (_, i) =>
          (async () => {
            try {
              return await bulkheadService.execute(
                'chaos-interplay',
                async () => {
                  if (i >= 3) throw new Error('simulated chaos failure');
                  return `success-${i}`;
                },
              );
            } catch (err) {
              if (err instanceof BulkheadCapacityExceededError) {
                return 'rate-limited-fallback';
              }
              throw err;
            }
          })(),
        ),
      );

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      expect(fulfilled.length).toBeGreaterThanOrEqual(3);
      expect(fulfilled.length).toBeLessThanOrEqual(5);
    });
  });
});
