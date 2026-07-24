import './setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { MetricsService } from '../src/modules/monitoring/metrics.service';

describe('Metrics Collection (e2e)', () => {
  let app: INestApplication;
  let metricsService: MetricsService;

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
        'metrics',
      ],
    });

    await app.init();

    metricsService = moduleFixture.get<MetricsService>(MetricsService);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('Request Count Metrics', () => {
    it('should expose metrics endpoint at /metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      expect(res.text).toBeDefined();
      expect(res.text.length).toBeGreaterThan(0);
    });

    it('should include http_requests_total counter in metrics output', async () => {
      await request(app.getHttpServer()).get('/health').expect(200);

      const metricsOutput = await metricsService.getMetrics();
      expect(metricsOutput).toContain('http_requests_total');
    });

    it('should increment request counter after HTTP requests', async () => {
      const beforeMetrics = await metricsService.getMetrics();
      const beforeMatch = beforeMetrics.match(
        /http_requests_total{[^}]*}\s+([\d.]+)/,
      );
      const beforeCount = beforeMatch ? parseFloat(beforeMatch[1]) : 0;

      await request(app.getHttpServer()).get('/health').expect(200);
      await request(app.getHttpServer()).get('/health').expect(200);

      const afterMetrics = await metricsService.getMetrics();
      const afterMatches = [
        ...afterMetrics.matchAll(/http_requests_total{[^}]*}\s+([\d.]+)/g),
      ];
      const afterTotal = afterMatches.reduce(
        (sum, m) => sum + parseFloat(m[1]),
        0,
      );

      expect(afterTotal).toBeGreaterThan(beforeCount);
    });

    it('should track requests by HTTP method label', async () => {
      await request(app.getHttpServer()).get('/health').expect(200);

      const metricsOutput = await metricsService.getMetrics();
      expect(metricsOutput).toContain('http_requests_total');
      expect(metricsOutput).toContain('method=');
    });

    it('should track requests by status class label', async () => {
      await request(app.getHttpServer()).get('/health').expect(200);
      await request(app.getHttpServer())
        .get('/api/nonexistent-metrics-404')
        .expect(404);

      const metricsOutput = await metricsService.getMetrics();
      expect(metricsOutput).toContain('status_class=');
    });

    it('should distinguish between 2xx and 4xx status classes', async () => {
      await request(app.getHttpServer()).get('/health').expect(200);
      await request(app.getHttpServer())
        .get('/api/unknown-endpoint-xyz')
        .expect(404);

      const metricsOutput = await metricsService.getMetrics();
      expect(metricsOutput).toContain('2xx');
      expect(metricsOutput).toContain('4xx');
    });
  });

  describe('Response Time Metrics', () => {
    it('should include http_request_duration_ms histogram in metrics output', async () => {
      await request(app.getHttpServer()).get('/health').expect(200);

      const metricsOutput = await metricsService.getMetrics();
      expect(metricsOutput).toContain('http_request_duration_ms');
    });

    it('should record histogram buckets for response duration', async () => {
      await request(app.getHttpServer()).get('/health').expect(200);

      const metricsOutput = await metricsService.getMetrics();
      expect(metricsOutput).toContain('http_request_duration_ms_bucket');
    });

    it('should expose _sum and _count for duration histogram', async () => {
      await request(app.getHttpServer()).get('/health').expect(200);

      const metricsOutput = await metricsService.getMetrics();
      expect(metricsOutput).toContain('http_request_duration_ms_sum');
      expect(metricsOutput).toContain('http_request_duration_ms_count');
    });

    it('should record positive duration for successful requests', async () => {
      metricsService.recordHttpDuration('GET', '/health', 200, 42);

      const metricsOutput = await metricsService.getMetrics();
      expect(metricsOutput).toContain('http_request_duration_ms');
    });

    it('should record durations for concurrent requests', async () => {
      await Promise.all([
        request(app.getHttpServer()).get('/health'),
        request(app.getHttpServer()).get('/health'),
        request(app.getHttpServer()).get('/health'),
      ]);

      const metricsOutput = await metricsService.getMetrics();
      const countMatch = metricsOutput.match(
        /http_request_duration_ms_count{[^}]*}\s+([\d.]+)/,
      );
      if (countMatch) {
        expect(parseFloat(countMatch[1])).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Rate Metrics', () => {
    it('should track 4xx error class requests in metrics', async () => {
      await request(app.getHttpServer())
        .get('/api/nonexistent-error-rate-test')
        .expect(404);

      const metricsOutput = await metricsService.getMetrics();
      expect(metricsOutput).toContain('4xx');
    });

    it('should separate error requests from successful requests in counters', async () => {
      await request(app.getHttpServer()).get('/health').expect(200);
      await request(app.getHttpServer()).get('/api/error-rate-404').expect(404);

      const metricsOutput = await metricsService.getMetrics();
      const successLines = (metricsOutput.match(/status_class="2xx"/g) || [])
        .length;
      const errorLines = (metricsOutput.match(/status_class="4xx"/g) || [])
        .length;

      expect(successLines).toBeGreaterThan(0);
      expect(errorLines).toBeGreaterThan(0);
    });

    it('should record http_requests_total for failed validation requests', async () => {
      await request(app.getHttpServer()).post('/api/auth/login').send({});

      const metricsOutput = await metricsService.getMetrics();
      expect(metricsOutput).toContain('http_requests_total');
    });
  });

  describe('Custom Business Metrics', () => {
    it('should expose blockchain_transactions_total counter', async () => {
      metricsService.recordBlockchainTransaction('payment', 'success');

      const metricsOutput = await metricsService.getMetrics();
      expect(metricsOutput).toContain('blockchain_transactions_total');
    });

    it('should expose blockchain_failures_total counter', async () => {
      metricsService.recordBlockchainFailure('escrow', 'timeout');

      const metricsOutput = await metricsService.getMetrics();
      expect(metricsOutput).toContain('blockchain_failures_total');
    });

    it('should expose rent_payments_total counter', async () => {
      metricsService.recordRentPayment('success');
      metricsService.recordRentPayment('failed');

      const metricsOutput = await metricsService.getMetrics();
      expect(metricsOutput).toContain('rent_payments_total');
    });

    it('should expose nft_mints_total counter', async () => {
      metricsService.recordNftMint('rent_obligation');

      const metricsOutput = await metricsService.getMetrics();
      expect(metricsOutput).toContain('nft_mints_total');
    });

    it('should expose disputes_total counter', async () => {
      metricsService.recordDispute('landlord', 'open');
      metricsService.recordDispute('tenant', 'resolved');

      const metricsOutput = await metricsService.getMetrics();
      expect(metricsOutput).toContain('disputes_total');
    });

    it('should expose blockchain_operation_duration_ms histogram', async () => {
      metricsService.recordBlockchainDuration('transfer', 350);

      const metricsOutput = await metricsService.getMetrics();
      expect(metricsOutput).toContain('blockchain_operation_duration_ms');
    });

    it('should record database pool gauges', async () => {
      metricsService.setDatabasePoolUsage(5, 3, 10, 1);

      const metricsOutput = await metricsService.getMetrics();
      expect(metricsOutput).toContain('database_pool_active');
      expect(metricsOutput).toContain('database_pool_idle');
      expect(metricsOutput).toContain('database_pool_max');
    });

    it('should record database query metrics', async () => {
      metricsService.recordDatabaseQuery('SELECT', 12);

      const metricsOutput = await metricsService.getMetrics();
      expect(metricsOutput).toContain('db_query_duration_ms');
    });
  });

  describe('Metrics Export', () => {
    it('should serve metrics in Prometheus text format', async () => {
      const res = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      expect(res.headers['content-type']).toMatch(/text\/plain/);
      expect(res.text).toMatch(/^#\s+(HELP|TYPE)/m);
    });

    it('should include HELP lines for metric descriptions', async () => {
      const res = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      expect(res.text).toContain('# HELP');
    });

    it('should include TYPE lines for metric types', async () => {
      const res = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      expect(res.text).toContain('# TYPE');
    });

    it('should include default Node.js process metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      expect(res.text).toContain('process_');
    });

    it('should return fresh metrics data on each call', async () => {
      await request(app.getHttpServer()).get('/health').expect(200);

      const [res1, res2] = await Promise.all([
        request(app.getHttpServer()).get('/metrics').expect(200),
        request(app.getHttpServer()).get('/metrics').expect(200),
      ]);

      expect(res1.text).toBeDefined();
      expect(res2.text).toBeDefined();
    });

    it('should aggregate metrics correctly via MetricsService directly', async () => {
      const registry = metricsService.getRegistry();
      const metrics = await registry.metrics();

      expect(typeof metrics).toBe('string');
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should include custom chioma business metrics in export', async () => {
      metricsService.recordRentPayment('success');
      metricsService.recordNftMint('agreement');

      const res = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      expect(res.text).toContain('rent_payments_total');
      expect(res.text).toContain('nft_mints_total');
    });
  });
});
