/**
 * Integration tests: user preferences and settings management (issue)
 * Covers preference storage/retrieval, notification toggles, language/locale,
 * theme selection, and default-value guarantees.
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

describe('User Preferences Integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;

  async function createAndLoginUser(email: string): Promise<string> {
    const userRepo = dataSource.getRepository(User);
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);
    await userRepo.save(
      userRepo.create({
        email,
        firstName: 'Pref',
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

    accessToken = await createAndLoginUser('prefs.tester@chioma.local');
  }, 90000);

  afterAll(async () => {
    if (app) {
      await clearDatabase(dataSource);
      await app.close();
    }
  }, 60000);

  // ── 1. Default preferences are returned before any explicit save ────────────

  it('GET /api/users/preferences – returns default preferences for a new user', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/users/preferences')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('notifications');
    expect(res.body.notifications).toHaveProperty('email');
    expect(res.body.notifications).toHaveProperty('push');
    expect(res.body.appearanceTheme).toBe('system');
    expect(res.body.language).toBe('en');
    expect(res.body.currency).toBe('NGN');
  });

  // ── 2. Notification preferences are persisted correctly ────────────────────

  it('PATCH /api/users/preferences – saves notification toggles and GET returns the updated state', async () => {
    const updated = {
      notifications: {
        email: {
          newPropertyMatches: false,
          paymentReminders: true,
          maintenanceUpdates: false,
        },
        push: { newMessages: false, criticalAlerts: true },
        inAppSummary: false,
      },
      appearanceTheme: 'system',
      language: 'en',
      currency: 'NGN',
    };

    await request(app.getHttpServer())
      .patch('/api/users/preferences')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(updated)
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/api/users/preferences')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.notifications.email.newPropertyMatches).toBe(false);
    expect(res.body.notifications.push.newMessages).toBe(false);
    expect(res.body.notifications.inAppSummary).toBe(false);
  });

  // ── 3. Theme and locale preferences are stored and retrieved ───────────────

  it('PATCH /api/users/preferences – persists theme "dark" and language "fr" across requests', async () => {
    const payload = {
      notifications: {
        email: {
          newPropertyMatches: true,
          paymentReminders: true,
          maintenanceUpdates: true,
        },
        push: { newMessages: true, criticalAlerts: true },
        inAppSummary: true,
      },
      appearanceTheme: 'dark',
      language: 'fr',
      currency: 'EUR',
    };

    await request(app.getHttpServer())
      .patch('/api/users/preferences')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/api/users/preferences')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.appearanceTheme).toBe('dark');
    expect(res.body.language).toBe('fr');
    expect(res.body.currency).toBe('EUR');
  });

  // ── 4. Invalid theme value is rejected by the validation pipe ──────────────

  it('PATCH /api/users/preferences – rejects an invalid appearanceTheme value', async () => {
    const payload = {
      notifications: {
        email: {
          newPropertyMatches: true,
          paymentReminders: true,
          maintenanceUpdates: true,
        },
        push: { newMessages: true, criticalAlerts: true },
        inAppSummary: true,
      },
      appearanceTheme: 'rainbow', // invalid
      language: 'en',
      currency: 'NGN',
    };

    const res = await request(app.getHttpServer())
      .patch('/api/users/preferences')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(400);

    expect(res.body.message).toBeDefined();
  });
});
