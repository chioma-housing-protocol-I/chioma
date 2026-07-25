'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '../keys';
import type { User, PaginatedResponse } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────

export interface AdminUserListParams {
  page?: number;
  limit?: number;
  role?: User['role'];
  search?: string;
  isVerified?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function buildQueryString(params: AdminUserListParams): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      qs.append(key, String(value));
    }
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
}

// ── Queries ───────────────────────────────────────────────────────────────

/**
 * Fetch a paginated list of users for admin management.
 */
export function useAdminUsers(params: AdminUserListParams = {}) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<User>>(
        `/admin/users${buildQueryString(params)}`,
      );
      return data;
    },
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────

/**
 * Suspend a single user by deactivating their account.
 */
export function useSuspendUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.post(
        `/admin/users/${encodeURIComponent(userId)}/deactivate`,
        {},
      );
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({
        queryKey: ['admin-user-detail-bundle', userId],
      });
    },
  });
}

/**
 * Restore a suspended user account.
 */
export function useActivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.post(
        `/admin/users/${encodeURIComponent(userId)}/restore`,
        {},
      );
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({
        queryKey: ['admin-user-detail-bundle', userId],
      });
    },
  });
}

/**
 * Mark a user as verified (admin).
 */
export function useVerifyUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.post(
        `/admin/users/${encodeURIComponent(userId)}/verify`,
        {},
      );
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({
        queryKey: ['admin-user-detail-bundle', userId],
      });
    },
  });
}
