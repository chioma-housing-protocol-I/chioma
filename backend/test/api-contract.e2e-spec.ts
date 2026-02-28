/**
 * API Contract E2E tests.
 * Validates response shape and status codes for critical endpoints (contract compliance).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('API Contract (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: ['health', 'health/detailed', 'security.txt', '.well-known'],
    });
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 30000);

  describe('Health contract', () => {
    it('GET /health returns 200/503 with status, timestamp, services', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('status');
      expect(res.body.status).toMatch(/^(ok|warning|error)$/);
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('services');
      expect(res.body.services).toHaveProperty('database');
      expect(res.body.services).toHaveProperty('stellar');
      expect(res.body.services).toHaveProperty('memory');
    });

    it('GET /health/detailed returns enhanced health with details', async () => {
      const res = await request(app.getHttpServer()).get('/health/detailed');
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('details');
      expect(res.body.details).toHaveProperty('nodeVersion');
      expect(res.body.details).toHaveProperty('memoryUsage');
    });
  });

  describe('Security contract', () => {
    it('GET /security.txt returns text/plain with Contact and Policy', async () => {
      const res = await request(app.getHttpServer())
        .get('/security.txt')
        .expect(200);
      expect(res.headers['content-type']).toMatch(/text\/plain/);
      expect(res.text).toMatch(/Contact:/);
      expect(res.text).toMatch(/Policy:/);
    });
  });

  describe('Auth contract (unauthenticated)', () => {
    it('POST /api/auth/login with invalid body returns 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({})
        .expect((r) => expect([400, 401]).toContain(r.status));
      expect(res.body).toHaveProperty('message');
    });

    it('POST /api/auth/register with invalid body returns 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({})
        .expect(400);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('Protected endpoints require auth', () => {
    it('GET /api/users/me without token returns 401', async () => {
      await request(app.getHttpServer()).get('/api/users/me').expect(401);
    });

    it('GET /api/agreements without token returns 401', async () => {
      await request(app.getHttpServer()).get('/api/agreements').expect(401);
    });
  });
});
