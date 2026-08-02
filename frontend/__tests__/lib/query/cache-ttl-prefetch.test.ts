import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  queryCacheTtl,
  resolveCacheTtl,
  getDomainCacheTtl,
} from '@/lib/query/cache-ttl';
import { queryKeys } from '@/lib/query/keys';
import {
  clearPrefetchInFlight,
  getPrefetchInFlightCount,
  prefetchPropertyDetail,
} from '@/lib/query/prefetch';
import { QueryClient } from '@tanstack/react-query';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import { apiClient } from '@/lib/api-client';

describe('queryCacheTtl', () => {
  it('exposes aligned TTLs for query key domains', () => {
    expect(queryCacheTtl.properties.staleTime).toBe(60_000);
    expect(queryCacheTtl.notifications.staleTime).toBe(15_000);
    expect(queryCacheTtl.agreements.staleTime).toBe(
      getDomainCacheTtl('agreements').staleTime,
    );
  });

  it('resolves TTL from a properties detail query key', () => {
    const ttl = resolveCacheTtl(queryKeys.properties.detail('p-1'));
    expect(ttl).toEqual(queryCacheTtl.properties);
  });

  it('resolves TTL from hyphenated payment-methods keys', () => {
    const ttl = resolveCacheTtl(queryKeys.paymentMethods.all);
    expect(ttl).toEqual(queryCacheTtl.paymentMethods);
  });

  it('falls back to default for unknown roots', () => {
    expect(resolveCacheTtl(['unknown-domain', 'x'])).toEqual(
      queryCacheTtl.default,
    );
  });
});

describe('prefetchPropertyDetail', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    clearPrefetchInFlight();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
    clearPrefetchInFlight();
  });

  it('dedupes concurrent prefetch calls for the same id', async () => {
    let resolveGet!: (value: unknown) => void;
    const getPromise = new Promise((resolve) => {
      resolveGet = resolve;
    });
    vi.mocked(apiClient.get).mockReturnValue(getPromise as never);

    const a = prefetchPropertyDetail(queryClient, 'prop-1');
    const b = prefetchPropertyDetail(queryClient, 'prop-1');

    expect(getPrefetchInFlightCount()).toBe(1);
    expect(apiClient.get).toHaveBeenCalledTimes(1);

    resolveGet({ data: { id: 'prop-1', title: 'Loft' } });
    await Promise.all([a, b]);

    expect(
      queryClient.getQueryData(queryKeys.properties.detail('prop-1')),
    ).toEqual({
      id: 'prop-1',
      title: 'Loft',
    });
  });

  it('skips network when cache already has the detail', async () => {
    queryClient.setQueryData(queryKeys.properties.detail('cached'), {
      id: 'cached',
    });
    await prefetchPropertyDetail(queryClient, 'cached');
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
