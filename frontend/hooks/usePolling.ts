'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  /** Polling interval in milliseconds */
  intervalMs: number;
  /** Whether to start polling immediately (default: true) */
  enabled?: boolean;
  /** Whether to run the callback immediately on mount (default: true) */
  runOnMount?: boolean;
}

/**
 * Hook that polls a callback function at a fixed interval.
 * Automatically cleans up the interval on unmount.
 *
 * @example
 * ```tsx
 * usePolling({
 *   intervalMs: 30000,
 *   callback: () => fetchUnreadCount(),
 * });
 * ```
 */
export function usePolling(
  callback: () => void | Promise<void>,
  options: UsePollingOptions,
) {
  const { intervalMs, enabled = true, runOnMount = true } = options;
  const callbackRef = useRef(callback);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  callbackRef.current = callback;

  const stableCallback = useCallback(() => {
    callbackRef.current();
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (runOnMount) {
      stableCallback();
    }

    intervalRef.current = setInterval(stableCallback, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalMs, runOnMount, stableCallback]);
}

export default usePolling;
