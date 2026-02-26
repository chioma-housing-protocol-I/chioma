/**
 * Performance gates: critical endpoints must respond within threshold.
 * Run with: pnpm run test:e2e -- --testPathPattern=performance
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

const MAX_MS = 5000; // 5s for in-process e2e (CI can be slow)

describe('Performance gates (e2e)', () => {
  let app: INestApplication | undefined;

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
    if (app) await app.close();
  });

  it('GET /health responds within threshold', async () => {
    const start = Date.now();
    await request(app!.getHttpServer())
      .get('/health')
      .expect((res) => {
        expect([200, 503]).toContain(res.status);
      });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(MAX_MS);
  });

  it('GET /api/docs-json responds within threshold', async () => {
    const start = Date.now();
    await request(app!.getHttpServer()).get('/api/docs-json').expect(200);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(MAX_MS);
  });
});
