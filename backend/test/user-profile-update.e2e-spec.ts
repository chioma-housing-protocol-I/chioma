/**
 * Integration tests: user profile update (issue)
 * Covers profile field updates, avatar upload, email change, and phone update.
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

describe('User Profile Update Integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;

  /** Register + login a fresh user and return its access token. */
  async function createAndLoginUser(
    email: string,
  ): Promise<{ accessToken: string; userId: string }> {
    const userRepo = dataSource.getRepository(User);
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);
    const user = await userRepo.save(
      userRepo.create({
        email,
        firstName: 'Profile',
        lastName: 'Tester',
        password: hash,
        role: UserRole.USER,
        emailVerified: true,
        isActive: true,
        authMethod: AuthMethod.PASSWORD,
      }),
    );

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: TEST_PASSWORD });

    return {
      accessToken: loginRes.body.accessToken,
      userId: user.id,
    };
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

    const result = await createAndLoginUser('profile.tester@chioma.local');
    accessToken = result.accessToken;
  }, 90000);

  afterAll(async () => {
    if (app) {
      await clearDatabase(dataSource);
      await app.close();
    }
  }, 60000);

  // ── 1. Profile field updates ────────────────────────────────────────────────

  it('PUT /api/users/me – updates display name fields and returns persisted values', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        firstName: 'Updated',
        lastName: 'Name',
        timezone: 'Africa/Lagos',
      })
      .expect(200);

    expect(res.body.firstName).toBe('Updated');
    expect(res.body.lastName).toBe('Name');
    expect(res.body.timezone).toBe('Africa/Lagos');
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('refreshToken');
  });

  // ── 2. Avatar URL update ────────────────────────────────────────────────────

  it('PUT /api/users/me – stores a valid avatar URL and reflects it in GET /me', async () => {
    const avatarUrl = 'https://cdn.example.com/avatars/profile.jpg';

    await request(app.getHttpServer())
      .put('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ avatarUrl })
      .expect(200);

    const profile = await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(profile.body.avatarUrl).toBe(avatarUrl);
  });

  // ── 3. Email change verification flow ───────────────────────────────────────

  it('POST /api/users/me/email – rejects email change when wrong current password is supplied', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/users/me/email')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        newEmail: 'new.address@chioma.local',
        currentPassword: 'WrongPassword@999',
      })
      .expect(401);

    expect(res.body.message).toBeDefined();
  });

  // ── 4. Phone number update with consistency check ───────────────────────────

  it('PUT /api/users/me – updates phone number and GET /me reflects the change consistently', async () => {
    const phone = '+2348012345678';

    await request(app.getHttpServer())
      .put('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ phoneNumber: phone })
      .expect(200);

    const profile = await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(profile.body.phoneNumber).toBe(phone);
    // The plain value is returned but hash columns are never exposed
    expect(profile.body).not.toHaveProperty('phoneNumberHash');
  });
});
