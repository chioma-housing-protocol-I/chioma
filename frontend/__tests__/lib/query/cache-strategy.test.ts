import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCacheInvalidation } from '@/lib/query/hooks/use-cache-strategy';
import {
  getCacheMetrics,
  getCacheHitRate,
  resetCacheMetrics,
  recordCacheHit,
  recordCacheMiss,
} from '@/lib/query/client';

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
      for (let i = 0; i < 80; i += 1) recordCacheHit();
      for (let i = 0; i < 20; i += 1) recordCacheMiss();
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
      const { result } = renderHook(() => useCacheInvalidation());
      const { invalidateProperties, invalidatePayments, invalidateAgreements } =
        result.current;

      expect(typeof invalidateProperties).toBe('function');
      expect(typeof invalidatePayments).toBe('function');
      expect(typeof invalidateAgreements).toBe('function');
    });
  });
});
