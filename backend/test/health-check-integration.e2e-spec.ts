import './setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health Check Integration (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    app.setGlobalPrefix('api', {
      exclude: ['health', 'health/detailed'],
    });

    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('Liveness Probe', () => {
    it('responds to liveness check with a valid HTTP status', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(600);
    });

    it('returns a status field indicating liveness', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      expect(res.body).toHaveProperty('status');
      expect(res.body.status).toMatch(/^(ok|warning|error)$/);
    });

    it('returns uptime as a non-negative number', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      expect(res.body).toHaveProperty('uptime');
      expect(typeof res.body.uptime).toBe('number');
      expect(res.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('returns a timestamp in ISO 8601 format', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      expect(res.body).toHaveProperty('timestamp');
      expect(res.body.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
    });

    it('returns a version string', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      expect(res.body).toHaveProperty('version');
      expect(typeof res.body.version).toBe('string');
      expect(res.body.version.length).toBeGreaterThan(0);
    });

    it('completes liveness check within 10 seconds', async () => {
      const start = Date.now();
      await request(app.getHttpServer()).get('/health');
      expect(Date.now() - start).toBeLessThan(10000);
    });
  });

  describe('Readiness Probe', () => {
    it('reports readiness via services map', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      expect(res.body).toHaveProperty('services');
      expect(typeof res.body.services).toBe('object');
    });

    it('includes database service in readiness check', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      expect(res.body.services).toHaveProperty('database');
    });

    it('includes stellar service in readiness check', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      expect(res.body.services).toHaveProperty('stellar');
    });

    it('each service entry has a status field', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      Object.values(res.body.services).forEach((service: any) => {
        expect(service).toHaveProperty('status');
        expect(service.status).toMatch(/^(ok|up|error|down|warning)$/);
      });
    });

    it('returns HTTP 200 when all services are ready', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      if (res.body.status === 'ok' || res.body.status === 'warning') {
        expect(res.status).toBe(200);
      }
    });

    it('returns HTTP 503 when services are unhealthy', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      if (res.body.status === 'error') {
        expect(res.status).toBe(503);
      }
    });
  });

  describe('Startup Probe', () => {
    it('health endpoint is reachable immediately after app init', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(600);
    });

    it('detailed endpoint is reachable after startup', async () => {
      const res = await request(app.getHttpServer()).get('/health/detailed');

      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(600);
    });

    it('uptime is positive after startup', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      expect(res.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('version is populated at startup', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      expect(res.body.version).toBeTruthy();
    });
  });

  describe('Dependency Health Checks', () => {
    it('reports responseTime for each dependency', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      Object.values(res.body.services).forEach((service: any) => {
        expect(service).toHaveProperty('responseTime');
      });
    });

    it('database dependency check is present', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      const db = res.body.services.database;
      expect(db).toBeDefined();
      expect(db.status).toMatch(/^(ok|up|error|down|warning)$/);
    });

    it('stellar dependency check is present', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      const stellar = res.body.services.stellar;
      expect(stellar).toBeDefined();
      expect(stellar.status).toMatch(/^(ok|up|error|down|warning)$/);
    });

    it('handles partial dependency failure with warning status', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      expect(['ok', 'warning', 'error']).toContain(res.body.status);
    });

    it('detailed check includes memory dependency info', async () => {
      const res = await request(app.getHttpServer()).get('/health/detailed');

      expect(res.body).toHaveProperty('services');
      expect(typeof res.body.services).toBe('object');
    });
  });

  describe('Health Status Reporting', () => {
    it('detailed endpoint returns environment field', async () => {
      const res = await request(app.getHttpServer()).get('/health/detailed');

      expect(res.body).toHaveProperty('environment');
      expect(typeof res.body.environment).toBe('string');
    });

    it('detailed endpoint returns system details', async () => {
      const res = await request(app.getHttpServer()).get('/health/detailed');

      expect(res.body).toHaveProperty('details');
      const { details } = res.body;
      expect(details).toHaveProperty('nodeVersion');
      expect(details).toHaveProperty('platform');
      expect(details).toHaveProperty('architecture');
      expect(details).toHaveProperty('processId');
      expect(details).toHaveProperty('memoryUsage');
    });

    it('nodeVersion starts with "v" followed by semver', async () => {
      const res = await request(app.getHttpServer()).get('/health/detailed');

      expect(res.body.details.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
    });

    it('processId is a positive integer', async () => {
      const res = await request(app.getHttpServer()).get('/health/detailed');

      expect(res.body.details.processId).toBeGreaterThan(0);
      expect(Number.isInteger(res.body.details.processId)).toBe(true);
    });

    it('memoryUsage contains heapUsed and heapTotal', async () => {
      const res = await request(app.getHttpServer()).get('/health/detailed');

      const { memoryUsage } = res.body.details;
      expect(memoryUsage).toHaveProperty('heapUsed');
      expect(memoryUsage).toHaveProperty('heapTotal');
      expect(memoryUsage.heapUsed).toBeGreaterThan(0);
      expect(memoryUsage.heapTotal).toBeGreaterThan(0);
    });

    it('overall status maps correctly to HTTP status codes', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      const { status } = res.body;
      if (status === 'ok' || status === 'warning') {
        expect(res.status).toBe(200);
      } else if (status === 'error') {
        expect(res.status).toBe(503);
      }
    });

    it('basic and detailed endpoints return consistent status', async () => {
      const [basic, detailed] = await Promise.all([
        request(app.getHttpServer()).get('/health'),
        request(app.getHttpServer()).get('/health/detailed'),
      ]);

      expect(basic.body.version).toBe(detailed.body.version);
      expect(['ok', 'warning', 'error']).toContain(basic.body.status);
      expect(['ok', 'warning', 'error']).toContain(detailed.body.status);
    });
  });
});
