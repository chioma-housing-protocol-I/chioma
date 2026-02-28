/**
 * API Documentation & Contract E2E tests.
 * Ensures OpenAPI docs are served and spec is valid; critical endpoints respond with expected contract.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

describe('API Documentation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: ['health', 'health/detailed', 'security.txt', '.well-known'],
    });

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
  }, 30000);

  describe('Interactive API docs portal', () => {
    it('GET /api/docs returns Swagger UI HTML', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/docs')
        .expect(200);
      expect(res.text).toContain('swagger');
      expect(res.headers['content-type']).toMatch(/text\/html/);
    });

    it('GET /api/docs-json returns valid OpenAPI 3.0 spec', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);
      const spec = res.body;
      expect(spec.openapi).toBeDefined();
      expect(spec.info?.title).toContain('Chioma');
      expect(spec.info?.version).toBeDefined();
      expect(spec.paths).toBeDefined();
      expect(typeof spec.paths).toBe('object');
    });
  });

  describe('OpenAPI spec completeness', () => {
    it('spec has required top-level fields', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);
      const spec = res.body;
      expect(spec.openapi).toMatch(/^3\./);
      expect(spec.info).toBeDefined();
      expect(spec.paths).toBeDefined();
      expect(spec.components).toBeDefined();
    });

    it('spec documents security scheme JWT-auth', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);
      const components = res.body.components || {};
      const securitySchemes = components.securitySchemes || {};
      expect(securitySchemes['JWT-auth']).toBeDefined();
      expect(securitySchemes['JWT-auth'].type).toBe('http');
    });
  });
});
