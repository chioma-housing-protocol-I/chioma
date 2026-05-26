import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';
import { CACHE_PREFIX_PROPERTIES_LIST } from './cache.constants';

describe('CacheService', () => {
  let service: CacheService;

  const mockDel = jest.fn();
  const mockStore = {
    keys: jest.fn().mockResolvedValue([`${CACHE_PREFIX_PROPERTIES_LIST}:abc`]),
  };
  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: mockDel,
    store: mockStore,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    jest.clearAllMocks();
    mockStore.keys.mockResolvedValue([`${CACHE_PREFIX_PROPERTIES_LIST}:abc`]);
  });

  describe('get / set', () => {
    it('increments hits when value is present', async () => {
      mockCacheManager.get.mockResolvedValue({ ok: true });

      const v = await service.get('k');
      expect(v).toEqual({ ok: true });
      expect(service.getStats().hits).toBe(1);
      expect(service.getStats().misses).toBe(0);
    });

    it('increments misses when value is absent', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      const v = await service.get('k');
      expect(v).toBeNull();
      expect(service.getStats().misses).toBe(1);
    });

    it('set registers dependencies and increments sets', async () => {
      await service.set('key1', { a: 1 }, 5000, ['property:p1']);

      expect(mockCacheManager.set).toHaveBeenCalledWith('key1', { a: 1 }, 5000);
      expect(service.getStats().sets).toBe(1);
    });
  });

  describe('getOrSet', () => {
    it('returns cached value without calling factory', async () => {
      mockCacheManager.get.mockResolvedValueOnce({ cached: true });

      const factory = jest.fn().mockResolvedValue({ fresh: true });
      const out = await service.getOrSet('k', factory, 1000);

      expect(out).toEqual({ cached: true });
      expect(factory).not.toHaveBeenCalled();
    });

    it('loads once when concurrent callers use the same key', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);
      const factory = jest
        .fn()
        .mockImplementation(
          () => new Promise((r) => setTimeout(() => r({ v: 1 }), 20)),
        );

      const [a, b] = await Promise.all([
        service.getOrSet('same', factory, 1000),
        service.getOrSet('same', factory, 1000),
      ]);

      expect(a).toEqual({ v: 1 });
      expect(b).toEqual({ v: 1 });
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidate', () => {
    it('deletes keys returned by store.keys for glob patterns', async () => {
      await service.invalidate(`${CACHE_PREFIX_PROPERTIES_LIST}:*`);

      expect(mockStore.keys).toHaveBeenCalledWith(
        `${CACHE_PREFIX_PROPERTIES_LIST}:*`,
      );
      expect(mockDel).toHaveBeenCalled();
    });
  });

  describe('invalidateDependencies', () => {
    it('deletes keys registered for matching dependency tags', async () => {
      await service.set('property:list:1', { a: 1 }, 5000, ['property:p1']);

      await service.invalidateDependencies(['property:p1']);

      expect(mockDel).toHaveBeenCalledWith('property:list:1');
      expect(service.getStats().dependencyTrackedKeys).toBe(0);
    });
  });

  describe('cleanupExpiredDependencies', () => {
    it('removes dependency metadata for expired cache entries', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);
      await service.set('expired-key', { a: 1 }, 1000, ['property:p2']);

      const cleaned = await service.cleanupExpiredDependencies(
        Date.now() + 2000,
      );

      expect(cleaned).toBe(1);
      expect(service.getStats().cleanups).toBe(1);
      expect(service.getStats().dependencyTrackedKeys).toBe(0);
    });

    it('keeps dependency metadata when the backing cache still has a value', async () => {
      mockCacheManager.get.mockResolvedValue({ a: 1 });
      await service.set('live-key', { a: 1 }, 1000, ['property:p3']);

      const cleaned = await service.cleanupExpiredDependencies(
        Date.now() + 2000,
      );

      expect(cleaned).toBe(0);
      expect(service.getStats().dependencyTrackedKeys).toBe(1);
    });
  });

  describe('invalidatePropertyDomainCaches', () => {
    it('invalidates list, search, suggest, and optional property key', async () => {
      const inv = jest
        .spyOn(service, 'invalidate')
        .mockResolvedValue(undefined);

      await service.invalidatePropertyDomainCaches('pid');

      expect(inv).toHaveBeenCalledWith(`${CACHE_PREFIX_PROPERTIES_LIST}:*`);
      expect(inv).toHaveBeenCalledWith('search:properties:*');
      expect(inv).toHaveBeenCalledWith('suggest:*');
      expect(inv).toHaveBeenCalledWith('property:pid');

      inv.mockRestore();
    });
  });

  describe('getStats', () => {
    it('computes hit and miss rates', async () => {
      mockCacheManager.get.mockResolvedValueOnce(1);
      mockCacheManager.get.mockResolvedValueOnce(undefined);

      await service.get('a');
      await service.get('b');

      const s = service.getStats();
      expect(s.hitRate).toBeCloseTo(0.5);
      expect(s.missRate).toBeCloseTo(0.5);
    });
  });
});
