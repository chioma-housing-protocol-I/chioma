import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RateLimitService } from '../services/rate-limit.service';
import { UserTier, EndpointCategory } from '../types/rate-limit.types';

describe('RateLimitService', () => {
  let service: RateLimitService;
  let cacheManager: any;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    store: {
      ttl: jest.fn().mockResolvedValue(60),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

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
    cacheManager = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('consumePoints', () => {
    it('should allow request when under limit', async () => {
      mockCacheManager.get.mockResolvedValue(0);

      const result = await service.consumePoints(
        'user:123',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(true);
      expect(result.remainingPoints).toBe(99);
      expect(result.isBlocked).toBe(false);
    });

    it('should block request when over limit', async () => {
      mockCacheManager.get.mockResolvedValue(100);

      const result = await service.consumePoints(
        'user:123',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(false);
      expect(result.remainingPoints).toBe(0);
    });

    it('should block identifier when reaching admin endpoint limit', async () => {
      mockCacheManager.get.mockResolvedValue(0);

      const result = await service.consumePoints(
        'user:123',
        UserTier.FREE,
        EndpointCategory.ADMIN,
        1,
      );

      expect(result.success).toBe(false);
      expect(result.isBlocked).toBe(true);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('block'),
        true,
        expect.any(Number),
      );
    });

    it('should respect user tier limits', async () => {
      mockCacheManager.get.mockResolvedValue(0);

      const freeResult = await service.consumePoints(
        'user:free',
        UserTier.FREE,
        EndpointCategory.FINANCIAL,
        1,
      );

      const premiumResult = await service.consumePoints(
        'user:premium',
        UserTier.PREMIUM,
        EndpointCategory.FINANCIAL,
        1,
      );

      expect(freeResult.success).toBe(true);
      expect(premiumResult.success).toBe(true);
      expect(premiumResult.remainingPoints).toBeGreaterThan(
        freeResult.remainingPoints,
      );
    });

    it('should return blocked when identifier is blocked', async () => {
      mockCacheManager.get.mockImplementation((key) => {
        if (key.includes('block')) return Promise.resolve(true);
        return Promise.resolve(0);
      });

      const result = await service.consumePoints(
        'user:123',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(false);
      expect(result.isBlocked).toBe(true);
    });
  });

  describe('resetLimit', () => {
    it('should reset limit for identifier', async () => {
      await service.resetLimit('user:123', EndpointCategory.PUBLIC);

      expect(mockCacheManager.del).toHaveBeenCalledWith(
        expect.stringContaining('user:123'),
      );
      expect(mockCacheManager.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('whitelistIdentifier', () => {
    it('should whitelist an identifier', async () => {
      await service.whitelistIdentifier('user:123', 3600);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'rate_limit:whitelist:user:123',
        true,
        3600000,
      );
    });
  });

  describe('isWhitelisted', () => {
    it('should return true for whitelisted identifier', async () => {
      mockCacheManager.get.mockResolvedValue(true);

      const result = await service.isWhitelisted('user:123');

      expect(result).toBe(true);
    });

    it('should return false for non-whitelisted identifier', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.isWhitelisted('user:123');

      expect(result).toBe(false);
    });
  });

  describe('getRemainingPoints', () => {
    it('should return remaining points', async () => {
      mockCacheManager.get.mockResolvedValue(30);

      const remaining = await service.getRemainingPoints(
        'user:123',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
      );

      expect(remaining).toBe(70);
    });

    it('should return full limit when no consumption', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const remaining = await service.getRemainingPoints(
        'user:123',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
      );

      expect(remaining).toBe(100);
    });
  });

  describe('error handling', () => {
    it('should handle cache errors gracefully', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      const result = await service.consumePoints(
        'user:123',
        UserTier.FREE,
        EndpointCategory.PUBLIC,
        1,
      );

      expect(result.success).toBe(true);
    });
  });
});
