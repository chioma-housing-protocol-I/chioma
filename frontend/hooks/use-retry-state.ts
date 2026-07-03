'use client';

import { useSyncExternalStore, useCallback } from 'react';
import {
  globalRetryMetrics,
  globalCircuitBreaker,
  type RetryEvent,
  type RetryEndpointMetrics,
} from '@/lib/errors';
import type { CircuitBreakerState, CircuitBreakerMetrics } from '@/lib/errors';

export interface RetryState {
  isRetrying: boolean;
  currentEndpoint: string | null;
  currentAttempt: number;
  maxAttempts: number;
  endpointMetrics: Map<string, RetryEndpointMetrics>;
  circuitBreakerMetrics: Record<string, CircuitBreakerMetrics>;
}

function subscribeToRetryState(callback: () => void): () => void {
  const unsubMetrics = globalRetryMetrics.subscribe(() => {
    callback();
  });
  const unsubBreaker = globalCircuitBreaker.subscribe(() => {
    callback();
  });
  return () => {
    unsubMetrics();
    unsubBreaker();
  };
}

function buildRetryState(): RetryState {
  const allMetrics = globalRetryMetrics.getAllMetrics();
  const endpointMetrics = new Map<string, RetryEndpointMetrics>();
  let isRetrying = false;
  let currentEndpoint: string | null = null;
  let currentAttempt = 0;
  let maxAttempts = 0;

  for (const m of allMetrics) {
    endpointMetrics.set(m.endpoint, m);
    const lastAttemptTime = m.lastFailureAt ?? m.lastSuccessAt;
    if (
      m.totalAttempts > m.successes &&
      lastAttemptTime &&
      Date.now() - lastAttemptTime < 30_000
    ) {
      isRetrying = true;
      currentEndpoint = m.endpoint;
      currentAttempt = m.totalAttempts;
      maxAttempts = m.totalAttempts + m.totalRetries;
    }
  }

  return {
    isRetrying,
    currentEndpoint,
    currentAttempt,
    maxAttempts,
    endpointMetrics,
    circuitBreakerMetrics: globalCircuitBreaker.getMetrics(),
  };
}

let cachedRetryState: RetryState | null = null;

function getCachedSnapshot(): RetryState {
  if (!cachedRetryState) {
    cachedRetryState = buildRetryState();
  }
  return cachedRetryState;
}

function invalidateRetryStateCache() {
  cachedRetryState = null;
}

export function useRetryState(): RetryState {
  const subscribe = useCallback((cb: () => void) => {
    const unsubMetrics = globalRetryMetrics.subscribe(() => {
      invalidateRetryStateCache();
      cb();
    });
    const unsubBreaker = globalCircuitBreaker.subscribe(() => {
      invalidateRetryStateCache();
      cb();
    });
    return () => {
      unsubMetrics();
      unsubBreaker();
    };
  }, []);

  return useSyncExternalStore(subscribe, getCachedSnapshot, getCachedSnapshot);
}

const cachedEndpointMetrics: Map<string, RetryEndpointMetrics | null> = new Map();

export function useEndpointRetryMetrics(
  endpoint: string,
): RetryEndpointMetrics | null {
  const subscribe = useCallback(
    (cb: () => void) => {
      const unsub = globalRetryMetrics.subscribe((event: RetryEvent) => {
        if (event.endpoint === endpoint) {
          cachedEndpointMetrics.delete(endpoint);
          cb();
        }
      });
      return unsub;
    },
    [endpoint],
  );

  const getSnapshot = useCallback(() => {
    if (!cachedEndpointMetrics.has(endpoint)) {
      cachedEndpointMetrics.set(
        endpoint,
        globalRetryMetrics.getMetrics(endpoint) ?? null,
      );
    }
    return cachedEndpointMetrics.get(endpoint) ?? null;
  }, [endpoint]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

const cachedBreakerStates = new Map<string, CircuitBreakerState>();

export function useCircuitBreakerState(
  breakerName: string,
): CircuitBreakerState {
  const subscribe = useCallback(
    (cb: () => void) => {
      const unsub = globalCircuitBreaker.subscribe(() => {
        cachedBreakerStates.delete(breakerName);
        cb();
      });
      return unsub;
    },
    [breakerName],
  );

  const getSnapshot = useCallback(() => {
    if (!cachedBreakerStates.has(breakerName)) {
      cachedBreakerStates.set(
        breakerName,
        globalCircuitBreaker.getBreaker(breakerName).getState(),
      );
    }
    return cachedBreakerStates.get(breakerName)!;
  }, [breakerName]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
