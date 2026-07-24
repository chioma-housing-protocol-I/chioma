/**
 * [INTEGRATION] Password Reset Flow Integration Tests
 *
 * Tests the full forgot-password → reset-password flow using the real
 * AuthService wired to SQLite in-memory. EmailService is mocked so no
 * SMTP transport is needed, but the spy captures every call so we can
 * assert that the correct token was dispatched.
 *
 * Covers:
 *   - POST /auth/forgot-password  (happy path, unknown email, validation)
 *   - POST /auth/reset-password   (valid token, expired token, invalid token,
 *                                   weak password, reuse of already-consumed token)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { EmailService } from '../src/modules/notifications/email.service';
import { clearDatabase, seedDatabase } from './test-helpers';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('[INTEGRATION] Password Reset Flow (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepo: Repository<User>;
  let emailService: EmailService;

  // Spy captures the raw reset token that the service generates
  let resetEmailSpy: jest.SpyInstance;

  const EXISTING_USER = {
    email: 'resetuser@chioma.local',
    password: 'TestPassword@123',
    firstName: 'Reset',
    lastName: 'User',
    role: 'user',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = app.get(DataSource);

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

    userRepo = dataSource.getRepository(User);
    emailService = app.get(EmailService);

    // Silence actual SMTP calls in all tests
    resetEmailSpy = jest
      .spyOn(emailService, 'sendPasswordResetEmail')
      .mockResolvedValue(undefined);

    jest
      .spyOn(emailService, 'sendVerificationEmail')
      .mockResolvedValue(undefined);

    await clearDatabase(dataSource);
    await seedDatabase(dataSource);
  });

  afterAll(async () => {
    await clearDatabase(dataSource);
    await app?.close();
  }, 60_000);

  beforeEach(() => {
    resetEmailSpy.mockClear();
  });

  // ── Helper: register a fresh user and return the created record ────────────

  async function registerUser(
    overrides: Partial<typeof EXISTING_USER> = {},
  ): Promise<User> {
    const payload = { ...EXISTING_USER, ...overrides };
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(payload)
      .expect(201);

    const user = await userRepo.findOne({
      where: { email: payload.email.toLowerCase() },
      withDeleted: false,
    });
    return user!;
  }

  // ── Helper: grab the raw reset token that was emailed ─────────────────────

  function captureLastResetToken(): string {
    expect(resetEmailSpy).toHaveBeenCalled();
    const calls = resetEmailSpy.mock.calls;
    const lastCall = calls[calls.length - 1];
    // sendPasswordResetEmail(email, token)
    return lastCall[1] as string;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/auth/forgot-password
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /api/auth/forgot-password', () => {
    it('returns 200 and the generic message for a registered email', async () => {
      await registerUser({ email: 'fp-happy@chioma.local' });

      const res = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'fp-happy@chioma.local' })
        .expect(200);

      expect(res.body.message).toMatch(/If an account exists/i);
    });

    it('dispatches a reset email containing a raw token', async () => {
      await registerUser({ email: 'fp-token@chioma.local' });

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'fp-token@chioma.local' })
        .expect(200);

      expect(resetEmailSpy).toHaveBeenCalledWith(
        'fp-token@chioma.local',
        expect.any(String),
      );
    });

    it('stores the SHA-256 hash of the token in the database', async () => {
      const user = await registerUser({ email: 'fp-dbhash@chioma.local' });

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'fp-dbhash@chioma.local' })
        .expect(200);

      const rawToken = captureLastResetToken();
      const expectedHash = sha256(rawToken);

      const updatedUser = await userRepo.findOne({ where: { id: user.id } });
      expect(updatedUser!.resetToken).toBe(expectedHash);
    });

    it('sets a future expiry on the reset token', async () => {
      await registerUser({ email: 'fp-expiry@chioma.local' });

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'fp-expiry@chioma.local' })
        .expect(200);

      const saved = await userRepo.findOne({
        where: { email: 'fp-expiry@chioma.local' },
      });

      expect(saved!.resetTokenExpires).toBeDefined();
      expect(saved!.resetTokenExpires!.getTime()).toBeGreaterThan(Date.now());
    });

    it('returns 200 with the same generic message for an unknown email (no enumeration)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'nobody@chioma.local' })
        .expect(200);

      expect(res.body.message).toMatch(/If an account exists/i);
      expect(resetEmailSpy).not.toHaveBeenCalled();
    });

    it('returns 400 for an invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('returns 400 when email field is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/auth/reset-password
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /api/auth/reset-password', () => {
    const NEW_PASSWORD = 'NewSecurePass@2025';

    it('resets the password successfully with a valid token', async () => {
      await registerUser({ email: 'rp-happy@chioma.local' });

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'rp-happy@chioma.local' });

      const token = captureLastResetToken();

      const res = await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token, newPassword: NEW_PASSWORD })
        .expect(200);

      expect(res.body.message).toMatch(/reset successfully/i);
    });

    it('clears resetToken and resetTokenExpires after a successful reset', async () => {
      const user = await registerUser({ email: 'rp-clear@chioma.local' });

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'rp-clear@chioma.local' });

      const token = captureLastResetToken();

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token, newPassword: NEW_PASSWORD })
        .expect(200);

      const updated = await userRepo.findOne({ where: { id: user.id } });
      expect(updated!.resetToken).toBeNull();
      expect(updated!.resetTokenExpires).toBeNull();
    });

    it('allows login with the new password after reset', async () => {
      await registerUser({ email: 'rp-login@chioma.local' });

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'rp-login@chioma.local' });

      const token = captureLastResetToken();

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token, newPassword: NEW_PASSWORD })
        .expect(200);

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'rp-login@chioma.local', password: NEW_PASSWORD })
        .expect(200);

      expect(loginRes.body).toHaveProperty('accessToken');
    });

    it('rejects login with the old password after reset', async () => {
      await registerUser({ email: 'rp-oldpass@chioma.local' });

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'rp-oldpass@chioma.local' });

      const token = captureLastResetToken();

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token, newPassword: NEW_PASSWORD })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'rp-oldpass@chioma.local',
          password: EXISTING_USER.password,
        })
        .expect(401);
    });

    it('returns 400 for an invalid / never-issued token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token: 'totally-fake-token-that-does-not-exist',
          newPassword: NEW_PASSWORD,
        })
        .expect(400);
    });

    it('returns 400 for an expired token', async () => {
      const user = await registerUser({ email: 'rp-expired@chioma.local' });

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'rp-expired@chioma.local' });

      const token = captureLastResetToken();

      // Manually expire the token in the DB
      await userRepo.update(
        { id: user.id },
        { resetTokenExpires: new Date(Date.now() - 1000) },
      );

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token, newPassword: NEW_PASSWORD })
        .expect(400);
    });

    it('returns 400 when token is consumed a second time (single-use)', async () => {
      await registerUser({ email: 'rp-reuse@chioma.local' });

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'rp-reuse@chioma.local' });

      const token = captureLastResetToken();

      // First use — should succeed
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token, newPassword: NEW_PASSWORD })
        .expect(200);

      // Second use — token already cleared
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token, newPassword: 'AnotherPass@2025' })
        .expect(400);
    });

    it('returns 400 for a password that does not meet complexity requirements', async () => {
      await registerUser({ email: 'rp-weak@chioma.local' });

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'rp-weak@chioma.local' });

      const token = captureLastResetToken();

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token, newPassword: 'weak' })
        .expect(400);
    });

    it('returns 400 when token field is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ newPassword: NEW_PASSWORD })
        .expect(400);
    });

    it('returns 400 when newPassword field is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: 'some-token' })
        .expect(400);
    });

    it('resets failed login attempts counter after a successful password reset', async () => {
      const user = await registerUser({ email: 'rp-attempts@chioma.local' });

      // Simulate failed login attempts
      await userRepo.update({ id: user.id }, { failedLoginAttempts: 4 });

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'rp-attempts@chioma.local' });

      const token = captureLastResetToken();

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token, newPassword: NEW_PASSWORD })
        .expect(200);

      const updated = await userRepo.findOne({ where: { id: user.id } });
      expect(updated!.failedLoginAttempts).toBe(0);
    });
  });
});
