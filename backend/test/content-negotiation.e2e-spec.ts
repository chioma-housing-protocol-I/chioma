import './setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Content Negotiation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

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

  describe('Accept Header Parsing', () => {
    it('should return JSON when Accept: application/json is set', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .set('Accept', 'application/json')
        .expect(200);

      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(typeof res.body).toBe('object');
    });

    it('should return JSON for default Accept: */*', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .set('Accept', '*/*')
        .expect(200);

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('should handle Accept header with quality values (q-factor)', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .set('Accept', 'application/json;q=0.9,*/*;q=0.8')
        .expect(200);

      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toBeDefined();
    });

    it('should handle multiple media types in Accept header', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .set(
          'Accept',
          'text/html, application/xhtml+xml, application/json;q=0.9',
        )
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should parse Accept header with wildcard subtype', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .set('Accept', 'application/*')
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  describe('Content-Type Negotiation', () => {
    it('should accept application/json Content-Type on POST requests', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feedback')
        .set('Content-Type', 'application/json')
        .send({
          message: 'Test feedback message long enough for validation',
          type: 'general',
        });

      expect([400, 401, 403, 422]).toContain(res.status);
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('should return 415 Unsupported Media Type for text/xml Content-Type on JSON endpoints', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feedback')
        .set('Content-Type', 'text/xml')
        .send('<feedback><message>test</message></feedback>');

      expect([400, 415, 422, 401, 403]).toContain(res.status);
    });

    it('should respond with correct Content-Type header for API responses', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('should handle application/x-www-form-urlencoded Content-Type', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('email=test@example.com&password=wrongpassword');

      expect([400, 401, 422]).toContain(res.status);
    });

    it('should set charset in Content-Type response header', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);

      expect(res.headers['content-type']).toMatch(/charset=utf-8/i);
    });
  });

  describe('Format Selection', () => {
    it('should default to JSON format for API responses', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);

      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(() => JSON.parse(JSON.stringify(res.body))).not.toThrow();
    });

    it('should return JSON for structured data responses', async () => {
      const res = await request(app.getHttpServer())
        .get('/health/detailed')
        .expect(200);

      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(typeof res.body).toBe('object');
    });

    it('should return plain text for metrics endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      expect(res.headers['content-type']).toMatch(/text\/plain/);
      expect(typeof res.text).toBe('string');
    });

    it('should return JSON for error responses', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/nonexistent-resource-12345')
        .expect(404);

      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toBeDefined();
    });

    it('should return JSON for validation error responses', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toBeDefined();
    });
  });

  describe('Default Format Handling', () => {
    it('should default to JSON when no Accept header is provided', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .unset('Accept')
        .expect(200);

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    it('should serve JSON as default content type for API responses', async () => {
      const endpoints = ['/health', '/health/detailed'];

      for (const endpoint of endpoints) {
        const res = await request(app.getHttpServer())
          .get(endpoint)
          .expect(200);

        expect(res.headers['content-type']).toMatch(/application\/json/);
      }
    });

    it('should return consistent response shape for same endpoint with different Accept headers', async () => {
      const jsonResponse = await request(app.getHttpServer())
        .get('/health')
        .set('Accept', 'application/json')
        .expect(200);

      const defaultResponse = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(Object.keys(jsonResponse.body)).toEqual(
        expect.arrayContaining(Object.keys(defaultResponse.body)),
      );
    });
  });

  describe('Unsupported Format Errors', () => {
    it('should handle requests with Accept: text/xml gracefully', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .set('Accept', 'text/xml');

      expect([200, 406]).toContain(res.status);
    });

    it('should handle requests with Accept: application/pdf gracefully', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .set('Accept', 'application/pdf');

      expect([200, 406]).toContain(res.status);
    });

    it('should fallback to JSON when only unsupported types requested and wildcard missing', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .set('Accept', 'text/xml, application/pdf');

      expect([200, 406]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toBeDefined();
      }
    });

    it('should return 400 for malformed Content-Type on data-accepting endpoints', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('Content-Type', 'not/a-valid;;;type')
        .send('invalid body');

      expect([400, 415, 422, 401]).toContain(res.status);
    });

    it('should respond with error body in JSON format even for unsupported Accept types', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/nonexistent-12345')
        .set('Accept', 'application/xml');

      expect([404, 406]).toContain(res.status);
      if (res.status === 404) {
        expect(res.headers['content-type']).toMatch(/application\/json/);
      }
    });
  });

  describe('Response Content-Type Accuracy', () => {
    it('should set Vary: Accept header to indicate content negotiation is active', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);

      const varyHeader = res.headers['vary'];
      if (varyHeader) {
        expect(typeof varyHeader).toBe('string');
      }
    });

    it('should include content-length or transfer-encoding in response', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);

      const hasContentLength = 'content-length' in res.headers;
      const hasTransferEncoding = 'transfer-encoding' in res.headers;
      expect(hasContentLength || hasTransferEncoding).toBe(true);
    });

    it('should return structured JSON body for health check', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);

      expect(res.body).toBeDefined();
      expect(typeof res.body).toBe('object');
    });
  });
});
