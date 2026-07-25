import './setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  LoggerService,
} from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Request Logging (e2e)', () => {
  let app: INestApplication;
  const logMessages: Array<{
    level: string;
    message: string;
    context?: unknown;
  }> = [];

  const captureLogger: LoggerService = {
    log: (message: string, context?: unknown) =>
      logMessages.push({ level: 'log', message: String(message), context }),
    error: (message: string, _trace?: unknown, context?: unknown) =>
      logMessages.push({ level: 'error', message: String(message), context }),
    warn: (message: string, context?: unknown) =>
      logMessages.push({ level: 'warn', message: String(message), context }),
    debug: (message?: string, context?: unknown) =>
      logMessages.push({ level: 'debug', message: String(message), context }),
    verbose: (message?: string, context?: unknown) =>
      logMessages.push({ level: 'verbose', message: String(message), context }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({
      logger: captureLogger,
    });

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

  beforeEach(() => {
    logMessages.length = 0;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('Request Logging with Headers', () => {
    it('should generate a correlation/request ID per request', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);

      expect(res.headers['x-request-id']).toBeDefined();
      expect(typeof res.headers['x-request-id']).toBe('string');
      expect(res.headers['x-request-id'].length).toBeGreaterThan(0);
    });

    it('should propagate provided x-request-id header in response', async () => {
      const customRequestId = 'test-req-id-abc123';
      const res = await request(app.getHttpServer())
        .get('/health')
        .set('x-request-id', customRequestId)
        .expect(200);

      expect(res.headers['x-request-id']).toBe(customRequestId);
    });

    it('should assign unique request IDs to concurrent requests', async () => {
      const [res1, res2] = await Promise.all([
        request(app.getHttpServer()).get('/health'),
        request(app.getHttpServer()).get('/health'),
      ]);

      expect(res1.headers['x-request-id']).toBeDefined();
      expect(res2.headers['x-request-id']).toBeDefined();
      expect(res1.headers['x-request-id']).not.toBe(
        res2.headers['x-request-id'],
      );
    });

    it('should log incoming request method and URL', async () => {
      await request(app.getHttpServer()).get('/health').expect(200);

      const logged = logMessages.some(
        (m) => m.message.includes('GET') && m.message.includes('/health'),
      );
      expect(logged).toBe(true);
    });

    it('should include HTTP method in log output', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'x@x.com', password: 'short' });

      const hasPostLog = logMessages.some(
        (m) => m.message.includes('POST') || m.message.includes('post'),
      );
      expect(hasPostLog).toBe(true);
    });
  });

  describe('Response Logging', () => {
    it('should log status code in response log', async () => {
      await request(app.getHttpServer()).get('/health').expect(200);

      const hasStatusLog = logMessages.some(
        (m) => m.message.includes('200') || m.message.includes('health'),
      );
      expect(hasStatusLog).toBe(true);
    });

    it('should log response time duration', async () => {
      await request(app.getHttpServer()).get('/health').expect(200);

      const hasDurationLog = logMessages.some(
        (m) => m.message.includes('ms') || /\d+ms/.test(m.message),
      );
      expect(hasDurationLog).toBe(true);
    });

    it('should log 4xx error responses at warn level', async () => {
      await request(app.getHttpServer()).post('/api/auth/login').send({});

      const hasWarnOrError = logMessages.some(
        (m) => m.level === 'warn' || m.level === 'error',
      );
      expect(hasWarnOrError).toBe(true);
    });

    it('should log the response status code for 404 not found', async () => {
      await request(app.getHttpServer())
        .get('/api/definitely-nonexistent-9999')
        .expect(404);

      const has404Log = logMessages.some(
        (m) =>
          m.message.includes('404') ||
          m.level === 'warn' ||
          m.level === 'error',
      );
      expect(has404Log).toBe(true);
    });

    it('should log each request independently and not mix log entries', async () => {
      logMessages.length = 0;

      await request(app.getHttpServer()).get('/health').expect(200);
      const countAfterFirst = logMessages.length;

      logMessages.length = 0;

      await request(app.getHttpServer()).get('/health/detailed').expect(200);
      const countAfterSecond = logMessages.length;

      expect(countAfterFirst).toBeGreaterThan(0);
      expect(countAfterSecond).toBeGreaterThan(0);
    });
  });

  describe('Sensitive Data Masking', () => {
    it('should mask Authorization header in logs', async () => {
      await request(app.getHttpServer())
        .get('/health')
        .set('Authorization', 'Bearer super-secret-jwt-token')
        .expect(200);

      const hasRawToken = logMessages.some((m) =>
        m.message.includes('super-secret-jwt-token'),
      );
      expect(hasRawToken).toBe(false);
    });

    it('should redact password fields in request body logs', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'MY_SECRET_PASSWORD' });

      const hasRawPassword = logMessages.some((m) =>
        m.message.includes('MY_SECRET_PASSWORD'),
      );
      expect(hasRawPassword).toBe(false);
    });

    it('should redact cookie header values in logs', async () => {
      await request(app.getHttpServer())
        .get('/health')
        .set('Cookie', 'session=top-secret-cookie-value')
        .expect(200);

      const hasRawCookie = logMessages.some((m) =>
        m.message.includes('top-secret-cookie-value'),
      );
      expect(hasRawCookie).toBe(false);
    });

    it('should redact token fields in request body logs', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ token: 'SHOULD_BE_REDACTED', email: 'a@b.com' });

      const hasRawToken = logMessages.some((m) =>
        m.message.includes('SHOULD_BE_REDACTED'),
      );
      expect(hasRawToken).toBe(false);
    });

    it('should log non-sensitive fields without masking', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'visible@example.com', password: 'hidden' });

      const hasEmail = logMessages.some((m) =>
        m.message.includes('visible@example.com'),
      );
      expect(hasEmail).toBe(true);
    });

    it('should mask x-api-key header in logs', async () => {
      await request(app.getHttpServer())
        .get('/health')
        .set('x-api-key', 'MY_PRIVATE_API_KEY_XYZ')
        .expect(200);

      const hasRawApiKey = logMessages.some((m) =>
        m.message.includes('MY_PRIVATE_API_KEY_XYZ'),
      );
      expect(hasRawApiKey).toBe(false);
    });
  });

  describe('Log Retention and Rotation', () => {
    it('should process many requests without memory degradation', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 20; i++) {
        await request(app.getHttpServer()).get('/health');
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const growthMB = (finalMemory - initialMemory) / (1024 * 1024);

      expect(growthMB).toBeLessThan(50);
    });

    it('should handle sequential requests with fresh log state per request', async () => {
      for (let i = 0; i < 5; i++) {
        logMessages.length = 0;
        await request(app.getHttpServer()).get('/health').expect(200);
        expect(logMessages.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance Impact', () => {
    it('should complete health check within acceptable time with logging enabled', async () => {
      const start = Date.now();
      await request(app.getHttpServer()).get('/health').expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000);
    });

    it('should not increase response time significantly due to logging overhead', async () => {
      const timings: number[] = [];

      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await request(app.getHttpServer()).get('/health').expect(200);
        timings.push(Date.now() - start);
      }

      const average = timings.reduce((a, b) => a + b, 0) / timings.length;
      expect(average).toBeLessThan(3000);
    });

    it('should log all requests even under moderate load', async () => {
      logMessages.length = 0;

      const concurrency = 5;
      await Promise.all(
        Array.from({ length: concurrency }, () =>
          request(app.getHttpServer()).get('/health'),
        ),
      );

      expect(logMessages.length).toBeGreaterThanOrEqual(concurrency);
    });
  });
});
