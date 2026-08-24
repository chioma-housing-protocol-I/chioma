'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '../keys';
import { getCacheMetrics, getCacheHitRate, resetCacheMetrics } from '../client';
import { resolveCacheTtl } from '../cache-ttl';

export interface CacheStrategyConfig {
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
}

export function useCacheStrategy() {
  const queryClient = useQueryClient();

  const invalidateCache = useCallback(
    <TArgs extends unknown[]>(
      keyFactory: (...args: TArgs) => readonly unknown[],
      ...args: TArgs
    ) => {
      queryClient.invalidateQueries({ queryKey: keyFactory(...args) });
    },
    [queryClient],
  );

  const invalidateAllCache = useCallback(() => {
    queryClient.clear();
  }, [queryClient]);

  const prefetchQuery = useCallback(
    <TArgs extends unknown[], TData>(
      keyFactory: (...args: TArgs) => readonly unknown[],
      queryFn: () => Promise<TData>,
      ...args: TArgs
    ) => {
      const queryKey = keyFactory(...args);
      const ttl = resolveCacheTtl(queryKey);
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: ttl.staleTime,
        gcTime: ttl.gcTime,
      });
    },
    [queryClient],
  );

  const warmCache = useCallback(
    async (
      queries: Array<{ key: readonly any[]; queryFn: () => Promise<any> }>,
    ) => {
      await Promise.all(
        queries.map(({ key, queryFn }) => {
          const ttl = resolveCacheTtl(key);
          return queryClient.prefetchQuery({
            queryKey: key,
            queryFn,
            staleTime: ttl.staleTime,
            gcTime: ttl.gcTime,
          });
        }),
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
