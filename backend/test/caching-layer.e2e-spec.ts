import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheService } from '../src/common/cache/cache.service';
import {
  CACHE_PREFIX_PROPERTIES_LIST,
  CACHE_PREFIX_PROPERTY,
  CACHE_PREFIX_SEARCH_PROPERTIES,
  CACHE_PREFIX_SUGGEST,
} from '../src/common/cache/cache.constants';

describe('Caching Layer Integration', () => {
  let service: CacheService;

  const mockStore = {
    keys: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
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
    service.resetStats();
  });

  describe('Cache key generation and get/set', () => {
    it('stores a value under the given key', async () => {
      await service.set('key:1', { data: 'value' }, 5000);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'key:1',
        { data: 'value' },
        5000,
      );
    });

    it('returns a cached value on get hit', async () => {
      mockCacheManager.get.mockResolvedValue({ data: 'value' });

      const result = await service.get<{ data: string }>('key:1');

      expect(result).toEqual({ data: 'value' });
    });

    it('returns null on cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.get('missing-key');

      expect(result).toBeNull();
    });

    it('registers dependency tags when set with dependencies', async () => {
      await service.set('property:p1', { name: 'Test' }, 3000, [
        'property-list',
      ]);

      const stats = service.getStats();
      expect(stats.dependencyTrackedKeys).toBe(1);
    });
  });

  describe('Cache hit and miss tracking', () => {
    it('increments hits counter on cache hit', async () => {
      mockCacheManager.get.mockResolvedValue({ ok: true });

      await service.get('key:1');
      await service.get('key:2');

      expect(service.getStats().hits).toBe(2);
      expect(service.getStats().misses).toBe(0);
    });

    it('increments misses counter on cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      await service.get('missing');

      expect(service.getStats().misses).toBe(1);
      expect(service.getStats().hits).toBe(0);
    });

    it('computes hitRate and missRate as ratios', async () => {
      mockCacheManager.get
        .mockResolvedValueOnce({ v: 1 })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ v: 2 })
        .mockResolvedValueOnce({ v: 3 });

      await service.get('a');
      await service.get('b');
      await service.get('c');
      await service.get('d');

      const stats = service.getStats();
      expect(stats.hitRate).toBeCloseTo(0.75, 2);
      expect(stats.missRate).toBeCloseTo(0.25, 2);
    });

    it('returns zero rates when no operations have been performed', () => {
      const stats = service.getStats();

      expect(stats.hitRate).toBe(0);
      expect(stats.missRate).toBe(0);
    });
  });

  describe('getOrSet (single-flight)', () => {
    it('calls factory and caches the result on miss', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);
      const factory = jest.fn().mockResolvedValue({ fresh: true });

      const result = await service.getOrSet('key:1', factory, 5000);

      expect(result).toEqual({ fresh: true });
      expect(factory).toHaveBeenCalledTimes(1);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'key:1',
        { fresh: true },
        5000,
      );
    });

    it('returns cached value without calling factory on hit', async () => {
      mockCacheManager.get.mockResolvedValue({ cached: true });
      const factory = jest.fn();

      const result = await service.getOrSet('key:1', factory, 5000);

      expect(result).toEqual({ cached: true });
      expect(factory).not.toHaveBeenCalled();
    });

    it('deduplicates concurrent requests for the same key (single-flight)', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);
      const factory = jest
        .fn()
        .mockImplementation(
          () => new Promise((r) => setTimeout(() => r({ loaded: true }), 20)),
        );

      const [a, b, c] = await Promise.all([
        service.getOrSet('shared', factory, 1000),
        service.getOrSet('shared', factory, 1000),
        service.getOrSet('shared', factory, 1000),
      ]);

      expect(a).toEqual({ loaded: true });
      expect(b).toEqual({ loaded: true });
      expect(c).toEqual({ loaded: true });
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache invalidation triggers', () => {
    it('deletes an exact key when no wildcard is present', async () => {
      await service.invalidate('property:p1');

      expect(mockCacheManager.del).toHaveBeenCalledWith('property:p1');
    });

    it('deletes keys returned by the store for a glob pattern', async () => {
      mockStore.keys.mockResolvedValue([
        'search:properties:q1',
        'search:properties:q2',
      ]);

      await service.invalidate(`${CACHE_PREFIX_SEARCH_PROPERTIES}:*`);

      expect(mockCacheManager.del).toHaveBeenCalledWith('search:properties:q1');
      expect(mockCacheManager.del).toHaveBeenCalledWith('search:properties:q2');
    });

    it('invalidates keys registered under a dependency tag', async () => {
      mockStore.keys.mockResolvedValue([]);
      await service.set('tagged-key', { v: 1 }, 3000, ['dep:tag1']);

      await service.invalidate('dep:tag1');

      expect(mockCacheManager.del).toHaveBeenCalledWith('tagged-key');
    });

    it('increments evictions counter for each deleted key', async () => {
      mockStore.keys.mockResolvedValue(['k1', 'k2', 'k3']);

      await service.invalidate('k*');

      expect(service.getStats().evictions).toBe(3);
    });
  });

  describe('TTL management', () => {
    it('passes custom TTL to the cache manager', async () => {
      const TTL_MS = 120_000;
      await service.set('ttl-key', { v: 1 }, TTL_MS);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'ttl-key',
        { v: 1 },
        TTL_MS,
      );
    });

    it('passes undefined TTL when not specified', async () => {
      await service.set('no-ttl', { v: 1 });

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'no-ttl',
        { v: 1 },
        undefined,
      );
    });
  });

  describe('Property domain cache invalidation', () => {
    it('invalidateAll clears all four property-domain prefixes', async () => {
      mockStore.keys.mockResolvedValue([]);

      await service.invalidateAll();

      const deletedPatterns = mockCacheManager.del.mock.calls.map(
        ([k]: [string]) => k,
      );
      const prefixes = [
        CACHE_PREFIX_PROPERTIES_LIST,
        CACHE_PREFIX_SEARCH_PROPERTIES,
        CACHE_PREFIX_SUGGEST,
        CACHE_PREFIX_PROPERTY,
      ];
      prefixes.forEach((prefix) => {
        expect(deletedPatterns.some((p: string) => p.startsWith(prefix))).toBe(
          true,
        );
      });
    });

    it('invalidatePropertyDomainCaches includes the specific property key when id is supplied', async () => {
      mockStore.keys.mockResolvedValue([]);

      await service.invalidatePropertyDomainCaches('prop-999');

      expect(mockCacheManager.del).toHaveBeenCalledWith(
        `${CACHE_PREFIX_PROPERTY}:prop-999`,
      );
    });

    it('invalidatePropertyDomainCaches skips property-specific key when no id supplied', async () => {
      mockStore.keys.mockResolvedValue([]);

      await service.invalidatePropertyDomainCaches();

      const calls = mockCacheManager.del.mock.calls.map(([k]: [string]) => k);
      expect(
        calls.every((k) => !k.startsWith(`${CACHE_PREFIX_PROPERTY}:`)),
      ).toBe(true);
    });
  });

  describe('Stats reset', () => {
    it('resets all counters to zero', async () => {
      mockCacheManager.get.mockResolvedValue({ v: 1 });
      await service.get('k');
      await service.set('k', 1, 1000);

      service.resetStats();

      const stats = service.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
      expect(stats.evictions).toBe(0);
    });
  });
});
