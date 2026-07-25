'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '../keys';
import { getCacheMetrics, getCacheHitRate, resetCacheMetrics } from '../client';

export interface CacheStrategyConfig {
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
}

export function useCacheStrategy() {
  const queryClient = useQueryClient();

  const invalidateCache = useCallback(
    (keyFactory: (...args: any[]) => readonly any[], ...args: any[]) => {
      queryClient.invalidateQueries({ queryKey: keyFactory(...args) });
    },
    [queryClient],
  );

  const invalidateAllCache = useCallback(() => {
    queryClient.clear();
  }, [queryClient]);

  const prefetchQuery = useCallback(
    (
      keyFactory: (...args: any[]) => readonly any[],
      queryFn: () => Promise<any>,
      ...args: any[]
    ) => {
      queryClient.prefetchQuery({
        queryKey: keyFactory(...args),
        queryFn,
      });
    },
    [queryClient],
  );

  const warmCache = useCallback(
    async (
      queries: Array<{ key: readonly any[]; queryFn: () => Promise<any> }>,
    ) => {
      await Promise.all(
        queries.map(({ key, queryFn }) =>
          queryClient.prefetchQuery({
            queryKey: key,
            queryFn,
          }),
        ),
      );
    },
    [queryClient],
  );

  const getCacheInfo = useCallback(() => {
    return {
      metrics: getCacheMetrics(),
      hitRate: getCacheHitRate(),
      size: queryClient.getQueryCache().getAll().length,
    };
  }, [queryClient]);

  const resetMetrics = useCallback(() => {
    resetCacheMetrics();
  }, []);

  return {
    invalidateCache,
    invalidateAllCache,
    prefetchQuery,
    warmCache,
    getCacheInfo,
    resetMetrics,
    queryClient,
  };
}

export function useCacheInvalidation() {
  const { invalidateCache } = useCacheStrategy();

  return {
    invalidateProperties: (id?: string) =>
      invalidateCache(
        id ? queryKeys.properties.detail : queryKeys.properties.lists,
        id,
      ),
    invalidatePayments: (id?: string) =>
      invalidateCache(
        id ? queryKeys.payments.detail : queryKeys.payments.lists,
        id,
      ),
    invalidateAgreements: (id?: string) =>
      invalidateCache(
        id ? queryKeys.agreements.detail : queryKeys.agreements.lists,
        id,
      ),
    invalidateNotifications: () =>
      invalidateCache(queryKeys.notifications.list),
    invalidateFavorites: (propertyId?: string) =>
      invalidateCache(
        propertyId ? queryKeys.favorites.status : queryKeys.favorites.list,
        propertyId,
      ),
    invalidateMaintenance: (id?: string) =>
      invalidateCache(
        id ? queryKeys.maintenance.detail : queryKeys.maintenance.lists,
        id,
      ),
    invalidateAnalytics: (days?: number) =>
      invalidateCache(queryKeys.analytics.landlordOverview, days ?? 30),
  };
}
