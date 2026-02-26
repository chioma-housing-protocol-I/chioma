import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AbuseDetectionService } from '../services/abuse-detection.service';

describe('AbuseDetectionService', () => {
  let service: AbuseDetectionService;
  let cacheManager: any;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AbuseDetectionService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<AbuseDetectionService>(AbuseDetectionService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectAbuse', () => {
    it('should not detect abuse for normal usage', async () => {
      mockCacheManager.get.mockResolvedValue({
        requestCount: 10,
        failedAuthAttempts: 0,
        violations: [],
        firstSeen: Date.now() - 60000,
        lastSeen: Date.now(),
        ipAddresses: ['192.168.1.1'],
      });

      const result = await service.detectAbuse('user:123', '192.168.1.1', '/api/users');

      expect(result.isAbuser).toBe(false);
      expect(result.abuseScore).toBeLessThan(100);
    });

    it('should detect abuse for excessive failed auth attempts', async () => {
      mockCacheManager.get.mockResolvedValue({
        requestCount: 20,
        failedAuthAttempts: 15,
        violations: ['Excessive failed auth attempts'],
        firstSeen: Date.now() - 60000,
        lastSeen: Date.now(),
        ipAddresses: ['192.168.1.1'],
      });

      const result = await service.detectAbuse('user:123', '192.168.1.1', '/api/auth');

      expect(result.isAbuser).toBe(true);
      expect(result.abuseScore).toBeGreaterThanOrEqual(100);
      expect(result.blockUntil).toBeDefined();
    });

    it('should detect abuse for rapid IP switching', async () => {
      const manyIps = Array.from({ length: 25 }, (_, i) => `192.168.1.${i}`);
      mockCacheManager.get.mockResolvedValue({
        requestCount: 100,
        failedAuthAttempts: 0,
        violations: [],
        firstSeen: Date.now() - 60000,
        lastSeen: Date.now(),
        ipAddresses: manyIps,
      });

      const result = await service.detectAbuse('user:123', '192.168.1.25', '/api/users');

      expect(result.abuseScore).toBeGreaterThan(50);
    });

    it('should increase score for admin path access', async () => {
      mockCacheManager.get.mockResolvedValue({
        requestCount: 50,
        failedAuthAttempts: 0,
        violations: [],
        firstSeen: Date.now() - 60000,
        lastSeen: Date.now(),
        ipAddresses: ['192.168.1.1'],
      });

      const adminResult = await service.detectAbuse('user:123', '192.168.1.1', '/api/admin/users');
      const normalResult = await service.detectAbuse('user:456', '192.168.1.2', '/api/users');

      expect(adminResult.abuseScore).toBeGreaterThan(normalResult.abuseScore);
    });
  });

  describe('recordRequest', () => {
    it('should record request details', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      await service.recordRequest('user:123', '192.168.1.1');

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'abuse:record:user:123',
        expect.objectContaining({
          requestCount: 1,
          ipAddresses: ['192.168.1.1'],
        }),
        expect.any(Number),
      );
    });

    it('should increment request count', async () => {
      mockCacheManager.get.mockResolvedValue({
        requestCount: 5,
        failedAuthAttempts: 0,
        violations: [],
        firstSeen: Date.now() - 60000,
        lastSeen: Date.now() - 1000,
        ipAddresses: ['192.168.1.1'],
      });

      await service.recordRequest('user:123', '192.168.1.1');

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'abuse:record:user:123',
        expect.objectContaining({
          requestCount: 6,
        }),
        expect.any(Number),
      );
    });
  });

  describe('recordFailedAuth', () => {
    it('should record failed authentication attempt', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      await service.recordFailedAuth('user:123');

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'abuse:record:user:123',
        expect.objectContaining({
          failedAuthAttempts: 1,
        }),
        expect.any(Number),
      );
    });

    it('should add violation when threshold exceeded', async () => {
      mockCacheManager.get.mockResolvedValue({
        requestCount: 10,
        failedAuthAttempts: 9,
        violations: [],
        firstSeen: Date.now() - 60000,
        lastSeen: Date.now(),
        ipAddresses: ['192.168.1.1'],
      });

      await service.recordFailedAuth('user:123');

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'abuse:record:user:123',
        expect.objectContaining({
          failedAuthAttempts: 10,
          violations: expect.arrayContaining([
            expect.stringContaining('Excessive failed auth attempts'),
          ]),
        }),
        expect.any(Number),
      );
    });
  });

  describe('isBlocked', () => {
    it('should return true for blocked identifier', async () => {
      mockCacheManager.get.mockResolvedValue(true);

      const result = await service.isBlocked('user:123');

      expect(result).toBe(true);
    });

    it('should return false for non-blocked identifier', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.isBlocked('user:123');

      expect(result).toBe(false);
    });
  });

  describe('unblockIdentifier', () => {
    it('should unblock an identifier', async () => {
      await service.unblockIdentifier('user:123');

      expect(mockCacheManager.del).toHaveBeenCalledWith('abuse:block:user:123');
    });
  });

  describe('getAbuseScore', () => {
    it('should calculate and return abuse score', async () => {
      mockCacheManager.get.mockResolvedValue({
        requestCount: 30,
        failedAuthAttempts: 5,
        violations: ['Test violation'],
        firstSeen: Date.now() - 60000,
        lastSeen: Date.now(),
        ipAddresses: ['192.168.1.1', '192.168.1.2'],
      });

      const score = await service.getAbuseScore('user:123');

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
