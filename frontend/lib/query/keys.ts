/**
 * Query key factory for React Query.
 *
 * Structured keys enable granular cache invalidation. Each domain exposes
 * an `all` key (for broad invalidation) plus narrower keys for lists,
 * details, and filtered views.
 *
 * @example
 *   queryClient.invalidateQueries({ queryKey: queryKeys.properties.all });
 *   queryClient.invalidateQueries({ queryKey: queryKeys.properties.detail('abc') });
 */

export const queryKeys = {
  // ── Properties ───────────────────────────────────────────────────────────
  properties: {
    all: ['properties'] as const,
    lists: () => [...queryKeys.properties.all, 'list'] as const,
    list: (filters: object) =>
      [...queryKeys.properties.lists(), filters] as const,
    details: () => [...queryKeys.properties.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.properties.details(), id] as const,
  },

  // ── Payments ─────────────────────────────────────────────────────────────
  payments: {
    all: ['payments'] as const,
    lists: () => [...queryKeys.payments.all, 'list'] as const,
    list: (filters: object) =>
      [...queryKeys.payments.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.payments.all, 'detail', id] as const,
    byAgreement: (agreementId: string) =>
      [...queryKeys.payments.all, 'agreement', agreementId] as const,
  },

  // ── Agreements ───────────────────────────────────────────────────────────
  agreements: {
    all: ['agreements'] as const,
    lists: () => [...queryKeys.agreements.all, 'list'] as const,
    list: (filters: object) =>
      [...queryKeys.agreements.lists(), filters] as const,
    detail: (id: string) =>
      [...queryKeys.agreements.all, 'detail', id] as const,
  },

  // ── Notifications ────────────────────────────────────────────────────────
  notifications: {
    all: ['notifications'] as const,
    list: (filters?: object) =>
      [...queryKeys.notifications.all, 'list', filters ?? {}] as const,
    unreadCount: () =>
      [...queryKeys.notifications.all, 'unread-count'] as const,
  },

  // ── Maintenance ──────────────────────────────────────────────────────────
  maintenance: {
    all: ['maintenance'] as const,
    lists: () => [...queryKeys.maintenance.all, 'list'] as const,
    list: (filters: object) =>
      [...queryKeys.maintenance.lists(), filters] as const,
    detail: (id: string) =>
      [...queryKeys.maintenance.all, 'detail', id] as const,
  },

  // ── User / Profile ──────────────────────────────────────────────────────
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    preferences: () => [...queryKeys.user.all, 'preferences'] as const,
  },
} as const;
