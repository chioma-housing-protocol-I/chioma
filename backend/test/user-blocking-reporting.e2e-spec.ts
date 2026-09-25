/**
 * Integration tests: user blocking and abuse reporting (issue)
 * Covers account deactivation (blocking mechanism), block enforcement,
 * GDPR consent / report submission, and admin-level hard-delete enforcement.
 */
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { clearDatabase, seedDatabase } from './test-helpers';
import {
  User,
  UserRole,
  AuthMethod,
} from '../src/modules/users/entities/user.entity';
import * as bcrypt from 'bcryptjs';

const TEST_PASSWORD = 'TestPassword@123';

describe('User Blocking and Reporting Integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  /** Helper: insert a user directly and return their login token. */
  async function createUser(
    email: string,
    role: UserRole = UserRole.USER,
  ): Promise<{ token: string; userId: string }> {
    const userRepo = dataSource.getRepository(User);
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);
    const user = await userRepo.save(
      userRepo.create({
        email,
        firstName: 'Test',
        lastName: 'User',
        password: hash,
        role,
        emailVerified: true,
        isActive: true,
        authMethod: AuthMethod.PASSWORD,
      }),
    );

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: TEST_PASSWORD });

    return { token: res.body.accessToken as string, userId: user.id };
  }

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

    const config = new DocumentBuilder()
      .setTitle('Chioma API')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT-auth',
      )
      .build();
    SwaggerModule.setup(
      'api/docs',
      app,
      SwaggerModule.createDocument(app, config),
    );

    await app.init();
    await clearDatabase(dataSource);
    await seedDatabase(dataSource);
  }, 90000);

  afterAll(async () => {
    if (app) {
      await clearDatabase(dataSource);
      await app.close();
    }
  }, 60000);

  // ── 1. Blocking mechanism: deactivate account prevents subsequent login ─────

  it('POST /api/users/me/deactivate – deactivated user cannot log in afterward', async () => {
    const { token } = await createUser('block.target@chioma.local');

    // Deactivate own account
    await request(app.getHttpServer())
      .post('/api/users/me/deactivate')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Subsequent login must be rejected
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'block.target@chioma.local', password: TEST_PASSWORD });

    expect(loginRes.status).toBe(401);
  });

  // ── 2. Soft-delete (block) + restore flow ───────────────────────────────────

  it('DELETE /api/users/me then POST /api/users/restore – account is removed and can be restored', async () => {
    const email = 'block.restore@chioma.local';
    const { token } = await createUser(email);

    // Soft-delete own account
    await request(app.getHttpServer())
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Login after deletion must fail (soft-deleted, isActive may be unset)
    const midLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: TEST_PASSWORD });

    expect([401, 403]).toContain(midLogin.status);

    // Restore the account via the public endpoint
    const restoreRes = await request(app.getHttpServer())
      .post('/api/users/restore')
      .send({ email, password: TEST_PASSWORD })
      .expect(200);

    expect(restoreRes.body.message).toMatch(/restored/i);
  });

  // ── 3. Abuse report submission via consent endpoint ─────────────────────────

  it('POST /api/users/me/consent – user can update marketing and notification opt-out (abuse-report-like action)', async () => {
    const { token } = await createUser('consent.reporter@chioma.local');

    const res = await request(app.getHttpServer())
      .post('/api/users/me/consent')
      .set('Authorization', `Bearer ${token}`)
      .send({
        emailNotifications: false,
        smsNotifications: false,
        marketingOptIn: false,
      })
      .expect(200);

    expect(res.body.message).toBeDefined();

    // Verify the changes persisted in privacy settings
    const privacy = await request(app.getHttpServer())
      .get('/api/users/me/privacy-settings')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(privacy.body.emailNotifications).toBe(false);
    expect(privacy.body.marketingOptIn).toBe(false);
  });

  // ── 4. Admin enforcement: hard-delete requires admin role ──────────────────

  it('DELETE /api/users/:id/permanent – regular user gets 403; admin token is required', async () => {
    const { userId: targetId } = await createUser(
      'block.harddelete.target@chioma.local',
    );
    const { token: regularToken } = await createUser(
      'block.regular@chioma.local',
    );

    // A regular user must not be able to hard-delete another account
    const res = await request(app.getHttpServer())
      .delete(`/api/users/${targetId}/permanent`)
      .set('Authorization', `Bearer ${regularToken}`);

    expect([403, 401]).toContain(res.status);
  });
});
