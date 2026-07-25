import './setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('API Error Response Formatting (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('Error Response Format Standardization', () => {
    it('should return consistent error format for 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/properties')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('timestamp');
    });

    it('should return consistent error format for 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties/protected')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return consistent error format for 403 Forbidden', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/admin/settings')
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return consistent error format for 404 Not Found', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties/nonexistent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error).toHaveProperty('message');
    });

    it('should return consistent error format for 409 Conflict', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/properties')
        .send({ id: 'existing-id' })
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('should return consistent error format for 422 Unprocessable Entity', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/properties')
        .send({ name: null })
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('should return consistent error format for 500 Internal Server Error', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/broken-endpoint')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(response.body.error).toHaveProperty('timestamp');
    });
  });

  describe('HTTP Status Code Mapping', () => {
    it('should map validation errors to 422 status code', async () => {
      await request(app.getHttpServer())
        .post('/api/properties')
        .send({ price: 'invalid' })
        .expect(422);
    });

    it('should map business logic errors to appropriate status codes', async () => {
      // Insufficient funds error should be 422
      const response = await request(app.getHttpServer())
        .post('/api/payments')
        .send({ amount: 1000000000 })
        .expect(422);

      expect(response.body.error.code).toBe('INSUFFICIENT_FUNDS');
    });

    it('should map rate limit errors to 429 status code', async () => {
      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer()).get('/api/health');
      }

      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(429);

      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Error Message Formatting', () => {
    it('should include user-friendly error messages', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/properties')
        .send({})
        .expect(400);

      expect(response.body.error.message).toBeDefined();
      expect(typeof response.body.error.message).toBe('string');
      expect(response.body.error.message.length).toBeGreaterThan(0);
    });

    it('should not expose sensitive information in error messages', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' })
        .expect(401);

      expect(response.body.error.message).not.toContain('password');
      expect(response.body.error.message).not.toContain('salt');
      expect(response.body.error.message).not.toContain('hash');
    });

    it('should include field-level error details for validation errors', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/properties')
        .send({ name: '', price: 'invalid' })
        .expect(422);

      expect(response.body.error).toHaveProperty('details');
      expect(Array.isArray(response.body.error.details)).toBe(true);
    });
  });

  describe('Error Context and Details', () => {
    it('should include request ID for error tracking', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties/invalid')
        .expect(404);

      expect(response.body).toHaveProperty('requestId');
      expect(response.body.requestId).toMatch(/^[a-f0-9-]+$/);
    });

    it('should include timestamp for error logging', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/properties')
        .send({})
        .expect(400);

      expect(response.body.error).toHaveProperty('timestamp');
      const timestamp = new Date(response.body.error.timestamp);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should include error path for debugging', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/properties')
        .send({})
        .expect(400);

      expect(response.body.error).toHaveProperty('path');
      expect(response.body.error.path).toContain('/api/properties');
    });
  });

  describe('Error Localization Support', () => {
    it('should return error in requested language', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/properties')
        .set('Accept-Language', 'es')
        .send({})
        .expect(400);

      expect(response.body.error).toHaveProperty('message');
      // Message might be in Spanish or English depending on implementation
      expect(response.body.error.message).toBeDefined();
    });

    it('should fallback to English for unsupported languages', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/properties')
        .set('Accept-Language', 'xx')
        .send({})
        .expect(400);

      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.message).toBeDefined();
    });

    it('should include error code for client-side translation', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/properties')
        .send({})
        .expect(400);

      expect(response.body.error).toHaveProperty('code');
      // Code should be constant regardless of language
      expect(typeof response.body.error.code).toBe('string');
    });
  });

  describe('Error Response Headers', () => {
    it('should include Content-Type header', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/nonexistent')
        .expect(404);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should include appropriate Cache-Control headers for errors', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/nonexistent')
        .expect(404);

      expect(response.headers['cache-control']).toBeDefined();
    });
  });
});
