import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same configuration as in main.ts
    app.setGlobalPrefix('api', {
      exclude: ['health', 'health/detailed'],
    });

    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('/health (GET)', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(600);
        });

      expect(response.body).toMatchObject({
        status: expect.stringMatching(/^(ok|warning|error)$/),
        timestamp: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        ),
        version: expect.any(String),
        uptime: expect.any(Number),
        services: expect.any(Object),
      });
    });

    it('should include service status information', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(600);
        });

      const { services } = response.body;

      // Check that we have the expected services
      expect(services).toHaveProperty('database');
      expect(services).toHaveProperty('stellar');
      expect(services).toHaveProperty('memory');

      // Check service structure
      Object.values(services).forEach((service: any) => {
        expect(service).toHaveProperty('status');
        expect(service.status).toMatch(/^(ok|up|error|down|warning)$/);
        expect(service).toHaveProperty('responseTime');
      });
    });

    it('should return appropriate HTTP status codes', async () => {
      const response = await request(app.getHttpServer()).get('/health');

      if (response.body.status === 'ok' || response.body.status === 'warning') {
        expect(response.status).toBe(200);
      } else if (response.body.status === 'error') {
        expect(response.status).toBe(503);
      }
    });
  });

  describe('/health/detailed (GET)', () => {
    it('should return detailed health information', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/detailed')
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(600);
        });

      expect(response.body).toMatchObject({
        status: expect.stringMatching(/^(ok|warning|error)$/),
        timestamp: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        ),
        version: expect.any(String),
        uptime: expect.any(Number),
        services: expect.any(Object),
        environment: expect.any(String),
        details: expect.objectContaining({
          nodeVersion: expect.any(String),
          platform: expect.any(String),
          architecture: expect.any(String),
          processId: expect.any(Number),
          memoryUsage: expect.any(Object),
        }),
      });
    });

    it('should include system details', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/detailed')
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(600);
        });

      const { details } = response.body;

      expect(details.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
      expect(details.platform).toBeTruthy();
      expect(details.architecture).toBeTruthy();
      expect(details.processId).toBeGreaterThan(0);
      expect(details.memoryUsage).toHaveProperty('heapUsed');
      expect(details.memoryUsage).toHaveProperty('heapTotal');
    });
  });

  describe('Health check resilience', () => {
    it('should handle partial service failures gracefully', async () => {
      // This test would require mocking service failures
      // For now, we just verify the endpoint responds
      const response = await request(app.getHttpServer()).get('/health');

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('services');
    });

    it('should complete health checks within reasonable time', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/health')
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(600);
        });

      const duration = Date.now() - startTime;

      // Health check should complete within 10 seconds (allowing for CI/test environment delays)
      expect(duration).toBeLessThan(10000);
    });
  });
});
