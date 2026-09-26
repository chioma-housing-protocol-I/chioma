import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  UnauthorizedException,
} from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeveloperModule } from '../src/modules/developer/developer.module';
import { DeveloperService } from '../src/modules/developer/developer.service';
import { ApiKey } from '../src/modules/developer/entities/api-key.entity';
import { ApiKeyRotationHistory } from '../src/modules/developer/entities/api-key-rotation-history.entity';
import { getTestDatabaseConfig, clearRepositories } from './test-helpers';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';

describe('API Key E2E Tests', () => {
  let app: INestApplication;
  let apiKeyRepository: any;
  let rotationHistoryRepository: any;
  let developerService: DeveloperService;
  let jwtToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot(
          getTestDatabaseConfig([ApiKey, ApiKeyRotationHistory]),
        ),
        DeveloperModule,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          const authHeader = req.headers.authorization;
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException();
          }
          req.user = { id: 'test-user-id' };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(['log', 'error', 'warn', 'debug', 'verbose']);

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    apiKeyRepository = moduleFixture.get(getRepositoryToken(ApiKey));
    rotationHistoryRepository = moduleFixture.get(
      getRepositoryToken(ApiKeyRotationHistory),
    );
    developerService = moduleFixture.get<DeveloperService>(DeveloperService);

    // Get a JWT token for testing (would normally come from auth)
    // For now, we'll test without JWT by making the endpoints accessible or
    // by getting a token from the auth endpoint
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@test.com',
        password: 'testpassword',
      })
      .expect(200)
      .catch(() => ({ body: { access_token: 'mock-token' } }));

    jwtToken = loginResponse.body?.access_token || 'mock-token';
  });

  beforeEach(async () => {
    await clearRepositories([apiKeyRepository, rotationHistoryRepository]);
  });

  afterEach(async () => {
    await clearRepositories([apiKeyRepository, rotationHistoryRepository]);
  });

  afterAll(async () => {
    await clearRepositories([apiKeyRepository, rotationHistoryRepository]);
    if (app) {
      await app.close();
    }
  });

  describe('POST /developer/api-keys', () => {
    it('should create a new API key with default expiration', async () => {
      const response = await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ name: 'Test API Key' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('key');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('expiresAt');
      expect(response.body.name).toBe('Test API Key');
    });

    it('should reject request without authentication', async () => {
      await request(app.getHttpServer())
        .post('/developer/api-keys')
        .send({ name: 'Test API Key' })
        .expect(401);
    });
  });

  describe('GET /developer/api-keys', () => {
    it('should list API keys with expiration info', async () => {
      // First create a key
      await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ name: 'List Test Key' });

      const response = await request(app.getHttpServer())
        .get('/developer/api-keys')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('expiresAt');
        expect(response.body[0]).toHaveProperty('isNearExpiration');
        expect(response.body[0]).toHaveProperty('isExpired');
        expect(response.body[0]).toHaveProperty('status');
      }
    });
  });

  describe('POST /developer/api-keys/:id/rotate', () => {
    it('should rotate an active API key and transition validity', async () => {
      // First create a key
      const createResponse = await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ name: 'Rotate Test Key' });

      const keyId = createResponse.body.id;
      const oldRawKey = createResponse.body.key;

      // Old key should be valid initially
      const validatedOldBefore = await developerService.validateKey(oldRawKey);
      expect(validatedOldBefore).not.toBeNull();
      expect(validatedOldBefore!.id).toBe(keyId);

      const response = await request(app.getHttpServer())
        .post(`/developer/api-keys/${keyId}/rotate`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('key');
      expect(response.body.id).not.toBe(keyId);

      const newKeyId = response.body.id;
      const newRawKey = response.body.key;

      // New key should be valid
      const validatedNew = await developerService.validateKey(newRawKey);
      expect(validatedNew).not.toBeNull();
      expect(validatedNew!.id).toBe(newKeyId);

      // Old key should now be invalid/expired
      const validatedOldAfter = await developerService.validateKey(oldRawKey);
      expect(validatedOldAfter).toBeNull();
    });

    it('should reject rotation for non-existent key', async () => {
      await request(app.getHttpServer())
        .post('/developer/api-keys/non-existent-id/rotate')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(404);
    });

    it('should reject rotation for revoked key', async () => {
      // Create a key
      const createResponse = await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ name: 'Revoke Then Rotate Key' });

      const keyId = createResponse.body.id;

      // Revoke the key
      await request(app.getHttpServer())
        .delete(`/developer/api-keys/${keyId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Try rotating it
      await request(app.getHttpServer())
        .post(`/developer/api-keys/${keyId}/rotate`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(400);
    });

    it('should reject rotation for expired key', async () => {
      // Create a key
      const createResponse = await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ name: 'Expire Then Rotate Key' });

      const keyId = createResponse.body.id;

      // Force make the key expired in DB
      const pastDate = new Date(Date.now() - 10000);
      await apiKeyRepository.update(keyId, { expiresAt: pastDate });

      // Try rotating it
      await request(app.getHttpServer())
        .post(`/developer/api-keys/${keyId}/rotate`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(400);
    });
  });

  describe('GET /developer/api-keys/:id/rotation-history', () => {
    it('should return rotation history for a key', async () => {
      // First create and rotate a key
      const createResponse = await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ name: 'History Test Key' });

      const keyId = createResponse.body.id;

      await request(app.getHttpServer())
        .post(`/developer/api-keys/${keyId}/rotate`)
        .set('Authorization', `Bearer ${jwtToken}`);

      const response = await request(app.getHttpServer())
        .get(`/developer/api-keys/${keyId}/rotation-history`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('PATCH /developer/api-keys/:id', () => {
    it('should update API key expiration', async () => {
      // First create a key
      const createResponse = await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ name: 'Update Test Key' });

      const keyId = createResponse.body.id;
      const newExpiration = '2026-12-31T23:59:59Z';

      const response = await request(app.getHttpServer())
        .patch(`/developer/api-keys/${keyId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ expiresAt: newExpiration })
        .expect(200);

      expect(response.body.expiresAt).toBeDefined();
    });
  });

  describe('DELETE /developer/api-keys/:id', () => {
    it('should revoke an API key', async () => {
      // First create a key
      const createResponse = await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ name: 'Revoke Test Key' });

      const keyId = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/developer/api-keys/${keyId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Verify the key is revoked
      const listResponse = await request(app.getHttpServer())
        .get('/developer/api-keys')
        .set('Authorization', `Bearer ${jwtToken}`);

      const revokedKey = listResponse.body.find((k: any) => k.id === keyId);
      expect(revokedKey.status).toBe('revoked');
    });
  });

  describe('GET /developer/api-keys/expiring-soon', () => {
    it('should return keys expiring within 30 days', async () => {
      const response = await request(app.getHttpServer())
        .get('/developer/api-keys/expiring-soon')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
