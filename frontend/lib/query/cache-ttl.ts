/**
 * Per-domain React Query cache TTLs aligned with `queryKeys`.
 *
 * Keep staleTime / gcTime here so hooks, prefetch, and the QueryClient
 * share one source of truth and avoid mismatched freshness windows.
 */

export type QueryDomain =
  | 'properties'
  | 'payments'
  | 'paymentMethods'
  | 'agreements'
  | 'notifications'
  | 'favorites'
  | 'maintenance'
  | 'user'
  | 'audit'
  | 'transactions'
  | 'anchorTransactions'
  | 'indexedTransactions'
  | 'users'
  | 'roles'
  | 'kyc'
  | 'security'
  | 'analytics'
  | 'search'
  | 'documents'
  | 'stellarAccounts'
  | 'default';

export interface CacheTtl {
  /** Milliseconds until cached data is considered stale. */
  staleTime: number;
  /** Milliseconds unused cache entries are retained (gcTime). */
  gcTime: number;
}

const MINUTE = 60_000;

/**
 * Domain TTL map. Hot detail routes use longer stale windows so hover
 * prefetch pays off; volatile domains (notifications, inquiries) stay short.
 */
export const queryCacheTtl: Record<QueryDomain, CacheTtl> = {
  default: { staleTime: 30_000, gcTime: 5 * MINUTE },
  properties: { staleTime: 60_000, gcTime: 10 * MINUTE },
  payments: { staleTime: 30_000, gcTime: 5 * MINUTE },
  paymentMethods: { staleTime: 60_000, gcTime: 10 * MINUTE },
  agreements: { staleTime: 60_000, gcTime: 10 * MINUTE },
  notifications: { staleTime: 15_000, gcTime: 5 * MINUTE },
  favorites: { staleTime: 30_000, gcTime: 5 * MINUTE },
  maintenance: { staleTime: 30_000, gcTime: 5 * MINUTE },
  user: { staleTime: 60_000, gcTime: 10 * MINUTE },
  audit: { staleTime: 30_000, gcTime: 5 * MINUTE },
  transactions: { staleTime: 30_000, gcTime: 5 * MINUTE },
  anchorTransactions: { staleTime: 30_000, gcTime: 5 * MINUTE },
  indexedTransactions: { staleTime: 30_000, gcTime: 5 * MINUTE },
  users: { staleTime: 60_000, gcTime: 10 * MINUTE },
  roles: { staleTime: 5 * MINUTE, gcTime: 15 * MINUTE },
  kyc: { staleTime: 30_000, gcTime: 5 * MINUTE },
  security: { staleTime: 15_000, gcTime: 5 * MINUTE },
  analytics: { staleTime: 60_000, gcTime: 10 * MINUTE },
  search: { staleTime: 20_000, gcTime: 5 * MINUTE },
  documents: { staleTime: 60_000, gcTime: 10 * MINUTE },
  stellarAccounts: { staleTime: 30_000, gcTime: 5 * MINUTE },
};

/**
 * Resolve TTL for a query key by matching its root segment to a domain.
 * Falls back to `default` when the root is unknown.
 */
export function resolveCacheTtl(queryKey: readonly unknown[]): CacheTtl {
  const root = queryKey[0];
  if (typeof root !== 'string') {
    return queryCacheTtl.default;
  }

  const normalized = root.replace(/-/g, '') as string;

  const aliases: Record<string, QueryDomain> = {
    properties: 'properties',
    payments: 'payments',
    paymentschedules: 'payments',
    paymentmethods: 'paymentMethods',
    agreements: 'agreements',
    notifications: 'notifications',
    favorites: 'favorites',
    maintenance: 'maintenance',
    user: 'user',
    audit: 'audit',
    transactions: 'transactions',
    anchortransactions: 'anchorTransactions',
    indexedtransactions: 'indexedTransactions',
    users: 'users',
    roles: 'roles',
    kyc: 'kyc',
    security: 'security',
    analytics: 'analytics',
    search: 'search',
    documents: 'documents',
    stellaraccounts: 'stellarAccounts',
  };

  const domain = aliases[normalized] ?? aliases[root];
  return queryCacheTtl[domain ?? 'default'] ?? queryCacheTtl.default;
}

export function getDomainCacheTtl(domain: QueryDomain): CacheTtl {
  return queryCacheTtl[domain] ?? queryCacheTtl.default;
}
