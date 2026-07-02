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
    deposits: () => [...queryKeys.payments.all, 'deposits'] as const,
    deposit: (id: string) =>
      [...queryKeys.payments.deposits(), 'detail', id] as const,
    depositDeductions: (id: string) =>
      [...queryKeys.payments.deposit(id), 'deductions'] as const,
  },

  paymentMethods: {
    all: ['payment-methods'] as const,
    lists: () => [...queryKeys.paymentMethods.all, 'list'] as const,
    list: (filters: object) =>
      [...queryKeys.paymentMethods.lists(), filters] as const,
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

  favorites: {
    all: ['favorites'] as const,
    list: () => [...queryKeys.favorites.all, 'list'] as const,
    status: (propertyId: string) =>
      [...queryKeys.favorites.all, 'status', propertyId] as const,
    count: (propertyId: string) =>
      [...queryKeys.favorites.all, 'count', propertyId] as const,
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

  indexedTransactions: {
    all: ['indexed-transactions'] as const,
    lists: () => [...queryKeys.indexedTransactions.all, 'list'] as const,
    list: (filters: object) =>
      [...queryKeys.indexedTransactions.lists(), filters] as const,
    details: () => [...queryKeys.indexedTransactions.all, 'detail'] as const,
    detail: (id: string) =>
      [...queryKeys.indexedTransactions.details(), id] as const,
    stats: () => [...queryKeys.indexedTransactions.all, 'stats'] as const,
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

  analytics: {
    all: ['analytics'] as const,
    landlordOverview: (days: number) =>
      [...queryKeys.analytics.all, 'landlord-overview', days] as const,
    dashboardMetrics: () =>
      [...queryKeys.analytics.all, 'dashboard-metrics'] as const,
    paymentAnalytics: (days: number) =>
      [...queryKeys.analytics.all, 'payment-analytics', days] as const,
    userActivity: (days: number) =>
      [...queryKeys.analytics.all, 'user-activity', days] as const,
  },

  search: {
    all: ['search'] as const,
    properties: (filters: object) =>
      [...queryKeys.search.all, 'properties', filters] as const,
    users: (filters: object) =>
      [...queryKeys.search.all, 'users', filters] as const,
    documents: (filters: object) =>
      [...queryKeys.search.all, 'documents', filters] as const,
    suggest: (query: string) =>
      [...queryKeys.search.all, 'suggest', query] as const,
  },

  documents: {
    all: ['documents'] as const,
    lists: () => [...queryKeys.documents.all, 'list'] as const,
    list: (filters: object) =>
      [...queryKeys.documents.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.documents.all, 'detail', id] as const,
    shared: () => [...queryKeys.documents.all, 'shared'] as const,
  },
} as const;
