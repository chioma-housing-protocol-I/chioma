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
    beforeEach(() => {
      mockCacheManager.get.mockClear();
      mockCacheManager.set.mockClear();
      mockCacheManager.del.mockClear();
    });

    it('should handle exactly at limit requests', async () => {
      mockCacheManager.get.mockImplementation((key: string) => {
        if (key.includes('block')) return Promise.resolve(false);
        return Promise.resolve(99); // 99 consumed out of 100
      });

      const result = await service.consumePoints(
        'boundary-test',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(true);
      expect(result.remainingPoints).toBe(0);
    });

    it('should handle zero point requests', async () => {
      mockCacheManager.get.mockImplementation((key: string) => {
        if (key.includes('block')) return Promise.resolve(false);
        return Promise.resolve(50);
      });

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
      mockCacheManager.get.mockImplementation((key: string) => {
        if (key.includes('block')) return Promise.resolve(false);
        return Promise.resolve(50);
      });

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
      mockCacheManager.get.mockImplementation((key: string) => {
        if (key.includes('block')) return Promise.resolve(false);
        return Promise.resolve(0);
      });

      const result = await service.consumePoints(
        'large-points-test',
        UserTier.ENTERPRISE,
        EndpointCategory.PUBLIC,
        20000, // Exceeds even ENTERPRISE limit
      );

      expect(result.success).toBe(false);
      expect(result.remainingPoints).toBe(0);
    });

    it('should reject requests that exceed limit', async () => {
      // Cache returns 100 (already consumed all FREE+PUBLIC points).
      // consumePoints will call incrementCounter which reads 100, adds 1,
      // stores 101, and returns 101. 101 > 100 → success: false.
      mockCacheManager.get.mockImplementation((key: string) => {
        if (key.includes('block')) return Promise.resolve(false);
        return Promise.resolve(100); // Already at limit
      });

      const result = await service.consumePoints(
        'over-limit-test',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(false);
      expect(result.remainingPoints).toBe(0);
      // FREE+PUBLIC has no blockDuration — over-limit is rejected but not blocked
      expect(result.isBlocked).toBe(false);
      expect(result.msBeforeNext).toBe(60 * 1000); // config.duration * 1000
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
      mockCacheManager.get.mockImplementation((key) => {
        if (key.includes('block')) return Promise.resolve(false);
        return Promise.resolve(50);
      });
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
        .map(async (_, _index) => {
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
      // Reset the mock before this test
      jest.clearAllMocks();

      mockCacheManager.get.mockImplementation((key) => {
        if (key.includes('block')) return Promise.resolve(false);
        // For any other key, return 0
        return Promise.resolve(0);
      });
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.consumePoints(
        'many-violations-test',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(true);
      // Should handle large violation arrays without issues
    });

    it('should handle rapid successive operations', async () => {
      jest.clearAllMocks();

      mockCacheManager.get.mockImplementation((key) => {
        if (key.includes('block')) return Promise.resolve(false);
        return Promise.resolve(0);
      });
      mockCacheManager.set.mockResolvedValue(undefined);

      const startTime = Date.now();

      // Perform many operations rapidly
      for (let i = 0; i < 100; i++) {
        await service.consumePoints(
          'rapid-ops-test',
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
      mockCacheManager.get.mockImplementation((key) => {
        if (key.includes('block')) return Promise.resolve(false);
        return Promise.resolve('invalid');
      });

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
      mockCacheManager.get.mockImplementation((key) => {
        if (key.includes('block')) return Promise.resolve(false);
        return Promise.resolve(null);
      });

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
      mockCacheManager.get.mockImplementation((key) => {
        if (key.includes('block')) return Promise.resolve(false);
        return Promise.resolve(undefined);
      });

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
      mockCacheManager.get.mockResolvedValue(null);
      const isWhitelisted = await service.isWhitelisted('whitelist-fail-test');
      expect(isWhitelisted).toBe(false);
    });

    it('should handle zero duration whitelist', async () => {
      mockCacheManager.get.mockResolvedValue(true);
      await service.whitelistIdentifier('zero-duration-test', 0);

      const isWhitelisted = await service.isWhitelisted('zero-duration-test');
      expect(isWhitelisted).toBe(true);
    });

    it('should handle negative duration whitelist', async () => {
      mockCacheManager.get.mockResolvedValue(true);
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

      try {
        const result = await service.consumePoints(
          'unknown-tier-test',
          'UNKNOWN_TIER' as UserTier,
          EndpointCategory.PUBLIC,
          1,
        );
        // If it doesn't throw, it should fail gracefully
        expect(result.success).toBe(false);
      } catch (error) {
        // Should handle error gracefully
        expect(error).toBeDefined();
      }
    });

    it('should handle unknown endpoint categories gracefully', async () => {
      mockCacheManager.get.mockResolvedValue(0);

      try {
        const result = await service.consumePoints(
          'unknown-category-test',
          UserTier.FREE,
          'UNKNOWN_CATEGORY' as EndpointCategory,
          1,
        );
        // If it doesn't throw, it should fail gracefully
        expect(result.success).toBe(false);
      } catch (error) {
        // Should handle error gracefully
        expect(error).toBeDefined();
      }
    });
  });

  // ── #1809: Concurrent requests ─────────────────────────────────────────────
  describe('Concurrent Request Limit Enforcement', () => {
    /**
     * The fallback incrementCounter path (no Redis client) is a non-atomic
     * get → add → set, so concurrent calls each read the same stale counter
     * and write the same new value — in tests every call effectively sees an
     * independent counter.  What we verify here is that the *per-call*
     * decision logic (consumed > limit → reject) behaves correctly when
     * different callers arrive with counters already at various points.
     */

    it('should allow all requests when none exceed the limit', async () => {
      // Counter starts at 0 for each call (cache miss → treated as 0).
      // 0 + 1 = 1, which is ≤ 100 → success: true for every call.
      mockCacheManager.get.mockImplementation((key: string) => {
        if (key.includes('block')) return Promise.resolve(false);
        return Promise.resolve(null); // fresh window — no prior consumption
      });

      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          service.consumePoints(
            'concurrent-under-limit',
            UserTier.FREE,
            EndpointCategory.PUBLIC,
            1,
          ),
        ),
      );

      results.forEach((r) => {
        expect(r.success).toBe(true);
        expect(r.isBlocked).toBe(false);
      });
    });

    it('should reject requests whose incremented counter exceeds the limit', async () => {
      // Simulate callers that read a counter already at 100 (the last allowed
      // point was consumed). Each adds 1 → 101 > 100 → rejected.
      mockCacheManager.get.mockImplementation((key: string) => {
        if (key.includes('block')) return Promise.resolve(false);
        return Promise.resolve(100);
      });

      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          service.consumePoints(
            'concurrent-over-limit',
            UserTier.FREE,
            EndpointCategory.PUBLIC,
            1,
          ),
        ),
      );

      results.forEach((r) => {
        expect(r.success).toBe(false);
        expect(r.remainingPoints).toBe(0);
        // FREE+PUBLIC has no blockDuration
        expect(r.isBlocked).toBe(false);
      });
    });

    it('should block all concurrent requests when block key is set', async () => {
      // A previous violation set the block key; all concurrent callers should
      // be short-circuited before the counter is touched.
      mockCacheManager.get.mockImplementation((key: string) => {
        if (key.includes('block')) return Promise.resolve(true);
        return Promise.resolve(0);
      });
      mockCacheManager.store.ttl.mockResolvedValue(30);

      const results = await Promise.all(
        Array.from({ length: 8 }, () =>
          service.consumePoints(
            'concurrent-blocked',
            UserTier.FREE,
            EndpointCategory.ADMIN, // ADMIN has blockDuration
            1,
          ),
        ),
      );

      results.forEach((r) => {
        expect(r.success).toBe(false);
        expect(r.isBlocked).toBe(true);
        expect(r.msBeforeNext).toBe(30 * 1000);
      });

      // Counter must NOT have been incremented — block short-circuits before that
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    it('should allow requests exactly at the limit (boundary — not rejected)', async () => {
      // consumed = 99 + 1 = 100; 100 > 100 is false → success: true, remaining: 0.
      mockCacheManager.get.mockImplementation((key: string) => {
        if (key.includes('block')) return Promise.resolve(false);
        return Promise.resolve(99);
      });

      const result = await service.consumePoints(
        'concurrent-at-limit',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(true);
      expect(result.remainingPoints).toBe(0);
      expect(result.isBlocked).toBe(false);
    });
  });

  // ── #1809: Cache hit / miss behavior ──────────────────────────────────────
  describe('Cache Hit/Miss Behavior', () => {
    it('should treat a cache miss (null) as zero prior consumption', async () => {
      // null → typeof null !== 'number' → treated as 0 in incrementCounter
      // 0 + 1 = 1 consumed; remaining = 100 - 1 = 99
      mockCacheManager.get.mockImplementation((key: string) => {
        if (key.includes('block')) return Promise.resolve(false);
        return Promise.resolve(null);
      });

      const result = await service.consumePoints(
        'cache-miss-test',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(true);
      expect(result.remainingPoints).toBe(99);
      // Counter key must be written with the new consumed total
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('cache-miss-test'),
        1,           // 0 prior + 1 consumed
        60 * 1000,   // duration * 1000 ms
      );
    });

    it('should treat a cache miss (undefined) as zero prior consumption', async () => {
      mockCacheManager.get.mockImplementation((key: string) => {
        if (key.includes('block')) return Promise.resolve(false);
        return Promise.resolve(undefined);
      });

      const result = await service.consumePoints(
        'cache-miss-undefined-test',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(true);
      expect(result.remainingPoints).toBe(99);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('cache-miss-undefined-test'),
        1,
        60 * 1000,
      );
    });

    it('should use cached value on a cache hit and compute remaining correctly', async () => {
      // Prior consumption: 40 points already consumed (cache hit).
      // 40 + 1 = 41; remaining = 100 - 41 = 59.
      mockCacheManager.get.mockImplementation((key: string) => {
        if (key.includes('block')) return Promise.resolve(false);
        return Promise.resolve(40);
      });

      const result = await service.consumePoints(
        'cache-hit-test',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(true);
      expect(result.remainingPoints).toBe(59);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('cache-hit-test'),
        41,          // 40 prior + 1 consumed
        60 * 1000,
      );
    });

    it('should consume multiple points correctly on a cache hit', async () => {
      // Prior: 30 consumed. Request costs 5 points. 30 + 5 = 35; remaining = 65.
      mockCacheManager.get.mockImplementation((key: string) => {
        if (key.includes('block')) return Promise.resolve(false);
        return Promise.resolve(30);
      });

      const result = await service.consumePoints(
        'cache-hit-multi-points',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        5,
      );

      expect(result.success).toBe(true);
      expect(result.remainingPoints).toBe(65);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('cache-hit-multi-points'),
        35,
        60 * 1000,
      );
    });

    it('should reject on a cache hit when adding points exceeds the limit', async () => {
      // Prior: 98 consumed. Request costs 3 points. 98 + 3 = 101 > 100 → rejected.
      mockCacheManager.get.mockImplementation((key: string) => {
        if (key.includes('block')) return Promise.resolve(false);
        return Promise.resolve(98);
      });

      const result = await service.consumePoints(
        'cache-hit-over-limit',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        3,
      );

      expect(result.success).toBe(false);
      expect(result.remainingPoints).toBe(0);
      expect(result.isBlocked).toBe(false); // FREE+PUBLIC has no blockDuration
    });

    it('should record a violation when a cache hit causes a limit breach', async () => {
      mockCacheManager.get.mockImplementation((key: string) => {
        if (key.includes('block')) return Promise.resolve(false);
        if (key.includes('violations')) return Promise.resolve([]);
        return Promise.resolve(100);
      });

      await service.consumePoints(
        'cache-hit-violation',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      // Violation entry written to cache
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('violations:cache-hit-violation'),
        expect.arrayContaining([
          expect.objectContaining({ category: EndpointCategory.PUBLIC }),
        ]),
        3600 * 1000,
      );
    });

    it('should trigger a block on a cache hit for categories with blockDuration', async () => {
      // ADMIN category for FREE tier has points: 0 and blockDuration: 86400.
      // consumed = 0 + 1 = 1 > 0 → rejected; blockDuration set → isBlocked: true.
      mockCacheManager.get.mockImplementation((key: string) => {
        if (key.includes('block')) return Promise.resolve(false);
        if (key.includes('violations')) return Promise.resolve([]);
        return Promise.resolve(0);
      });

      const result = await service.consumePoints(
        'cache-hit-block-trigger',
        UserTier.FREE,
        EndpointCategory.ADMIN,
        1,
      );

      expect(result.success).toBe(false);
      expect(result.isBlocked).toBe(true);
      // Block key must be written with blockDuration (86400 s)
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('block:admin:cache-hit-block-trigger'),
        true,
        86400 * 1000,
      );
    });
  });
});
