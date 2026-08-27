'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseFetchOnMountOptions<T> {
  /** The async function to call on mount */
  fetcher: () => Promise<T>;
  /** Whether to fetch immediately (default: true) */
  enabled?: boolean;
  /** Dependencies that should trigger a re-fetch */
  deps?: unknown[];
}

interface UseFetchOnMountResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook that fetches data on mount and provides loading/error states.
 * Replaces the common pattern of manual useEffect + useState for data fetching.
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useFetchOnMount({
 *   fetcher: () => apiClient.get('/api-keys').then(r => r.data),
 * });
 * ```
 */
export function useFetchOnMount<T>({
  fetcher,
  enabled = true,
  deps = [],
}: UseFetchOnMountOptions<T>): UseFetchOnMountResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<Error | null>(null);
  const fetcherRef = useRef(fetcher);
  const mountedRef = useRef(true);

  fetcherRef.current = fetcher;

  const executeFetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcherRef.current();
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      executeFetch();
    } else {
      setIsLoading(false);
    }

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, executeFetch, ...deps]);

  return { data, isLoading, error, refetch: executeFetch };
}

export default useFetchOnMount;
