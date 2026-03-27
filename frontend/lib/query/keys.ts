/**
 * Query key factory for React Query.
 *
 * Structured keys enable granular cache invalidation. Each domain exposes
 * an `all` key plus narrower keys for lists, details, and filtered views.
 */

export const queryKeys = {
  properties: {
    all: ['properties'] as const,
    lists: () => [...queryKeys.properties.all, 'list'] as const,
    list: (filters: object) =>
      [...queryKeys.properties.lists(), filters] as const,
    details: () => [...queryKeys.properties.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.properties.details(), id] as const,
  },

  payments: {
    all: ['payments'] as const,
    lists: () => [...queryKeys.payments.all, 'list'] as const,
    list: (filters: object) =>
      [...queryKeys.payments.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.payments.all, 'detail', id] as const,
    byAgreement: (agreementId: string) =>
      [...queryKeys.payments.all, 'agreement', agreementId] as const,
  },

  agreements: {
    all: ['agreements'] as const,
    lists: () => [...queryKeys.agreements.all, 'list'] as const,
    list: (filters: object) =>
      [...queryKeys.agreements.lists(), filters] as const,
    detail: (id: string) =>
      [...queryKeys.agreements.all, 'detail', id] as const,
  },

  notifications: {
    all: ['notifications'] as const,
    list: (filters?: object) =>
      [...queryKeys.notifications.all, 'list', filters ?? {}] as const,
    unreadCount: () =>
      [...queryKeys.notifications.all, 'unread-count'] as const,
  },

  maintenance: {
    all: ['maintenance'] as const,
    lists: () => [...queryKeys.maintenance.all, 'list'] as const,
    list: (filters: object) =>
      [...queryKeys.maintenance.lists(), filters] as const,
    detail: (id: string) =>
      [...queryKeys.maintenance.all, 'detail', id] as const,
  },

  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    preferences: () => [...queryKeys.user.all, 'preferences'] as const,
  },

  audit: {
    all: ['audit'] as const,
    lists: () => [...queryKeys.audit.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.audit.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.audit.all, 'detail', id] as const,
    stats: () => [...queryKeys.audit.all, 'stats'] as const,
  },

  transactions: {
    all: ['transactions'] as const,
    lists: () => [...queryKeys.transactions.all, 'list'] as const,
    list: (filters: object) =>
      [...queryKeys.transactions.lists(), filters] as const,
    detail: (id: string) =>
      [...queryKeys.transactions.all, 'detail', id] as const,
    byUser: (userId: string) =>
      [...queryKeys.transactions.all, 'user', userId] as const,
  },

  anchorTransactions: {
    all: ['anchor-transactions'] as const,
    lists: () => [...queryKeys.anchorTransactions.all, 'list'] as const,
    list: (filters: object) =>
      [...queryKeys.anchorTransactions.lists(), filters] as const,
    details: () => [...queryKeys.anchorTransactions.all, 'detail'] as const,
    detail: (id: string) =>
      [...queryKeys.anchorTransactions.details(), id] as const,
    stats: () => [...queryKeys.anchorTransactions.all, 'stats'] as const,
  },

  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.users.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.users.all, 'detail', id] as const,
    activities: (id: string, filters?: object) =>
      [...queryKeys.users.detail(id), 'activities', filters ?? {}] as const,
  },

  // ── Roles / Permissions (Admin) ───────────────────────────────────────────
  roles: {
    all: ['roles'] as const,
    list: () => [...queryKeys.roles.all, 'list'] as const,
    permissions: () => [...queryKeys.roles.all, 'permissions'] as const,
  },

  kyc: {
    all: ['kyc'] as const,
    lists: () => [...queryKeys.kyc.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.kyc.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.kyc.all, 'detail', id] as const,
  },

  security: {
    all: ['security'] as const,
    events: (filters: object) =>
      [...queryKeys.security.all, 'events', filters] as const,
    threats: (filters: object) =>
      [...queryKeys.security.all, 'threats', filters] as const,
    threatStats: (filters: object) =>
      [...queryKeys.security.all, 'threat-stats', filters] as const,
    incidents: () => [...queryKeys.security.all, 'incidents'] as const,
    incidentMetrics: () =>
      [...queryKeys.security.all, 'incident-metrics'] as const,
  },
} as const;
