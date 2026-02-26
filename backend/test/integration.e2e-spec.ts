/**
 * Integration E2E: critical paths across modules.
 * Covers feedback, developer portal, and public endpoints.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Integration (e2e)', () => {
  let app: INestApplication | undefined;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: [
        'health',
        'health/detailed',
        'security.txt',
        '.well-known',
        'developer-portal',
      ],
    });
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('Feedback (community)', () => {
    it('POST /api/feedback accepts valid submission', async () => {
      const res = await request(app!.getHttpServer())
        .post('/api/feedback')
        .send({
          message: 'Integration test feedback message with enough length.',
          type: 'general',
        })
        .expect(201);
      expect(res.body).toHaveProperty('id');
      expect(typeof res.body.id).toBe('string');
    });

    it('POST /api/feedback rejects short message', async () => {
      await request(app!.getHttpServer())
        .post('/api/feedback')
        .send({ message: 'short' })
        .expect(400);
    });
  });

  describe('Developer portal', () => {
    it('GET /developer-portal returns HTML', async () => {
      const res = await request(app!.getHttpServer())
        .get('/developer-portal')
        .expect(200);
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.text).toContain('Chioma Developer Portal');
      expect(res.text).toContain('api/docs');
    });
  });

  describe('Public API surface', () => {
    it('GET /api/properties returns 200 with pagination shape', async () => {
      const res = await request(app!.getHttpServer())
        .get('/api/properties')
        .expect(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/docs-json returns OpenAPI spec', async () => {
      const res = await request(app!.getHttpServer())
        .get('/api/docs-json')
        .expect(200);
      expect(res.body.paths).toBeDefined();
      expect(res.body.info).toBeDefined();
    });
  });
});
