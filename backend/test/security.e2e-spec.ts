import './setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Security and CORS (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Setup CORS as in main.ts
    app.enableCors({
      origin: ['http://localhost:5000'],
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

  describe('Security Headers', () => {
    it('should include helmet security headers', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect((res) => {
          // Helmet headers check
          expect(res.headers['x-dns-prefetch-control']).toBe('off');
          expect(res.headers['x-frame-options']).toBe('DENY');
          expect(res.headers['strict-transport-security']).toBeDefined();
          expect(res.headers['x-download-options']).toBe('noopen');
          expect(res.headers['x-content-type-options']).toBe('nosniff');
          expect(res.headers['x-xss-protection']).toBe('0');
          expect(res.headers['referrer-policy']).toBe(
            'strict-origin-when-cross-origin',
          );
        });
    });
  });

  describe('CORS Policy', () => {
    it('should allow preflight requests from permitted origins', () => {
      return request(app.getHttpServer())
        .options('/')
        .set('Origin', 'http://localhost:5000')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204)
        .expect('Access-Control-Allow-Origin', 'http://localhost:5000')
        .expect(
          'Access-Control-Allow-Methods',
          'GET,POST,PUT,DELETE,PATCH,OPTIONS',
        )
        .expect('Access-Control-Allow-Credentials', 'true')
        .expect('Access-Control-Max-Age', '86400');
    });

    it('should allow actual requests from permitted origins', () => {
      return request(app.getHttpServer())
        .get('/')
        .set('Origin', 'http://localhost:5000')
        .expect(200)
        .expect('Access-Control-Allow-Origin', 'http://localhost:5000');
    });

    it('should expose configured headers', () => {
      return request(app.getHttpServer())
        .options('/')
        .set('Origin', 'http://localhost:5000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204)
        .expect(
          'Access-Control-Expose-Headers',
          'X-RateLimit-Limit,X-RateLimit-Remaining,X-RateLimit-Reset',
        );
    });

    it('should allow specific request headers', () => {
      return request(app.getHttpServer())
        .options('/')
        .set('Origin', 'http://localhost:5000')
        .set('Access-Control-Request-Method', 'POST')
        .set(
          'Access-Control-Request-Headers',
          'Content-Type,Authorization,X-Request-ID',
        )
        .expect(204);
    });

    it('should block or ignore CORS for disallowed origins', () => {
      return request(app.getHttpServer())
        .options('/')
        .set('Origin', 'http://evil.com')
        .set('Access-Control-Request-Method', 'POST')
        .expect((res) => {
          // It might return 204 but without the allow-origin header, or allow it if origin validation fails
          expect(res.headers['access-control-allow-origin']).toBeUndefined();
        });
    });

    it('should block or ignore actual requests from disallowed origins', () => {
      return request(app.getHttpServer())
        .get('/')
        .set('Origin', 'http://evil.com')
        .expect((res) => {
          expect(res.headers['access-control-allow-origin']).toBeUndefined();
        });
    });
  });
});
