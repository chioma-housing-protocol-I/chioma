/**
 * React Query client configuration.
 *
 * Centralizes cache timing, retry logic, and error handling so every
 * query/mutation in the app behaves consistently without per-hook config.
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { classifyUnknownError } from '@/lib/errors';
import { useErrorStore } from '@/store/errorStore';

// ─── Cache Monitoring ───────────────────────────────────────────────────────

interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

const cacheMetrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  evictions: 0,
  size: 0,
};

export function getCacheMetrics(): CacheMetrics {
  return { ...cacheMetrics };
}

export function resetCacheMetrics(): void {
  cacheMetrics.hits = 0;
  cacheMetrics.misses = 0;
  cacheMetrics.evictions = 0;
  cacheMetrics.size = 0;
}

export function getCacheHitRate(): number {
  const total = cacheMetrics.hits + cacheMetrics.misses;
  if (total === 0) return 0;
  return (cacheMetrics.hits / total) * 100;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const STALE_TIME_MS = 30_000; // 30 s — data considered fresh
const GC_TIME_MS = 5 * 60_000; // 5 min — unused cache kept in memory
const MAX_RETRIES = 2;
const MAX_CACHE_SIZE = 100; // Maximum number of queries to cache

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;

  const classified = classifyUnknownError(error, {
    source: 'lib/query/client.ts',
    action: 'retry-check',
  });

  if (classified.category === 'authentication') return false;
  if (classified.category === 'permission') return false;
  if (classified.category === 'validation') return false;

  return true;
}

// ─── Cache Size Management ───────────────────────────────────────────────────

function manageCacheSize(queryCache: QueryCache): void {
  const queries = queryCache.getAll();
  cacheMetrics.size = queries.length;

  if (queries.length > MAX_CACHE_SIZE) {
    // Evict oldest queries that are not currently active
    const inactiveQueries = queries
      .filter((query: any) => !query.state.isFetching)
      .sort((a: any, b: any) => a.state.dataUpdatedAt - b.state.dataUpdatedAt);

    const toRemove = inactiveQueries.slice(0, queries.length - MAX_CACHE_SIZE);
    toRemove.forEach((query: any) => {
      queryCache.remove(query.queryKey);
      cacheMetrics.evictions++;
    });
    
    cacheMetrics.size = queryCache.getAll().length;
  }
}

function handleGlobalError(error: unknown, source: string, action?: string) {
  const appError = classifyUnknownError(error, {
    source,
    action,
  });

  let category: 'validation' | 'api' | 'network' | 'authentication' | 'authorization' | 'server' | 'unknown' = 'unknown';
  if (appError.category === 'network') category = 'network';
  else if (appError.category === 'validation') category = 'validation';
  else if (appError.category === 'authentication') category = 'authentication';
  else if (appError.category === 'permission') category = 'authorization';
  else if (appError.category === 'system') category = 'server';
  else if (appError.category === 'business') category = 'api';

  useErrorStore.getState().addError({
    message: appError.userMessage,
    category,
    severity: appError.severity,
    autoDismissMs: appError.severity === 'critical' ? undefined : 5000,
    cause: appError.cause,
  });
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Creates a new QueryClient. Call once per app lifecycle and share via the
 * provider. Avoid creating inside a component render to prevent cache loss.
 */
export function createQueryClient(): QueryClient {
  const queryCache = new QueryCache({
    onError: (error: any, query: any) => {
      if (query.meta?.disableGlobalError) return;
      handleGlobalError(error, 'QueryCache', query.queryKey.join(' / '));
    },
    onSuccess: () => {
      cacheMetrics.hits++;
    },
  });

  const mutationCache = new MutationCache({
    onError: (error: any, variables: any, context: any, mutation: any) => {
      if (mutation.meta?.disableGlobalError) return;
      handleGlobalError(error, 'MutationCache');
    },
  });

  return new QueryClient({
    queryCache,
    mutationCache,
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        gcTime: GC_TIME_MS,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retryOnMount: false,
        refetchInterval: false,
        cacheTime: GC_TIME_MS,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
