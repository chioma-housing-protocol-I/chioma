'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '../keys';
import { adminUserDetailBundleKey } from './use-admin-user-detail';
import toast from 'react-hot-toast';
import type { User, PaginatedResponse } from '@/types';
import type { AdminUserDetailExtras } from '@/lib/admin-user-detail';

// ── Types ─────────────────────────────────────────────────────────────────

export type AdminUserSortField =
  'createdAt' | 'email' | 'firstName' | 'lastName' | 'role';

export interface AdminUserListParams {
  page?: number;
  limit?: number;
  role?: User['role'];
  search?: string;
  isVerified?: boolean;
  sortBy?: AdminUserSortField;
  sortOrder?: 'ASC' | 'DESC';
}

type AdminUserBundle = { user: User; extras: AdminUserDetailExtras };

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
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.all });
      await queryClient.cancelQueries({
        queryKey: adminUserDetailBundleKey(userId),
      });
      const bundle = queryClient.getQueryData<AdminUserBundle>(
        adminUserDetailBundleKey(userId),
      );
      if (bundle) {
        queryClient.setQueryData(adminUserDetailBundleKey(userId), {
          ...bundle,
          extras: { ...bundle.extras, accountStatus: 'suspended' },
        });
      }
      return { bundle };
    },
    onError: (_err, userId, context) => {
      if (context?.bundle) {
        queryClient.setQueryData(
          adminUserDetailBundleKey(userId),
          context.bundle,
        );
      }
    },
    onSuccess: () => {
      toast.success('User suspended');
    },
    onSettled: (_, __, userId) => {
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
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.all });
      await queryClient.cancelQueries({
        queryKey: adminUserDetailBundleKey(userId),
      });
      const bundle = queryClient.getQueryData<AdminUserBundle>(
        adminUserDetailBundleKey(userId),
      );
      if (bundle) {
        queryClient.setQueryData(adminUserDetailBundleKey(userId), {
          ...bundle,
          extras: { ...bundle.extras, accountStatus: 'active' },
        });
      }
      return { bundle };
    },
    onError: (_err, userId, context) => {
      if (context?.bundle) {
        queryClient.setQueryData(
          adminUserDetailBundleKey(userId),
          context.bundle,
        );
      }
    },
    onSuccess: () => {
      toast.success('User activated');
    },
    onSettled: (_, __, userId) => {
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
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.all });

      const listData = queryClient.getQueriesData<PaginatedResponse<User>>({
        queryKey: queryKeys.users.all,
      });
      const listSnapshots = listData.map(([key, data]) => [key, data] as const);

      queryClient.setQueriesData<PaginatedResponse<User>>(
        { queryKey: queryKeys.users.all },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((u) =>
              u.id === userId ? { ...u, isVerified: true } : u,
            ),
          };
        },
      );

      const bundle = queryClient.getQueryData<AdminUserBundle>(
        adminUserDetailBundleKey(userId),
      );
      if (bundle) {
        queryClient.setQueryData(adminUserDetailBundleKey(userId), {
          ...bundle,
          user: { ...bundle.user, isVerified: true },
        });
      }
      return { listSnapshots, bundle };
    },
    onError: (_err, _userId, context) => {
      if (context?.listSnapshots) {
        for (const [key, data] of context.listSnapshots) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.bundle) {
        queryClient.setQueryData(
          adminUserDetailBundleKey(_userId),
          context.bundle,
        );
      }
    },
    onSuccess: () => {
      toast.success('User verified');
    },
    onSettled: (_, __, userId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({
        queryKey: ['admin-user-detail-bundle', userId],
      });
    },
  });
}
