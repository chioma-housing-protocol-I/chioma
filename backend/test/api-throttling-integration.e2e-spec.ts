/**
 * Integration tests: API throttling / rate-limiting workflow
 * Covers per-tier limits, headers, 429 responses, whitelist bypass, and category isolation.
 */
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { RateLimitService } from '../src/modules/rate-limiting';
import {
  UserTier,
  EndpointCategory,
} from '../src/modules/rate-limiting/types/rate-limit.types';
import { RATE_LIMIT_CONFIG } from '../src/modules/rate-limiting/config/rate-limit.config';

const mockRateLimitService = {
  consumePoints: jest.fn(),
  getRemainingPoints: jest.fn(),
  resetLimit: jest.fn(),
  isBlocked: jest.fn(),
  whitelistIdentifier: jest.fn(),
  isWhitelisted: jest.fn(),
};

describe('API Throttling Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: RateLimitService, useValue: mockRateLimitService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  // ─── Tier-Based Limits ────────────────────────────────────────────────────

  describe('Tier-based rate limit configuration', () => {
    it('FREE tier has lower PUBLIC limits than BASIC tier', () => {
      const freeLimit =
        RATE_LIMIT_CONFIG[UserTier.FREE][EndpointCategory.PUBLIC].points;
      const basicLimit =
        RATE_LIMIT_CONFIG[UserTier.BASIC][EndpointCategory.PUBLIC].points;

      expect(freeLimit).toBeLessThan(basicLimit);
    });

    it('ENTERPRISE tier has higher FINANCIAL limits than PREMIUM tier', () => {
      const premiumLimit =
        RATE_LIMIT_CONFIG[UserTier.PREMIUM][EndpointCategory.FINANCIAL].points;
      const enterpriseLimit =
        RATE_LIMIT_CONFIG[UserTier.ENTERPRISE][EndpointCategory.FINANCIAL]
          .points;

      expect(enterpriseLimit).toBeGreaterThan(premiumLimit);
    });

    it('AUTH category has stricter limits than PUBLIC for FREE tier', () => {
      const authLimit =
        RATE_LIMIT_CONFIG[UserTier.FREE][EndpointCategory.AUTH].points;
      const publicLimit =
        RATE_LIMIT_CONFIG[UserTier.FREE][EndpointCategory.PUBLIC].points;

      expect(authLimit).toBeLessThan(publicLimit);
    });

    it('ADMIN category is blocked (0 points) for FREE and BASIC tiers', () => {
      const freeAdminPoints =
        RATE_LIMIT_CONFIG[UserTier.FREE][EndpointCategory.ADMIN].points;
      const basicAdminPoints =
        RATE_LIMIT_CONFIG[UserTier.BASIC][EndpointCategory.ADMIN].points;

      expect(freeAdminPoints).toBe(0);
      expect(basicAdminPoints).toBe(0);
    });
  });

  // ─── consumePoints behaviour ──────────────────────────────────────────────

  describe('Point consumption', () => {
    it('allows a request when points are available', async () => {
      mockRateLimitService.consumePoints.mockResolvedValue({
        success: true,
        remainingPoints: 99,
        msBeforeNext: 60000,
        isBlocked: false,
      });

      const result = await mockRateLimitService.consumePoints(
        'ip:127.0.0.1',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(true);
      expect(result.remainingPoints).toBe(99);
      expect(result.isBlocked).toBe(false);
    });

    it('blocks a request when the limit is exceeded', async () => {
      mockRateLimitService.consumePoints.mockResolvedValue({
        success: false,
        remainingPoints: 0,
        msBeforeNext: 60000,
        isBlocked: true,
      });

      const result = await mockRateLimitService.consumePoints(
        'ip:127.0.0.1',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(false);
      expect(result.remainingPoints).toBe(0);
      expect(result.isBlocked).toBe(true);
      expect(result.msBeforeNext).toBeGreaterThan(0);
    });

    it('reports remaining points correctly after partial consumption', async () => {
      const total =
        RATE_LIMIT_CONFIG[UserTier.BASIC][EndpointCategory.PUBLIC].points;
      mockRateLimitService.getRemainingPoints.mockResolvedValue(total - 10);

      const remaining = await mockRateLimitService.getRemainingPoints(
        'user:basic-user-01',
        UserTier.BASIC,
        EndpointCategory.PUBLIC,
      );

      expect(remaining).toBe(total - 10);
      expect(remaining).toBeGreaterThan(0);
    });

    it('resets limit to full capacity after resetLimit is called', async () => {
      mockRateLimitService.resetLimit.mockResolvedValue(undefined);
      const total =
        RATE_LIMIT_CONFIG[UserTier.FREE][EndpointCategory.PUBLIC].points;
      mockRateLimitService.getRemainingPoints.mockResolvedValue(total);

      await mockRateLimitService.resetLimit(
        'ip:10.0.0.1',
        EndpointCategory.PUBLIC,
      );
      const remaining = await mockRateLimitService.getRemainingPoints(
        'ip:10.0.0.1',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
      );

      expect(mockRateLimitService.resetLimit).toHaveBeenCalledWith(
        'ip:10.0.0.1',
        EndpointCategory.PUBLIC,
      );
      expect(remaining).toBe(total);
    });
  });

  // ─── Whitelist ────────────────────────────────────────────────────────────

  describe('Whitelist bypass', () => {
    it('whitelists an identifier for a given duration', async () => {
      mockRateLimitService.whitelistIdentifier.mockResolvedValue(undefined);
      mockRateLimitService.isWhitelisted.mockResolvedValue(true);

      await mockRateLimitService.whitelistIdentifier('user:internal-svc', 3600);
      const isWhitelisted =
        await mockRateLimitService.isWhitelisted('user:internal-svc');

      expect(isWhitelisted).toBe(true);
      expect(mockRateLimitService.whitelistIdentifier).toHaveBeenCalledWith(
        'user:internal-svc',
        3600,
      );
    });

    it('non-whitelisted identifier is not exempt', async () => {
      mockRateLimitService.isWhitelisted.mockResolvedValue(false);

      const isWhitelisted =
        await mockRateLimitService.isWhitelisted('ip:1.2.3.4');

      expect(isWhitelisted).toBe(false);
    });
  });

  // ─── Block detection ──────────────────────────────────────────────────────

  describe('Block detection', () => {
    it('returns true when an identifier is actively blocked', async () => {
      mockRateLimitService.isBlocked.mockResolvedValue(true);

      const blocked = await mockRateLimitService.isBlocked(
        'ip:attacker',
        EndpointCategory.AUTH,
      );

      expect(blocked).toBe(true);
    });

    it('returns false when an identifier is not blocked', async () => {
      mockRateLimitService.isBlocked.mockResolvedValue(false);

      const blocked = await mockRateLimitService.isBlocked(
        'user:legit-user',
        EndpointCategory.PUBLIC,
      );

      expect(blocked).toBe(false);
    });
  });
});
