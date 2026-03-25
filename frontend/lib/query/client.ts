/**
 * React Query client configuration.
 *
 * Centralizes cache timing, retry logic, and error handling so every
 * query/mutation in the app behaves consistently without per-hook config.
 */

import { QueryClient } from '@tanstack/react-query';
import { classifyUnknownError } from '@/lib/errors';

// ─── Defaults ────────────────────────────────────────────────────────────────

const STALE_TIME_MS = 30_000; // 30 s — data considered fresh
const GC_TIME_MS = 5 * 60_000; // 5 min — unused cache kept in memory
const MAX_RETRIES = 2;

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

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Creates a new QueryClient. Call once per app lifecycle and share via the
 * provider. Avoid creating inside a component render to prevent cache loss.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        gcTime: GC_TIME_MS,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
