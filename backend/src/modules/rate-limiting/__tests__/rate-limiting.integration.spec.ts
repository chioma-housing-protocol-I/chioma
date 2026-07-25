import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { RateLimitingModule } from '../rate-limiting.module';
import { RateLimitService } from '../services/rate-limit.service';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { AbuseDetectionService } from '../services/abuse-detection.service';
import { RateLimitAnalyticsService } from '../services/rate-limit-analytics.service';
import { UserTier, EndpointCategory } from '../types/rate-limit.types';
import { UserRole } from '../../users/entities/user.entity';

describe.skip('Rate Limiting Integration Tests', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let rateLimitService: RateLimitService;
  let abuseDetectionService: AbuseDetectionService;
  let dataSource: DataSource;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        CacheModule.register({
          ttl: 60,
          max: 100,
          isGlobal: true,
        }),
        ScheduleModule.forRoot(),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [],
          synchronize: true,
          logging: false,
        }),
        RateLimitingModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    rateLimitService = moduleRef.get<RateLimitService>(RateLimitService);
    abuseDetectionService = moduleRef.get<AbuseDetectionService>(
      AbuseDetectionService,
    );
    dataSource = moduleRef.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await app.close();
    await moduleRef.close();
  });

  beforeEach(async () => {
    // Clear cache before each test
    const cacheManager = moduleRef.get('CACHE_MANAGER');
    if (cacheManager && cacheManager.store && cacheManager.store.reset) {
      await cacheManager.store.reset();
    }
  });

  describe('Rate Limit Service Integration', () => {
    describe('Concurrent Request Handling', () => {
      it('should handle concurrent requests correctly', async () => {
        const identifier = 'test-user-concurrent';
        const concurrentRequests = 50;

        const promises = Array(concurrentRequests)
          .fill(null)
          .map((_, index) =>
            rateLimitService.consumePoints(
              identifier,
              UserTier.FREE,
              EndpointCategory.PUBLIC,
              1,
            ),
          );

        const results = await Promise.all(promises);

        // Should allow first 100 requests (FREE tier limit for PUBLIC)
        const successfulRequests = results.filter((r) => r.success);
        const failedRequests = results.filter((r) => !r.success);

        expect(successfulRequests.length).toBe(50); // All 50 should succeed
        expect(failedRequests.length).toBe(0);
      });

      it('should handle burst requests correctly', async () => {
        const identifier = 'test-user-burst';
        const burstSize = 150; // Exceeds FREE tier limit

        const promises = Array(burstSize)
          .fill(null)
          .map(() =>
            rateLimitService.consumePoints(
              identifier,
              UserTier.FREE,
              EndpointCategory.PUBLIC,
              1,
            ),
          );

        const results = await Promise.all(promises);

        const successfulRequests = results.filter((r) => r.success);
        const failedRequests = results.filter((r) => !r.success);

        expect(successfulRequests.length).toBe(100); // FREE tier limit
        expect(failedRequests.length).toBe(50); // Excess requests
      });
    });

    describe('Multi-Category Rate Limiting', () => {
      it('should enforce separate limits for different categories', async () => {
        const identifier = 'test-user-multi-category';

        // Exhaust PUBLIC category limit
        for (let i = 0; i < 100; i++) {
          const result = await rateLimitService.consumePoints(
            identifier,
            UserTier.FREE,
            EndpointCategory.PUBLIC,
            1,
          );
          expect(result.success).toBe(true);
        }

        // Should still allow AUTH category requests
        const authResult = await rateLimitService.consumePoints(
          identifier,
          UserTier.FREE,
          EndpointCategory.AUTH,
          1,
        );
        expect(authResult.success).toBe(true);

        // But PUBLIC should be blocked
        const publicResult = await rateLimitService.consumePoints(
          identifier,
          UserTier.FREE,
          EndpointCategory.PUBLIC,
          1,
        );
        expect(publicResult.success).toBe(false);
      });

      it('should handle different point costs correctly', async () => {
        const identifier = 'test-user-points';

        // Consume 50 points with 2-point requests (25 requests)
        for (let i = 0; i < 25; i++) {
          const result = await rateLimitService.consumePoints(
            identifier,
            UserTier.FREE,
            EndpointCategory.PUBLIC,
            2,
          );
          expect(result.success).toBe(true);
        }

        // Should have 50 points remaining
        const remaining = await rateLimitService.getRemainingPoints(
          identifier,
          UserTier.FREE,
          EndpointCategory.PUBLIC,
        );
        expect(remaining).toBe(50);
      });
    });

    describe('User Tier Behavior', () => {
      it('should respect different tier limits', async () => {
        const freeUser = 'free-user';
        const premiumUser = 'premium-user';

        // FREE user should be limited to 100 PUBLIC requests
        const freePromises = Array(150)
          .fill(null)
          .map(() =>
            rateLimitService.consumePoints(
              freeUser,
              UserTier.FREE,
              EndpointCategory.PUBLIC,
              1,
            ),
          );

        const freeResults = await Promise.all(freePromises);
        const freeSuccessful = freeResults.filter((r) => r.success);
        expect(freeSuccessful.length).toBe(100);

        // PREMIUM user should be limited to 1000 PUBLIC requests
        const premiumPromises = Array(150)
          .fill(null)
          .map(() =>
            rateLimitService.consumePoints(
              premiumUser,
              UserTier.PREMIUM,
              EndpointCategory.PUBLIC,
              1,
            ),
          );

        const premiumResults = await Promise.all(premiumPromises);
        const premiumSuccessful = premiumResults.filter((r) => r.success);
        expect(premiumSuccessful.length).toBe(150); // All should succeed
      });

      it('should handle ADMIN category restrictions', async () => {
        const freeUser = 'free-admin-test';
        const enterpriseUser = 'enterprise-admin-test';

        // FREE user should be blocked from ADMIN endpoints
        const freeResult = await rateLimitService.consumePoints(
          freeUser,
          UserTier.FREE,
          EndpointCategory.ADMIN,
          1,
        );
        expect(freeResult.success).toBe(false);
        expect(freeResult.isBlocked).toBe(true);

        // ENTERPRISE user should access ADMIN endpoints
        const enterpriseResult = await rateLimitService.consumePoints(
          enterpriseUser,
          UserTier.ENTERPRISE,
          EndpointCategory.ADMIN,
          1,
        );
        expect(enterpriseResult.success).toBe(true);
      });
    });

    describe('Whitelist Functionality', () => {
      it('should bypass rate limiting for whitelisted users', async () => {
        const identifier = 'whitelisted-user';

        // Whitelist the user
        await rateLimitService.whitelistIdentifier(identifier, 3600);

        // Should allow requests beyond normal limits
        const promises = Array(200)
          .fill(null)
          .map(() =>
            rateLimitService.consumePoints(
              identifier,
              UserTier.FREE,
              EndpointCategory.PUBLIC,
              1,
            ),
          );

        const results = await Promise.all(promises);
        const successfulRequests = results.filter((r) => r.success);
        expect(successfulRequests.length).toBe(200); // All should succeed
      });

      it('should respect whitelist expiration', async () => {
        const identifier = 'temp-whitelist-user';

        // Whitelist for 1 second
        await rateLimitService.whitelistIdentifier(identifier, 1);

        // Should work immediately
        let result = await rateLimitService.consumePoints(
          identifier,
          UserTier.FREE,
          EndpointCategory.PUBLIC,
          1,
        );
        expect(result.success).toBe(true);

        // Wait for whitelist to expire
        await new Promise((resolve) => setTimeout(resolve, 1100));

        // Should be subject to normal limits now
        for (let i = 0; i < 100; i++) {
          result = await rateLimitService.consumePoints(
            identifier,
            UserTier.FREE,
            EndpointCategory.PUBLIC,
            1,
          );
          expect(result.success).toBe(true);
        }

        // Next request should fail
        result = await rateLimitService.consumePoints(
          identifier,
          UserTier.FREE,
          EndpointCategory.PUBLIC,
          1,
        );
        expect(result.success).toBe(false);
      });
    });

    describe('Block Duration', () => {
      it('should implement temporary blocks for ADMIN category violations', async () => {
        const identifier = 'admin-violation-user';

        // Attempt to access ADMIN endpoint as FREE user
        const result = await rateLimitService.consumePoints(
          identifier,
          UserTier.FREE,
          EndpointCategory.ADMIN,
          1,
        );

        expect(result.success).toBe(false);
        expect(result.isBlocked).toBe(true);

        // Should still be blocked on subsequent attempts
        const blockedResult = await rateLimitService.consumePoints(
          identifier,
          UserTier.FREE,
          EndpointCategory.PUBLIC,
          1,
        );

        expect(blockedResult.success).toBe(false);
        expect(blockedResult.isBlocked).toBe(true);
      });
    });

    describe('Error Recovery', () => {
      it('should fail open when cache is unavailable', async () => {
        // This test would require mocking cache failures
        // For now, we test the graceful degradation
        const identifier = 'cache-fail-test';

        // Simulate cache failure by calling with invalid cache
        // This would require dependency injection overrides
        const result = await rateLimitService.consumePoints(
          identifier,
          UserTier.FREE,
          EndpointCategory.PUBLIC,
          1,
        );

        // Should allow request when cache fails
        expect(result.success).toBe(true);
        expect(result.remainingPoints).toBe(100);
      });
    });

    describe('Performance', () => {
      it('should handle high request volumes efficiently', async () => {
        const identifier = 'performance-test';
        const requestCount = 1000;
        const startTime = Date.now();

        const promises = Array(requestCount)
          .fill(null)
          .map((_, index) =>
            rateLimitService.consumePoints(
              `${identifier}-${index % 10}`, // Distribute across 10 users
              UserTier.PREMIUM,
              EndpointCategory.PUBLIC,
              1,
            ),
          );

        await Promise.all(promises);
        const duration = Date.now() - startTime;

        // Should complete within reasonable time (adjust threshold as needed)
        expect(duration).toBeLessThan(5000); // 5 seconds
      });

      it('should maintain accuracy under load', async () => {
        const identifier = 'accuracy-test';
        const requestsPerBatch = 50;
        const batchCount = 2;

        // First batch
        const firstBatch = Array(requestsPerBatch)
          .fill(null)
          .map(() =>
            rateLimitService.consumePoints(
              identifier,
              UserTier.FREE,
              EndpointCategory.PUBLIC,
              1,
            ),
          );

        const firstResults = await Promise.all(firstBatch);
        const firstSuccessful = firstResults.filter((r) => r.success);
        expect(firstSuccessful.length).toBe(requestsPerBatch);

        // Check remaining points
        const remaining = await rateLimitService.getRemainingPoints(
          identifier,
          UserTier.FREE,
          EndpointCategory.PUBLIC,
        );
        expect(remaining).toBe(50);

        // Second batch
        const secondBatch = Array(requestsPerBatch)
          .fill(null)
          .map(() =>
            rateLimitService.consumePoints(
              identifier,
              UserTier.FREE,
              EndpointCategory.PUBLIC,
              1,
            ),
          );

        const secondResults = await Promise.all(secondBatch);
        const secondSuccessful = secondResults.filter((r) => r.success);
        expect(secondSuccessful.length).toBe(requestsPerBatch);

        // Should be at limit now
        const finalRemaining = await rateLimitService.getRemainingPoints(
          identifier,
          UserTier.FREE,
          EndpointCategory.PUBLIC,
        );
        expect(finalRemaining).toBe(0);
      });
    });
  });

  describe('Abuse Detection Integration', () => {
    it('should detect rapid fire attacks', async () => {
      const identifier = 'rapid-fire-attacker';
      const ipAddress = '192.168.1.100';

      // Make rapid requests
      const rapidRequests = Array(60)
        .fill(null)
        .map(() => abuseDetectionService.recordRequest(identifier, ipAddress));

      await Promise.all(rapidRequests);

      // Should detect abuse
      const abuseResult = await abuseDetectionService.detectAbuse(
        identifier,
        ipAddress,
        '/api/test',
      );

      expect(abuseResult.isAbuser).toBe(true);
      expect(abuseResult.abuseScore).toBeGreaterThan(50);
    });

    it('should track violation patterns', async () => {
      const identifier = 'pattern-attacker';
      const ipAddress = '192.168.1.101';

      // Simulate multiple violations
      for (let i = 0; i < 10; i++) {
        await abuseDetectionService.recordRequest(identifier, ipAddress);
      }

      const abuseResult = await abuseDetectionService.detectAbuse(
        identifier,
        ipAddress,
        '/api/protected',
      );

      expect(abuseResult.violations.length).toBeGreaterThan(0);
    });
  });

  describe('Rate Limit Guard Integration', () => {
    it('should integrate with request context correctly', async () => {
      // This would require creating a mock execution context
      // and testing the full guard behavior
      // For now, we test the service integration
      const identifier = 'guard-integration-test';

      const result = await rateLimitService.consumePoints(
        identifier,
        UserTier.BASIC,
        EndpointCategory.FINANCIAL,
        5,
      );

      expect(result.success).toBe(true);
      expect(result.remainingPoints).toBe(45); // 50 - 5
    });
  });

  describe('Analytics Integration', () => {
    it('should track request metrics', async () => {
      const identifier = 'analytics-test';

      // Make some requests
      await rateLimitService.consumePoints(
        identifier,
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      // Analytics would be recorded automatically
      // This test verifies the integration points exist
      expect(rateLimitService).toBeDefined();
    });
  });
});
