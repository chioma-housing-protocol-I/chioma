/**
 * Integration E2E: critical paths across modules.
 * Covers feedback, developer portal, and public endpoints.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

describe('Integration (e2e)', () => {
  let app: INestApplication | undefined;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply validation pipe like in main.ts
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
