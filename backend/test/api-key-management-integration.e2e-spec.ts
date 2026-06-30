/**
 * [INTEGRATION] API Key Management Integration Tests
 *
 * Tests the full lifecycle of API keys through the DeveloperController
 * using SQLite in-memory and a mocked JwtAuthGuard (avoids needing a live
 * auth service while still exercising real business logic).
 *
 * Covers:
 *   - Create key (default/custom expiry, validation)
 *   - List keys (expiry metadata, masking)
 *   - Get single key (details, 404 for another user's key)
 *   - Update key (rename, new expiry)
 *   - Rotate key (new key valid, old key invalid, rotation history recorded)
 *   - Revoke key (status transition, cannot re-rotate)
 *   - validateKey helper (active, expired, revoked, unknown)
 *   - Expiring-soon endpoint
 *   - deactivateExpiredKeys cron helper
 */

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
import {
  ApiKey,
  ApiKeyStatus,
} from '../src/modules/developer/entities/api-key.entity';
import { ApiKeyRotationHistory } from '../src/modules/developer/entities/api-key-rotation-history.entity';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { getTestDatabaseConfig, clearRepositories } from './test-helpers';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEST_USER_ID = 'test-user-uuid-integration';
const OTHER_USER_ID = 'other-user-uuid-integration';
const BEARER = 'Bearer mock-token';

// ─── JWT guard stub — injects TEST_USER_ID as req.user ───────────────────────

const authGuardFactory = (userId: string) => ({
  canActivate: (context: any) => {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization as string | undefined;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }
    req.user = { id: userId };
    return true;
  },
});

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('[INTEGRATION] API Key Management (e2e)', () => {
  let app: INestApplication;
  let service: DeveloperService;
  let apiKeyRepo: any;
  let rotationHistoryRepo: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
        TypeOrmModule.forRoot(
          getTestDatabaseConfig([ApiKey, ApiKeyRotationHistory]),
        ),
        DeveloperModule,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuardFactory(TEST_USER_ID))
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    service = moduleFixture.get<DeveloperService>(DeveloperService);
    apiKeyRepo = moduleFixture.get(getRepositoryToken(ApiKey));
    rotationHistoryRepo = moduleFixture.get(
      getRepositoryToken(ApiKeyRotationHistory),
    );
  });

  beforeEach(async () => {
    await clearRepositories([rotationHistoryRepo, apiKeyRepo]);
  });

  afterEach(async () => {
    await clearRepositories([rotationHistoryRepo, apiKeyRepo]);
  });

  afterAll(async () => {
    await clearRepositories([rotationHistoryRepo, apiKeyRepo]);
    await app?.close();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Create
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /developer/api-keys', () => {
    it('creates a key and returns id, key, name, expiresAt', async () => {
      const res = await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', BEARER)
        .send({ name: 'My Integration Key' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('key');
      expect(res.body).toHaveProperty('name', 'My Integration Key');
      expect(res.body).toHaveProperty('expiresAt');
      expect(res.body.key).toMatch(/^chioma_sk_/);
    });

    it('raw key is only returned once — not present in list response', async () => {
      await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', BEARER)
        .send({ name: 'Secret Key' })
        .expect(201);

      const list = await request(app.getHttpServer())
        .get('/developer/api-keys')
        .set('Authorization', BEARER)
        .expect(200);

      // List items should have prefix, not the full raw key
      list.body.forEach((k: any) => {
        expect(k).not.toHaveProperty('key');
        expect(k).toHaveProperty('prefix');
      });
    });

    it('sets default 90-day expiry when no expiresAt is provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', BEARER)
        .send({ name: 'Default Expiry Key' })
        .expect(201);

      const expiresAt = new Date(res.body.expiresAt);
      const expectedMin = new Date();
      expectedMin.setDate(expectedMin.getDate() + 89);
      const expectedMax = new Date();
      expectedMax.setDate(expectedMax.getDate() + 91);

      expect(expiresAt.getTime()).toBeGreaterThan(expectedMin.getTime());
      expect(expiresAt.getTime()).toBeLessThan(expectedMax.getTime());
    });

    it('returns 401 without Authorization header', async () => {
      await request(app.getHttpServer())
        .post('/developer/api-keys')
        .send({ name: 'Unauth Key' })
        .expect(401);
    });

    it('returns 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', BEARER)
        .send({})
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // List
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /developer/api-keys', () => {
    it('returns an empty array when user has no keys', async () => {
      const res = await request(app.getHttpServer())
        .get('/developer/api-keys')
        .set('Authorization', BEARER)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('returns all keys with expiry metadata fields', async () => {
      await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', BEARER)
        .send({ name: 'Key A' });

      await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', BEARER)
        .send({ name: 'Key B' });

      const res = await request(app.getHttpServer())
        .get('/developer/api-keys')
        .set('Authorization', BEARER)
        .expect(200);

      expect(res.body).toHaveLength(2);
      res.body.forEach((k: any) => {
        expect(k).toHaveProperty('id');
        expect(k).toHaveProperty('name');
        expect(k).toHaveProperty('prefix');
        expect(k).toHaveProperty('expiresAt');
        expect(k).toHaveProperty('isNearExpiration');
        expect(k).toHaveProperty('isExpired');
        expect(k).toHaveProperty('status');
        expect(k).toHaveProperty('isRotated');
      });
    });

    it('returns keys in descending creation order', async () => {
      await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', BEARER)
        .send({ name: 'First Key' });

      await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', BEARER)
        .send({ name: 'Second Key' });

      const res = await request(app.getHttpServer())
        .get('/developer/api-keys')
        .set('Authorization', BEARER)
        .expect(200);

      // Most recently created should appear first
      expect(res.body[0].name).toBe('Second Key');
      expect(res.body[1].name).toBe('First Key');
    });

    it('returns 401 without Authorization header', async () => {
      await request(app.getHttpServer()).get('/developer/api-keys').expect(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Get single key
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /developer/api-keys/:id', () => {
    it('returns full key details for a valid key', async () => {
      const create = await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', BEARER)
        .send({ name: 'Detail Key' });

      const res = await request(app.getHttpServer())
        .get(`/developer/api-keys/${create.body.id}`)
        .set('Authorization', BEARER)
        .expect(200);

      expect(res.body).toHaveProperty('id', create.body.id);
      expect(res.body).toHaveProperty('name', 'Detail Key');
      expect(res.body).toHaveProperty('prefix');
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).toHaveProperty('expiresAt');
      expect(res.body).toHaveProperty('isNearExpiration');
      expect(res.body).toHaveProperty('isExpired');
      expect(res.body).toHaveProperty('status');
    });

    it('returns 404 for a non-existent key', async () => {
      await request(app.getHttpServer())
        .get('/developer/api-keys/00000000-0000-0000-0000-000000000000')
        .set('Authorization', BEARER)
        .expect(404);
    });

    it('returns 404 when key belongs to a different user', async () => {
      // Create key as TEST_USER_ID (default guard)
      const create = await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', BEARER)
        .send({ name: 'My Key' });

      // Fetch via service using OTHER_USER_ID directly
      await expect(
        service.getKey(OTHER_USER_ID, create.body.id),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Update
  // ─────────────────────────────────────────────────────────────────────────

  describe('PATCH /developer/api-keys/:id', () => {
    it('updates the key name', async () => {
      const create = await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', BEARER)
        .send({ name: 'Old Name' });

      const res = await request(app.getHttpServer())
        .patch(`/developer/api-keys/${create.body.id}`)
        .set('Authorization', BEARER)
        .send({ name: 'New Name' })
        .expect(200);

      expect(res.body).toHaveProperty('name', 'New Name');
    });

    it('updates the key expiration date', async () => {
      const create = await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', BEARER)
        .send({ name: 'Expiry Update Key' });

      const newExpiry = new Date();
      newExpiry.setFullYear(newExpiry.getFullYear() + 1);

      const res = await request(app.getHttpServer())
        .patch(`/developer/api-keys/${create.body.id}`)
        .set('Authorization', BEARER)
        .send({ expiresAt: newExpiry.toISOString() })
        .expect(200);

      expect(new Date(res.body.expiresAt).getFullYear()).toBe(
        newExpiry.getFullYear(),
      );
    });

    it('returns 404 for a non-existent key', async () => {
      await request(app.getHttpServer())
        .patch('/developer/api-keys/00000000-0000-0000-0000-000000000000')
        .set('Authorization', BEARER)
        .send({ name: 'Ghost Key' })
        .expect(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Rotate
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /developer/api-keys/:id/rotate', () => {
    it('issues a new key and marks the old one as expired', async () => {
      const create = await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', BEARER)
        .send({ name: 'Rotate Me' });

      const oldKeyId = create.body.id;
      const oldRawKey = create.body.key;

      const rotate = await request(app.getHttpServer())
        .post(`/developer/api-keys/${oldKeyId}/rotate`)
        .set('Authorization', BEARER)
        .expect(201);

      expect(rotate.body).toHaveProperty('id');
      expect(rotate.body).toHaveProperty('key');
      expect(rotate.body.id).not.toBe(oldKeyId);
      expect(rotate.body.key).toMatch(/^chioma_sk_/);

      // Old key must be invalid
      const oldValidated = await service.validateKey(oldRawKey);
      expect(oldValidated).toBeNull();

      // New key must be valid
      const newValidated = await service.validateKey(rotate.body.key);
      expect(newValidated).not.toBeNull();
      expect(newValidated!.id).toBe(rotate.body.id);
    });

    it('records an entry in the rotation history', async () => {
      const create = await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', BEARER)
        .send({ name: 'History Key' });

      const oldKeyId = create.body.id;

      await request(app.getHttpServer())
        .post(`/developer/api-keys/${oldKeyId}/rotate`)
        .set('Authorization', BEARER)
        .expect(201);

      // Get the new key id from the list
      const list = await request(app.getHttpServer())
        .get('/developer/api-keys')
        .set('Authorization', BEARER);

      const newKey = list.body.find(
        (k: any) => k.id !== oldKeyId && k.isRotated === true,
      );
      expect(newKey).toBeDefined();

      const history = await request(app.getHttpServer())
        .get(`/developer/api-keys/${newKey.id}/rotation-history`)
        .set('Authorization', BEARER)
        .expect(200);

      expect(Array.isArray(history.body)).toBe(true);
      expect(history.body.length).toBeGreaterThanOrEqual(1);
      expect(history.body[0]).toHaveProperty('rotatedAt');
      expect(history.body[0]).toHaveProperty('oldKeyPrefix');
      expect(history.body[0]).toHaveProperty('newKeyPrefix');
    });

    it('returns 404 when key does not exist', async () => {
      await request(app.getHttpServer())
        .post('/developer/api-keys/00000000-0000-0000-0000-000000000000/rotate')
        .set('Authorization', BEARER)
        .expect(404);
    });

    it('returns 400 when trying to rotate a revoked key', async () => {
      const create = await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', BEARER)
        .send({ name: 'Revoke Before Rotate' });

      await request(app.getHttpServer())
        .delete(`/developer/api-keys/${create.body.id}`)
        .set('Authorization', BEARER)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/developer/api-keys/${create.body.id}/rotate`)
        .set('Authorization', BEARER)
        .expect(400);
    });

    it('returns 400 when trying to rotate an already-expired key', async () => {
      const create = await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', BEARER)
        .send({ name: 'Expire Before Rotate' });

      // Force expiry in DB
      await apiKeyRepo.update(create.body.id, {
        expiresAt: new Date(Date.now() - 10_000),
      });

      await request(app.getHttpServer())
        .post(`/developer/api-keys/${create.body.id}/rotate`)
        .set('Authorization', BEARER)
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Revoke
  // ─────────────────────────────────────────────────────────────────────────

  describe('DELETE /developer/api-keys/:id', () => {
    it('revokes a key and reflects status in the list', async () => {
      const create = await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', BEARER)
        .send({ name: 'Revoke Me' });

      await request(app.getHttpServer())
        .delete(`/developer/api-keys/${create.body.id}`)
        .set('Authorization', BEARER)
        .expect(200);

      const list = await request(app.getHttpServer())
        .get('/developer/api-keys')
        .set('Authorization', BEARER);

      const revoked = list.body.find((k: any) => k.id === create.body.id);
      expect(revoked).toBeDefined();
      expect(revoked.status).toBe(ApiKeyStatus.REVOKED);
    });

    it('returns 404 for a non-existent key', async () => {
      await request(app.getHttpServer())
        .delete('/developer/api-keys/00000000-0000-0000-0000-000000000000')
        .set('Authorization', BEARER)
        .expect(404);
    });

    it('revoked key fails validateKey', async () => {
      const create = await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', BEARER)
        .send({ name: 'Revoke Validate' });

      const rawKey = create.body.key;

      await request(app.getHttpServer())
        .delete(`/developer/api-keys/${create.body.id}`)
        .set('Authorization', BEARER);

      const result = await service.validateKey(rawKey);
      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // validateKey helper
  // ─────────────────────────────────────────────────────────────────────────

  describe('DeveloperService.validateKey()', () => {
    it('returns the ApiKey entity for a valid active key', async () => {
      const { key } = await service.createKey(TEST_USER_ID, 'Valid Key');

      const result = await service.validateKey(key);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(ApiKeyStatus.ACTIVE);
    });

    it('returns null for a key with wrong prefix', async () => {
      const result = await service.validateKey('wrong_prefix_abc123');
      expect(result).toBeNull();
    });

    it('returns null for an unknown key with correct prefix', async () => {
      // Correct prefix, but the rest is random and not in DB
      const result = await service.validateKey('chioma_sk_unknownkeyvalue');
      expect(result).toBeNull();
    });

    it('auto-expires a key past its expiresAt and returns null', async () => {
      const { id, key } = await service.createKey(TEST_USER_ID, 'Auto Expire');

      // Force past expiry
      await apiKeyRepo.update(id, {
        expiresAt: new Date(Date.now() - 10_000),
      });

      const result = await service.validateKey(key);
      expect(result).toBeNull();

      // Status in DB should now be EXPIRED
      const stored = await apiKeyRepo.findOne({ where: { id } });
      expect(stored.status).toBe(ApiKeyStatus.EXPIRED);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Expiring-soon endpoint
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /developer/api-keys/expiring-soon', () => {
    it('returns an empty array when no keys are near expiry', async () => {
      // Key with 90-day default will not appear in the 30-day window
      await request(app.getHttpServer())
        .post('/developer/api-keys')
        .set('Authorization', BEARER)
        .send({ name: 'Far Future Key' });

      const res = await request(app.getHttpServer())
        .get('/developer/api-keys/expiring-soon')
        .set('Authorization', BEARER)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('includes keys expiring within 30 days', async () => {
      const { id } = await service.createKey(TEST_USER_ID, 'Near Expiry Key');

      // Set expiry to 10 days from now
      const nearFuture = new Date();
      nearFuture.setDate(nearFuture.getDate() + 10);
      await apiKeyRepo.update(id, { expiresAt: nearFuture });

      const res = await request(app.getHttpServer())
        .get('/developer/api-keys/expiring-soon')
        .set('Authorization', BEARER)
        .expect(200);

      expect(res.body.some((k: any) => k.id === id)).toBe(true);
    });

    it('does not include already-expired keys', async () => {
      const { id } = await service.createKey(TEST_USER_ID, 'Already Expired');

      await apiKeyRepo.update(id, {
        expiresAt: new Date(Date.now() - 10_000),
        status: ApiKeyStatus.EXPIRED,
      });

      const res = await request(app.getHttpServer())
        .get('/developer/api-keys/expiring-soon')
        .set('Authorization', BEARER)
        .expect(200);

      expect(res.body.some((k: any) => k.id === id)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Bulk expiry cron helper
  // ─────────────────────────────────────────────────────────────────────────

  describe('DeveloperService.deactivateExpiredKeys()', () => {
    it('marks all past-expiry active keys as EXPIRED and returns the count', async () => {
      const k1 = await service.createKey(TEST_USER_ID, 'Cron Expire 1');
      const k2 = await service.createKey(TEST_USER_ID, 'Cron Expire 2');
      const k3 = await service.createKey(TEST_USER_ID, 'Should Stay Active');

      const past = new Date(Date.now() - 10_000);
      await apiKeyRepo.update(k1.id, { expiresAt: past });
      await apiKeyRepo.update(k2.id, { expiresAt: past });
      // k3 keeps default 90-day expiry

      const affected = await service.deactivateExpiredKeys();

      expect(affected).toBeGreaterThanOrEqual(2);

      const [s1, s2, s3] = await Promise.all([
        apiKeyRepo.findOne({ where: { id: k1.id } }),
        apiKeyRepo.findOne({ where: { id: k2.id } }),
        apiKeyRepo.findOne({ where: { id: k3.id } }),
      ]);

      expect(s1.status).toBe(ApiKeyStatus.EXPIRED);
      expect(s2.status).toBe(ApiKeyStatus.EXPIRED);
      expect(s3.status).toBe(ApiKeyStatus.ACTIVE);
    });

    it('returns 0 when there are no expired keys', async () => {
      // All keys have future expiry by default
      await service.createKey(TEST_USER_ID, 'Future Key');

      const affected = await service.deactivateExpiredKeys();

      expect(affected).toBe(0);
    });
  });
});
