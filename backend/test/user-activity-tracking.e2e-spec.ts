/**
 * Integration tests: user activity logging and retrieval (issue)
 * Covers activity event logging, history retrieval, filtering, and privacy compliance.
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

describe('User Activity Tracking Integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;

  async function createAndLoginUser(email: string): Promise<string> {
    const userRepo = dataSource.getRepository(User);
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);
    await userRepo.save(
      userRepo.create({
        email,
        firstName: 'Activity',
        lastName: 'Tester',
        password: hash,
        role: UserRole.USER,
        emailVerified: true,
        isActive: true,
        authMethod: AuthMethod.PASSWORD,
      }),
    );

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: TEST_PASSWORD });

    return res.body.accessToken as string;
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

    accessToken = await createAndLoginUser('activity.tester@chioma.local');
  }, 90000);

  afterAll(async () => {
    if (app) {
      await clearDatabase(dataSource);
      await app.close();
    }
  }, 60000);

  // ── 1. Activity history endpoint is accessible and has the expected shape ──

  it('GET /api/users/me/activity – returns accountCreated, lastLogin, emailVerified, and isActive', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/users/me/activity')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('accountCreated');
    expect(res.body).toHaveProperty('lastLogin');
    expect(res.body).toHaveProperty('emailVerified');
    expect(res.body).toHaveProperty('isActive');
    expect(typeof res.body.isActive).toBe('boolean');
    expect(new Date(res.body.accountCreated).getTime()).not.toBeNaN();
  });

  // ── 2. Login event is recorded and reflected in lastLogin ──────────────────

  it('GET /api/users/me/activity – lastLogin is populated after a successful login', async () => {
    // We already logged in during setup; re-login to refresh lastLoginAt
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'activity.tester@chioma.local', password: TEST_PASSWORD })
      .expect(200);

    const freshToken = loginRes.body.accessToken as string;

    const res = await request(app.getHttpServer())
      .get('/api/users/me/activity')
      .set('Authorization', `Bearer ${freshToken}`)
      .expect(200);

    expect(res.body.lastLogin).not.toBeNull();
    const lastLogin = new Date(res.body.lastLogin as string).getTime();
    expect(lastLogin).not.toBeNaN();
    // lastLogin must be within the last 60 seconds
    expect(Date.now() - lastLogin).toBeLessThan(60_000);
  });

  // ── 3. Activity endpoint requires authentication (privacy compliance) ───────

  it('GET /api/users/me/activity – returns 401 without an auth token', async () => {
    await request(app.getHttpServer())
      .get('/api/users/me/activity')
      .expect(401);
  });

  // ── 4. GDPR data export includes activity-related fields without leaking secrets

  it('GET /api/users/me/export – GDPR export contains user data but excludes sensitive secrets', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/users/me/export')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // Core activity-relevant fields must be present
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('email');
    expect(res.body).toHaveProperty('createdAt');
    expect(res.body).toHaveProperty('isActive');

    // Secrets must never appear in an export
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('refreshToken');
    expect(res.body).not.toHaveProperty('resetToken');
    expect(res.body).not.toHaveProperty('verificationToken');
  });
});
