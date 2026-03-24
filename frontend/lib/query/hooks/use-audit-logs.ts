'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '../keys';
import type { AuditLog, PaginatedResponse } from '@/types';

interface AuditLogParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  performedBy?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  status?: string;
  level?: string;
  search?: string;
}

function buildQueryString(params: AuditLogParams): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      qs.append(key, String(value));
    }
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
}

/**
 * Fetch a paginated list of audit logs with filtering.
 */
export function useAuditLogs(params: AuditLogParams = {}) {
  return useQuery({
    queryKey: queryKeys.audit.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<AuditLog>>(
        `/audit${buildQueryString(params)}`,
      );
      return data;
    },
  });
}

/**
 * Fetch audit log statistics.
 */
export function useAuditStats() {
  return useQuery({
    queryKey: queryKeys.audit.stats(),
    queryFn: async () => {
      const { data } =
        await apiClient.get<Record<string, unknown>>('/audit/stats');
      return data;
    },
  });
}

/**
 * Fetch audit trail for a specific entity.
 */
export function useAuditTrail(
  entityType: string,
  entityId: string,
  limit?: number,
) {
  return useQuery({
    queryKey: [
      ...queryKeys.audit.all,
      'trail',
      entityType,
      entityId,
      { limit },
    ],
    queryFn: async () => {
      const { data } = await apiClient.get<AuditLog[]>(
        `/audit/trail/${entityType}/${entityId}${limit ? `?limit=${limit}` : ''}`,
      );
      return data;
    },
    enabled: Boolean(entityType && entityId),
  });
}
