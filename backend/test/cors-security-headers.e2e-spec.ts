import './setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('CORS and Security Headers Integration (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Setup CORS as in main.ts
    app.enableCors({
      origin: ['http://localhost:3000', 'https://chioma.io'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Request-ID',
        'X-XSRF-TOKEN',
        'X-CSRF-Token',
        'X-API-Key',
        'X-Webhook-Signature',
        'X-Webhook-Timestamp',
      ],
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
      ],
      maxAge: 86400,
    });

    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('CORS Origin Validation', () => {
    it('should allow requests from permitted origins', async () => {
      const response = await request(app.getHttpServer())
        .get('/')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3000',
      );
    });

    it('should allow requests from multiple permitted origins', async () => {
      const response = await request(app.getHttpServer())
        .get('/')
        .set('Origin', 'https://chioma.io')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(
        'https://chioma.io',
      );
    });

    it('should include credentials header for permitted origins', async () => {
      const response = await request(app.getHttpServer())
        .get('/')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should reject requests from non-permitted origins', async () => {
      const response = await request(app.getHttpServer())
        .get('/')
        .set('Origin', 'http://malicious.com')
        .expect(200); // Request succeeds but no CORS header

      // CORS headers should not be present for disallowed origins
      expect(response.headers['access-control-allow-origin']).not.toBe(
        'http://malicious.com',
      );
    });
  });

  describe('CORS Preflight Requests', () => {
    it('should handle preflight requests with 204 response', async () => {
      await request(app.getHttpServer())
        .options('/')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);
    });

    it('should return allowed methods in preflight response', async () => {
      const response = await request(app.getHttpServer())
        .options('/')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'PUT')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toContain('PUT');
      expect(response.headers['access-control-allow-methods']).toContain(
        'POST',
      );
      expect(response.headers['access-control-allow-methods']).toContain(
        'DELETE',
      );
    });

    it('should return allowed headers in preflight response', async () => {
      const response = await request(app.getHttpServer())
        .options('/')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Headers', 'X-Custom-Header')
        .expect(204);

      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });

    it('should return max age for preflight caching', async () => {
      const response = await request(app.getHttpServer())
        .options('/')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers['access-control-max-age']).toBe('86400');
    });
  });

  describe('Security Headers - Helmet Protection', () => {
    it('should include X-DNS-Prefetch-Control header', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.headers['x-dns-prefetch-control']).toBe('off');
    });

    it('should include X-Frame-Options header', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('should include Strict-Transport-Security header', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['strict-transport-security']).toContain(
        'max-age',
      );
    });

    it('should include X-Download-Options header', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.headers['x-download-options']).toBe('noopen');
    });

    it('should include X-Content-Type-Options header', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should include X-XSS-Protection header', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.headers['x-xss-protection']).toBe('0');
    });

    it('should include Referrer-Policy header', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.headers['referrer-policy']).toBe(
        'strict-origin-when-cross-origin',
      );
    });
  });

  describe('Content Security Policy (CSP)', () => {
    it('should include Content-Security-Policy header', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.headers['content-security-policy']).toBeDefined();
    });

    it('should restrict script sources in CSP', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toContain('script-src');
    });

    it('should restrict style sources in CSP', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toContain('style-src');
    });

    it('should restrict frame sources in CSP', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toContain('frame-src');
    });
  });

  describe('HSTS Configuration', () => {
    it('should enforce HSTS for HTTPS connections', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toContain('max-age=');
      expect(hsts).toContain('includeSubDomains');
    });

    it('should set appropriate HSTS max-age', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toMatch(/max-age=\d+/);

      const maxAge = parseInt(hsts.match(/max-age=(\d+)/)?.[1] || '0');
      expect(maxAge).toBeGreaterThan(0);
    });
  });

  describe('Security Header Consistency', () => {
    it('should include security headers on all endpoint types', async () => {
      const endpoints = ['/', '/api/health', '/api/properties'];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer()).get(endpoint);

        if (response.status !== 404) {
          expect(response.headers['x-frame-options']).toBe('DENY');
          expect(response.headers['x-content-type-options']).toBe('nosniff');
        }
      }
    });

    it('should include security headers on error responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/nonexistent')
        .expect(404);

      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('CORS with Authentication', () => {
    it('should allow authenticated requests from permitted origins', async () => {
      const response = await request(app.getHttpServer())
        .get('/')
        .set('Origin', 'http://localhost:3000')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3000',
      );
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should include cookies with CORS-enabled responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Exposed Headers for CORS', () => {
    it('should expose rate limit headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      const exposedHeaders = response.headers['access-control-expose-headers'];
      expect(exposedHeaders).toContain('X-RateLimit-Limit');
      expect(exposedHeaders).toContain('X-RateLimit-Remaining');
      expect(exposedHeaders).toContain('X-RateLimit-Reset');
    });

    it('should expose custom headers when appropriate', async () => {
      const response = await request(app.getHttpServer())
        .get('/')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      const exposedHeaders =
        response.headers['access-control-expose-headers'] || '';
      expect(exposedHeaders.length).toBeGreaterThan(0);
    });
  });
});
