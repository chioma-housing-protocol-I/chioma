import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { getTestDatabaseConfig, clearRepositories } from './test-helpers';
import { User } from '../src/modules/users/entities/user.entity';
import { Referral } from '../src/modules/referral/entities/referral.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('Referral (e2e)', () => {
  let app: INestApplication | undefined;
  let userRepository: Repository<User>;
  let referralRepository: Repository<Referral>;
  let accessToken: string;

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

    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    referralRepository = moduleFixture.get<Repository<Referral>>(
      getRepositoryToken(Referral),
    );
  });

  afterAll(async () => {
    await clearRepositories([userRepository, referralRepository]);
    if (app) {
      await app.close();
    }
  }, 60000);

  beforeEach(async () => {
    await clearRepositories([userRepository, referralRepository]);

    // Create a test user and get access token
    const testUser = {
      email: 'referrer@example.com',
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'Referrer',
      role: 'user',
      referralCode: 'TEST1234',
    };

    // Register user
    const registerRes = await request(app!.getHttpServer())
      .post('/api/auth/register')
      .send(testUser)
      .expect(201);

    accessToken = registerRes.body.accessToken;
  }, 60000);

  describe('GET /api/referrals/code', () => {
    it('should return user referral code', async () => {
      const res = await request(app!.getHttpServer())
        .get('/api/referrals/code')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('referralCode');
      expect(typeof res.body.referralCode).toBe('string');
    });

    it('should reject unauthenticated request', async () => {
      await request(app!.getHttpServer())
        .get('/api/referrals/code')
        .expect(401);
    });
  });

  describe('GET /api/referrals/stats', () => {
    it('should return referral statistics', async () => {
      const res = await request(app!.getHttpServer())
        .get('/api/referrals/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('totalReferrals');
      expect(res.body).toHaveProperty('completedReferrals');
      expect(res.body).toHaveProperty('totalRewards');
      expect(res.body).toHaveProperty('referrals');
      expect(Array.isArray(res.body.referrals)).toBe(true);
    });

    it('should return zero stats for user with no referrals', async () => {
      const res = await request(app!.getHttpServer())
        .get('/api/referrals/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.totalReferrals).toBe(0);
      expect(res.body.completedReferrals).toBe(0);
      expect(res.body.totalRewards).toBe(0);
      expect(res.body.referrals).toEqual([]);
    });

    it('should reject unauthenticated request', async () => {
      await request(app!.getHttpServer())
        .get('/api/referrals/stats')
        .expect(401);
    });
  });

  describe('Referral workflow integration', () => {
    it('should complete full referral workflow', async () => {
      // Create referrer user (already done in beforeEach)

      // Create referred user
      const referredUserData = {
        email: 'referred@example.com',
        password: 'TestPass123!',
        firstName: 'Referred',
        lastName: 'User',
        role: 'user',
      };

      const referredRegisterRes = await request(app!.getHttpServer())
        .post('/api/auth/register')
        .send(referredUserData)
        .expect(201);

      const referredToken = referredRegisterRes.body.accessToken;

      // Get referrer's referral code
      const codeRes = await request(app!.getHttpServer())
        .get('/api/referrals/code')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const referralCode = codeRes.body.referralCode;

      // Simulate referral tracking (this would normally happen during registration with referral code)
      // For this test, we'll manually create the referral record
      const referrer = await userRepository.findOne({
        where: { email: 'referrer@example.com' },
      });
      const referredUser = await userRepository.findOne({
        where: { email: 'referred@example.com' },
      });

      if (referrer && referredUser) {
        await referralRepository.save({
          referrerId: referrer.id,
          referredId: referredUser.id,
          status: 'pending',
        });

        // Check initial stats
        const initialStatsRes = await request(app!.getHttpServer())
          .get('/api/referrals/stats')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(initialStatsRes.body.totalReferrals).toBe(1);
        expect(initialStatsRes.body.completedReferrals).toBe(0);
        expect(initialStatsRes.body.referrals[0].status).toBe('pending');
      }
    });
  });
});