export interface TimeoutConfig {
  default: number;
  analytics: number;
  payments: number;
  properties: number;
  users: number;
  documents: number;
  search: number;
  mutations: number;
  uploads: number;
}

export const DEFAULT_TIMEOUTS: TimeoutConfig = {
  default: 12000, // 12 seconds
  analytics: 15000, // 15 seconds - analytics queries can be slow
  payments: 20000, // 20 seconds - payment processing
  properties: 10000, // 10 seconds
  users: 8000, // 8 seconds
  documents: 30000, // 30 seconds - document uploads/downloads
  search: 10000, // 10 seconds
  mutations: 15000, // 15 seconds
  uploads: 60000, // 60 seconds - large file uploads
};

export function getTimeoutForEndpoint(endpoint: string): number {
  const lowerEndpoint = endpoint.toLowerCase();

  if (lowerEndpoint.includes('/analytics/')) {
    return DEFAULT_TIMEOUTS.analytics;
  }
  if (
    lowerEndpoint.includes('/payment') ||
    lowerEndpoint.includes('/payments')
  ) {
    return DEFAULT_TIMEOUTS.payments;
  }
  if (
    lowerEndpoint.includes('/properties') ||
    lowerEndpoint.includes('/property')
  ) {
    return DEFAULT_TIMEOUTS.properties;
  }
  if (lowerEndpoint.includes('/users') || lowerEndpoint.includes('/user')) {
    return DEFAULT_TIMEOUTS.users;
  }
  if (lowerEndpoint.includes('/upload')) {
    return DEFAULT_TIMEOUTS.uploads;
  }
  if (
    lowerEndpoint.includes('/documents') ||
    lowerEndpoint.includes('/document')
  ) {
    return DEFAULT_TIMEOUTS.documents;
  }
  if (lowerEndpoint.includes('/search')) {
    return DEFAULT_TIMEOUTS.search;
  }

  // Default for mutations (POST, PUT, PATCH, DELETE)
  if (
    lowerEndpoint.startsWith('/api') &&
    !lowerEndpoint.includes('/get') &&
    !lowerEndpoint.includes('/list')
  ) {
    return DEFAULT_TIMEOUTS.mutations;
  }

  return DEFAULT_TIMEOUTS.default;
}

export function getTimeoutForMethod(method: string): number {
  switch (method.toUpperCase()) {
    case 'GET':
      return DEFAULT_TIMEOUTS.default;
    case 'POST':
    case 'PUT':
    case 'PATCH':
      return DEFAULT_TIMEOUTS.mutations;
    case 'DELETE':
      return DEFAULT_TIMEOUTS.mutations;
    default:
      return DEFAULT_TIMEOUTS.default;
  }
}
