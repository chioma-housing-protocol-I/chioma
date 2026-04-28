import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RateLimitService } from '../services/rate-limit.service';
import { UserTier, EndpointCategory } from '../types/rate-limit.types';

describe('Rate Limiting Edge Cases', () => {
  let service: RateLimitService;
  let mockCacheManager: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      store: {
        ttl: jest.fn().mockResolvedValue(60),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);
  });

  describe('Boundary Conditions', () => {
    it('should handle exactly at limit requests', async () => {
      mockCacheManager.get.mockResolvedValue(99); // 99 consumed out of 100

      const result = await service.consumePoints(
        'boundary-test',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(true);
      expect(result.remainingPoints).toBe(0);
    });

    it('should handle exactly one over limit', async () => {
      mockCacheManager.get.mockResolvedValue(100); // 100 consumed out of 100

      const result = await service.consumePoints(
        'boundary-test',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(false);
      expect(result.remainingPoints).toBe(0);
    });

    it('should handle zero point requests', async () => {
      mockCacheManager.get.mockResolvedValue(50);

      const result = await service.consumePoints(
        'zero-points-test',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        0,
      );

      expect(result.success).toBe(true);
      expect(result.remainingPoints).toBe(50);
    });

    it('should handle negative point requests', async () => {
      mockCacheManager.get.mockResolvedValue(50);

      const result = await service.consumePoints(
        'negative-points-test',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        -1,
      );

      expect(result.success).toBe(true);
      // Should effectively add points back
      expect(result.remainingPoints).toBe(51);
    });

    it('should handle very large point requests', async () => {
      mockCacheManager.get.mockResolvedValue(0);

      const result = await service.consumePoints(
        'large-points-test',
        UserTier.ENTERPRISE,
        EndpointCategory.PUBLIC,
        20000, // Exceeds even ENTERPRISE limit
      );

      expect(result.success).toBe(false);
      expect(result.remainingPoints).toBe(0);
    });
  });

  describe('Cache Failure Scenarios', () => {
    it('should handle cache get failure', async () => {
      mockCacheManager.get.mockRejectedValue(
        new Error('Cache connection failed'),
      );

      const result = await service.consumePoints(
        'cache-fail-test',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(true); // Fail open
      expect(result.remainingPoints).toBe(100);
    });

    it('should handle cache set failure', async () => {
      mockCacheManager.get.mockResolvedValue(50);
      mockCacheManager.set.mockRejectedValue(new Error('Cache write failed'));

      const result = await service.consumePoints(
        'cache-write-fail-test',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(true); // Should still succeed
    });

    it('should handle cache delete failure', async () => {
      mockCacheManager.del.mockRejectedValue(new Error('Cache delete failed'));

      await expect(
        service.resetLimit('reset-fail-test', EndpointCategory.PUBLIC),
      ).resolves.not.toThrow();
    });

    it('should handle TTL retrieval failure', async () => {
      mockCacheManager.get.mockImplementation((key) => {
        if (key.includes('block')) return Promise.resolve(true);
        return Promise.resolve(50);
      });
      mockCacheManager.store.ttl.mockRejectedValue(
        new Error('TTL lookup failed'),
      );

      const result = await service.consumePoints(
        'ttl-fail-test',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(false);
      expect(result.isBlocked).toBe(true);
      expect(result.msBeforeNext).toBe(60000); // Default 60 seconds
    });
  });

  describe('Identifier Edge Cases', () => {
    it('should handle very long identifiers', async () => {
      const longIdentifier = 'a'.repeat(1000);
      mockCacheManager.get.mockResolvedValue(0);

      const result = await service.consumePoints(
        longIdentifier,
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(true);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining(longIdentifier),
        expect.any(Number),
        expect.any(Number),
      );
    });

    it('should handle special characters in identifiers', async () => {
      const specialIdentifier = 'user:123/\\@#$%^&*()_+-=[]{}|;:,.<>?';
      mockCacheManager.get.mockResolvedValue(0);

      const result = await service.consumePoints(
        specialIdentifier,
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(true);
    });

    it('should handle empty string identifier', async () => {
      mockCacheManager.get.mockResolvedValue(0);

      const result = await service.consumePoints(
        '',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(true);
    });

    it('should handle null/undefined identifier gracefully', async () => {
      mockCacheManager.get.mockResolvedValue(0);

      const result1 = await service.consumePoints(
        null as any,
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      const result2 = await service.consumePoints(
        undefined as any,
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('Concurrent Edge Cases', () => {
    it('should handle race conditions in consumePoints', async () => {
      mockCacheManager.get.mockResolvedValue(0);

      // Simulate concurrent requests that might race
      const promises = Array(10)
        .fill(null)
        .map(async (_, index) => {
          // Simulate some delay to increase race condition likelihood
          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 10),
          );
          return service.consumePoints(
            'race-condition-test',
            UserTier.FREE,
            EndpointCategory.PUBLIC,
            1,
          );
        });

      const results = await Promise.all(promises);

      // All should succeed due to fail-open nature
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle concurrent reset operations', async () => {
      const identifier = 'concurrent-reset-test';

      const resetPromises = Array(5)
        .fill(null)
        .map(() => service.resetLimit(identifier, EndpointCategory.PUBLIC));

      await expect(Promise.all(resetPromises)).resolves.not.toThrow();
      expect(mockCacheManager.del).toHaveBeenCalledTimes(10); // 5 resets * 2 keys each
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle large numbers of tracked violations', async () => {
      const identifier = 'many-violations-test';
      const violations = Array(1000)
        .fill(null)
        .map((_, index) => ({
          category: EndpointCategory.PUBLIC,
          timestamp: Date.now() - index * 1000,
        }));

      mockCacheManager.get.mockImplementation((key) => {
        if (key.includes('violations')) {
          return Promise.resolve(violations);
        }
        return Promise.resolve(0);
      });

      const result = await service.consumePoints(
        identifier,
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(true);
      // Should handle large violation arrays without issues
    });

    it('should handle rapid successive operations', async () => {
      const identifier = 'rapid-ops-test';
      mockCacheManager.get.mockResolvedValue(0);

      const startTime = Date.now();

      // Perform many operations rapidly
      for (let i = 0; i < 100; i++) {
        await service.consumePoints(
          identifier,
          UserTier.FREE,
          EndpointCategory.PUBLIC,
          1,
        );
      }

      const duration = Date.now() - startTime;

      // Should complete quickly (adjust threshold as needed)
      expect(duration).toBeLessThan(1000); // 1 second
    });
  });

  describe('Data Type Edge Cases', () => {
    it('should handle non-numeric cached values gracefully', async () => {
      mockCacheManager.get.mockResolvedValue('invalid');

      const result = await service.consumePoints(
        'invalid-cache-test',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(true);
      expect(result.remainingPoints).toBe(99); // Should treat as 0 + 1 consumed
    });

    it('should handle null cached values', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.consumePoints(
        'null-cache-test',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(true);
      expect(result.remainingPoints).toBe(99);
    });

    it('should handle undefined cached values', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.consumePoints(
        'undefined-cache-test',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(true);
      expect(result.remainingPoints).toBe(99);
    });
  });

  describe('Whitelist Edge Cases', () => {
    it('should handle whitelist operations during cache failures', async () => {
      mockCacheManager.set.mockRejectedValue(new Error('Cache failed'));

      await expect(
        service.whitelistIdentifier('whitelist-fail-test', 3600),
      ).resolves.not.toThrow();

      // Should return false when cache fails
      const isWhitelisted = await service.isWhitelisted('whitelist-fail-test');
      expect(isWhitelisted).toBe(false);
    });

    it('should handle zero duration whitelist', async () => {
      await service.whitelistIdentifier('zero-duration-test', 0);

      const isWhitelisted = await service.isWhitelisted('zero-duration-test');
      expect(isWhitelisted).toBe(true);
    });

    it('should handle negative duration whitelist', async () => {
      await service.whitelistIdentifier('negative-duration-test', -1);

      const isWhitelisted = await service.isWhitelisted(
        'negative-duration-test',
      );
      expect(isWhitelisted).toBe(true);
    });
  });

  describe('Block Duration Edge Cases', () => {
    it('should handle immediate block status checks', async () => {
      const identifier = 'immediate-block-test';

      // Simulate a blocked state
      mockCacheManager.get.mockImplementation((key) => {
        if (key.includes('block')) return Promise.resolve(true);
        return Promise.resolve(0);
      });

      const result = await service.consumePoints(
        identifier,
        UserTier.FREE,
        EndpointCategory.ADMIN,
        1,
      );

      expect(result.success).toBe(false);
      expect(result.isBlocked).toBe(true);
    });

    it('should handle block status with expired TTL', async () => {
      const identifier = 'expired-block-test';

      mockCacheManager.get.mockImplementation((key) => {
        if (key.includes('block')) return Promise.resolve(true);
        return Promise.resolve(0);
      });
      mockCacheManager.store.ttl.mockResolvedValue(-1); // Expired

      const result = await service.consumePoints(
        identifier,
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(false);
      expect(result.isBlocked).toBe(true);
      expect(result.msBeforeNext).toBe(60000); // Default fallback
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle unknown user tiers gracefully', async () => {
      mockCacheManager.get.mockResolvedValue(0);

      const result = await service.consumePoints(
        'unknown-tier-test',
        'UNKNOWN_TIER' as UserTier,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(true);
      // Should not crash and handle gracefully
    });

    it('should handle unknown endpoint categories gracefully', async () => {
      mockCacheManager.get.mockResolvedValue(0);

      const result = await service.consumePoints(
        'unknown-category-test',
        UserTier.FREE,
        'UNKNOWN_CATEGORY' as EndpointCategory,
        1,
      );

      expect(result.success).toBe(true);
      // Should not crash and handle gracefully
    });
  });
});
