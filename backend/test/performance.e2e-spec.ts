/**
 * Performance gates: critical endpoints must respond within threshold.
 * Run with: pnpm run test:e2e -- --testPathPattern=performance
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const MAX_MS = 5000; // 5s for in-process e2e (CI can be slow)

describe('Performance gates (e2e)', () => {
  let app: INestApplication | undefined;

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
      exclude: ['health', 'health/detailed', 'security.txt', '.well-known'],
    });

    // Set up Swagger
    const config = new DocumentBuilder()
      .setTitle('Chioma API')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT-auth',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 60000);

  it('GET /health responds within threshold', async () => {
    const start = Date.now();
    await request(app!.getHttpServer())
      .get('/health')
      .expect((res) => {
        expect([200, 503]).toContain(res.status);
      });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(MAX_MS);
  }, 30000);

  it('GET /api/docs-json responds within threshold', async () => {
    const start = Date.now();
    await request(app!.getHttpServer()).get('/api/docs-json').expect(200);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(MAX_MS);
  }, 30000);
});
