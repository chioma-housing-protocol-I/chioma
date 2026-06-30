import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCacheStrategy, useCacheInvalidation } from '@/lib/query/hooks/use-cache-strategy';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { getCacheMetrics, getCacheHitRate, resetCacheMetrics } from '@/lib/query/client';

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(),
  QueryClient: vi.fn(),
}));

describe('Cache Strategy', () => {
  let mockQueryClient: any;

  beforeEach(() => {
    mockQueryClient = {
      invalidateQueries: vi.fn(),
      clear: vi.fn(),
      prefetchQuery: vi.fn(),
      getQueryCache: vi.fn(() => ({
        getAll: vi.fn(() => []),
      })),
    };
    vi.clearAllMocks();
    resetCacheMetrics();
  });

  describe('getCacheMetrics', () => {
    it('should return cache metrics', () => {
      const metrics = getCacheMetrics();
      expect(metrics).toHaveProperty('hits');
      expect(metrics).toHaveProperty('misses');
      expect(metrics).toHaveProperty('evictions');
      expect(metrics).toHaveProperty('size');
    });
  });

  describe('getCacheHitRate', () => {
    it('should return 0 when no cache activity', () => {
      const hitRate = getCacheHitRate();
      expect(hitRate).toBe(0);
    });

    it('should calculate hit rate correctly', () => {
      // Simulate cache hits and misses
      const metrics = getCacheMetrics();
      (metrics as any).hits = 80;
      (metrics as any).misses = 20;
      const hitRate = getCacheHitRate();
      expect(hitRate).toBe(80);
    });
  });

  describe('resetCacheMetrics', () => {
    it('should reset all metrics to zero', () => {
      const metrics = getCacheMetrics();
      (metrics as any).hits = 100;
      (metrics as any).misses = 50;
      (metrics as any).evictions = 10;
      (metrics as any).size = 25;

      resetCacheMetrics();
      const resetMetrics = getCacheMetrics();
      expect(resetMetrics.hits).toBe(0);
      expect(resetMetrics.misses).toBe(0);
      expect(resetMetrics.evictions).toBe(0);
      expect(resetMetrics.size).toBe(0);
    });
  });

  describe('useCacheInvalidation', () => {
    it('should provide invalidation methods for different entities', () => {
      const { invalidateProperties, invalidatePayments, invalidateAgreements } =
        useCacheInvalidation();

      expect(typeof invalidateProperties).toBe('function');
      expect(typeof invalidatePayments).toBe('function');
      expect(typeof invalidateAgreements).toBe('function');
    });
  });
});
