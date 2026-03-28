'use client';

import { useCallback } from 'react';
import { useLoadingStore } from '@/store/loading-store';

// Re-import type-only for consumers extending the hook pattern.
export type { LoadingKey } from '@/store/loading-store';

/**
 * Scoped loading flag for a single key. Prefer stable keys (see `LOADING_KEYS`).
 * Show loading immediately when starting async work; clear in `finally`.
 */
export function useLoading(key: string) {
  const isLoading = useLoadingStore((s) => s.loading.get(key) ?? false);
  const setLoading = useLoadingStore((s) => s.setLoading);

  const set = useCallback(
    (value: boolean) => {
      setLoading(key, value);
    },
    [key, setLoading],
  );

  return { isLoading, setLoading: set };
}

/**
 * Imperative helper for try/finally around async operations (no hook).
 */
export async function withLoading<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  const { setLoading } = useLoadingStore.getState();
  setLoading(key, true);
  try {
    return await fn();
  } finally {
    setLoading(key, false);
  }
}
