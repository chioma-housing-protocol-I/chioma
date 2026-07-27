/**
 * Intent-based detail prefetch helpers.
 *
 * Deduplicates in-flight requests so hover storms on list UIs do not
 * trigger waterfall / duplicate network calls.
 */

import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from './keys';
import { resolveCacheTtl } from './cache-ttl';
import type { Property, Payment } from '@/types';

const inFlight = new Map<string, Promise<unknown>>();

function flightKey(queryKey: QueryKey): string {
  return JSON.stringify(queryKey);
}

async function prefetchOnce<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
): Promise<T | undefined> {
  const existing = queryClient.getQueryData(queryKey);
  if (existing !== undefined) {
    return existing as T;
  }

  const key = flightKey(queryKey);
  const pending = inFlight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const ttl = resolveCacheTtl(queryKey as readonly unknown[]);
  const promise = queryClient
    .prefetchQuery({
      queryKey,
      queryFn,
      staleTime: ttl.staleTime,
      gcTime: ttl.gcTime,
    })
    .then(() => queryClient.getQueryData<T>(queryKey))
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

/** Prefetch a property detail payload for faster navigation. */
export function prefetchPropertyDetail(
  queryClient: QueryClient,
  id: string,
): Promise<Property | undefined> {
  if (!id) return Promise.resolve(undefined);
  return prefetchOnce(
    queryClient,
    queryKeys.properties.detail(id),
    async () => {
      const { data } = await apiClient.get<Property>(`/properties/${id}`);
      return data;
    },
  );
}

/** Prefetch a payment detail payload. */
export function prefetchPaymentDetail(
  queryClient: QueryClient,
  id: string,
): Promise<Payment | undefined> {
  if (!id) return Promise.resolve(undefined);
  return prefetchOnce(queryClient, queryKeys.payments.detail(id), async () => {
    const { data } = await apiClient.get<Payment>(`/payments/${id}`);
    return data;
  });
}

/** Prefetch an agreement detail via the agreements API. */
export function prefetchAgreementDetail(
  queryClient: QueryClient,
  id: string,
): Promise<unknown> {
  if (!id) return Promise.resolve(undefined);
  return prefetchOnce(
    queryClient,
    queryKeys.agreements.detail(id),
    async () => {
      const { data } = await apiClient.get(`/agreements/${id}`);
      return data;
    },
  );
}

/** Prefetch a maintenance request detail. */
export function prefetchMaintenanceDetail(
  queryClient: QueryClient,
  id: string,
): Promise<unknown> {
  if (!id) return Promise.resolve(undefined);
  return prefetchOnce(
    queryClient,
    queryKeys.maintenance.detail(id),
    async () => {
      const { data } = await apiClient.get(`/maintenance/${id}`);
      return data;
    },
  );
}

export type PrefetchKind =
  | 'property'
  | 'payment'
  | 'agreement'
  | 'maintenance'
  | 'none';

/**
 * Dispatch detail prefetch by kind. Used by PrefetchLink on hover/focus.
 */
export function prefetchDetailByKind(
  queryClient: QueryClient,
  kind: PrefetchKind,
  id: string,
): Promise<unknown> {
  switch (kind) {
    case 'property':
      return prefetchPropertyDetail(queryClient, id);
    case 'payment':
      return prefetchPaymentDetail(queryClient, id);
    case 'agreement':
      return prefetchAgreementDetail(queryClient, id);
    case 'maintenance':
      return prefetchMaintenanceDetail(queryClient, id);
    case 'none':
    default:
      return Promise.resolve(undefined);
  }
}

/** Test helper — clear in-flight dedupe map. */
export function clearPrefetchInFlight(): void {
  inFlight.clear();
}

/** Test helper — count in-flight prefetches. */
export function getPrefetchInFlightCount(): number {
  return inFlight.size;
}
