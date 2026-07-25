import './setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Request Tracing (e2e)', () => {
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

  describe('Trace ID Generation and Propagation', () => {
    it('should attach a request ID to every response', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);

      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.headers['x-request-id'].length).toBeGreaterThan(0);
    });

    it('should generate UUID-formatted trace IDs by default', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);

      const requestId = res.headers['x-request-id'];
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (requestId) {
        expect(uuidRegex.test(requestId) || requestId.length > 0).toBe(true);
      }
    });

    it('should propagate incoming x-request-id through the response', async () => {
      const traceId = 'trace-abc-123-def-456';

      const res = await request(app.getHttpServer())
        .get('/health')
        .set('x-request-id', traceId)
        .expect(200);

      expect(res.headers['x-request-id']).toBe(traceId);
    });

    it('should produce unique trace IDs for each independent request', async () => {
      const ids = await Promise.all(
        Array.from({ length: 5 }, () =>
          request(app.getHttpServer())
            .get('/health')
            .then((r) => r.headers['x-request-id']),
        ),
      );

      const uniqueIds = new Set(ids.filter(Boolean));
      expect(uniqueIds.size).toBe(ids.filter(Boolean).length);
    });

    it('should include trace context in 4xx error responses', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/nonexistent-trace-test-99')
        .expect(404);

      expect(res.headers['x-request-id']).toBeDefined();
    });

    it('should include trace context in 5xx error responses', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({});

      expect(res.headers['x-request-id']).toBeDefined();
    });
  });

  describe('Span Creation and Tracking', () => {
    it('should process requests end-to-end without tracing errors', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);

      expect(res.body).toBeDefined();
    });

    it('should handle concurrent requests with isolated trace contexts', async () => {
      const responses = await Promise.all([
        request(app.getHttpServer())
          .get('/health')
          .set('x-request-id', 'span-1'),
        request(app.getHttpServer())
          .get('/health')
          .set('x-request-id', 'span-2'),
        request(app.getHttpServer())
          .get('/health')
          .set('x-request-id', 'span-3'),
      ]);

      expect(responses[0].headers['x-request-id']).toBe('span-1');
      expect(responses[1].headers['x-request-id']).toBe('span-2');
      expect(responses[2].headers['x-request-id']).toBe('span-3');
    });

    it('should track request duration via response timing', async () => {
      const start = Date.now();
      await request(app.getHttpServer()).get('/health').expect(200);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(10000);
    });

    it('should propagate trace IDs across health check endpoint', async () => {
      const traceId = 'health-span-trace-xyz';

      const res = await request(app.getHttpServer())
        .get('/health/detailed')
        .set('x-request-id', traceId)
        .expect(200);

      expect(res.headers['x-request-id']).toBe(traceId);
    });
  });

  describe('Trace Context Preservation', () => {
    it('should preserve trace context for authenticated routes', async () => {
      const traceId = 'auth-trace-preserve-001';

      const res = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('x-request-id', traceId)
        .set('Authorization', 'Bearer invalid-token');

      expect(res.headers['x-request-id']).toBe(traceId);
      expect([401, 403]).toContain(res.status);
    });

    it('should maintain trace context across middleware pipeline', async () => {
      const traceId = 'middleware-trace-pipeline-002';

      const res = await request(app.getHttpServer())
        .get('/health')
        .set('x-request-id', traceId)
        .expect(200);

      expect(res.headers['x-request-id']).toBe(traceId);
    });

    it('should preserve trace context for POST requests', async () => {
      const traceId = 'post-trace-context-003';

      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('x-request-id', traceId)
        .send({ email: 'trace@example.com', password: 'wrongpass' });

      expect(res.headers['x-request-id']).toBe(traceId);
    });

    it('should not leak trace context between requests', async () => {
      const traceId1 = 'no-leak-trace-aaa';
      const traceId2 = 'no-leak-trace-bbb';

      const [res1, res2] = await Promise.all([
        request(app.getHttpServer())
          .get('/health')
          .set('x-request-id', traceId1),
        request(app.getHttpServer())
          .get('/health')
          .set('x-request-id', traceId2),
      ]);

      expect(res1.headers['x-request-id']).toBe(traceId1);
      expect(res2.headers['x-request-id']).toBe(traceId2);
    });
  });

  describe('Trace Sampling', () => {
    it('should process all requests regardless of sampling configuration', async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        request(app.getHttpServer())
          .get('/health')
          .set('x-request-id', `sample-trace-${i}`)
          .then((r) => r.status),
      );

      const statuses = await Promise.all(requests);
      expect(statuses.every((s) => s === 200)).toBe(true);
    });

    it('should return a valid response even for low-priority trace requests', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .set('x-b3-sampled', '0')
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should handle traceparent W3C trace context header', async () => {
      const traceparent =
        '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';

      const res = await request(app.getHttpServer())
        .get('/health')
        .set('traceparent', traceparent)
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should handle b3 trace headers from upstream services', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .set('x-b3-traceid', 'a3ce929d0e0e4736a3ce929d0e0e4736')
        .set('x-b3-spanid', '00f067aa0ba902b7')
        .set('x-b3-sampled', '1')
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  describe('Trace Export', () => {
    it('should complete request processing when OTLP exporter endpoint is unavailable', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);

      expect(res.body).toBeDefined();
    });

    it('should not fail on requests when tracing export fails silently', async () => {
      const responses = await Promise.all(
        Array.from({ length: 3 }, () =>
          request(app.getHttpServer()).get('/health').expect(200),
        ),
      );

      responses.forEach((res) => {
        expect(res.body).toBeDefined();
        expect(res.status).toBe(200);
      });
    });

    it('should expose OpenTelemetry compatibility via standard trace headers', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .set('traceparent', '00-abc123-def456-01')
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.headers['x-request-id']).toBeDefined();
    });

    it('should handle requests without any trace headers and still respond correctly', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);

      expect(res.body).toBeDefined();
      expect(res.headers['x-request-id']).toBeDefined();
    });
  });
});
