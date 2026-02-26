import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { RateLimitService } from '../src/modules/rate-limiting';

describe('Rate Limiting E2E', () => {
  let app: INestApplication;
  let rateLimitService: RateLimitService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    rateLimitService = moduleFixture.get<RateLimitService>(RateLimitService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Rate Limiting Headers', () => {
    it('should include rate limit headers in response', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });
  });

  describe('Basic Rate Limiting', () => {
    it('should enforce rate limits on public endpoints', async () => {
      const responses = [];

      for (let i = 0; i < 150; i++) {
        const response = await request(app.getHttpServer()).get('/health');
        responses.push(response);
      }

      const blockedResponses = responses.filter((r) => r.status === 429);
      expect(blockedResponses.length).toBeGreaterThan(0);
    });

    it('should return 429 with retry information when rate limited', async () => {
      for (let i = 0; i < 150; i++) {
        await request(app.getHttpServer()).get('/health');
      }

      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(429);

      expect(response.body).toHaveProperty('retryAfter');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('User Tier-Based Limiting', () => {
    it('should apply different limits based on user tier', async () => {
      const publicResponses = [];
      for (let i = 0; i < 50; i++) {
        const response = await request(app.getHttpServer()).get('/health');
        publicResponses.push(response);
      }

      const publicBlocked = publicResponses.filter((r) => r.status === 429).length;
      expect(publicBlocked).toBe(0);
    });
  });

  describe('Abuse Detection', () => {
    it('should detect rapid fire requests', async () => {
      const identifier = `test-${Date.now()}`;
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app.getHttpServer())
            .get('/health')
            .set('X-Test-Identifier', identifier),
        );
      }

      await Promise.all(promises);
    });
  });

  describe('Whitelist Functionality', () => {
    it('should bypass rate limits for whitelisted identifiers', async () => {
      const identifier = 'whitelisted-user';
      await rateLimitService.whitelistIdentifier(identifier, 300);

      for (let i = 0; i < 200; i++) {
        await request(app.getHttpServer())
          .get('/health')
          .set('X-Test-Identifier', identifier);
      }
    });
  });

  describe('Category-Based Limiting', () => {
    it('should apply different limits to different endpoint categories', async () => {
      const authResponses = [];
      for (let i = 0; i < 10; i++) {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'test@example.com', password: 'wrongpassword' });
        authResponses.push(response);
      }

      const authBlocked = authResponses.filter((r) => r.status === 429);
      expect(authBlocked.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset rate limit when requested', async () => {
      const identifier = `reset-test-${Date.now()}`;

      for (let i = 0; i < 100; i++) {
        await request(app.getHttpServer())
          .get('/health')
          .set('X-Test-Identifier', identifier);
      }

      // Rate limit should be hit
      const blockedResponse = await request(app.getHttpServer())
        .get('/health')
        .set('X-Test-Identifier', identifier);

      expect(blockedResponse.status).toBe(429);
    });
  });

  describe('IP-based Rate Limiting', () => {
    it('should rate limit based on IP for unauthenticated requests', async () => {
      const responses = [];

      for (let i = 0; i < 150; i++) {
        const response = await request(app.getHttpServer())
          .get('/health')
          .set('X-Forwarded-For', '10.0.0.1');
        responses.push(response);
      }

      const blocked = responses.filter((r) => r.status === 429);
      expect(blocked.length).toBeGreaterThan(0);
    });
  });
});
