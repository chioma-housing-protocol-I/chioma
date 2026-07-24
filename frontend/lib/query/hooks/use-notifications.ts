'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '../keys';
import type { Notification, NotificationFilters } from '@/types/notification';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildQueryString(filters?: NotificationFilters): string {
  if (!filters) return '';
  const qs = new URLSearchParams();
  if (filters.isRead !== undefined) qs.append('isRead', String(filters.isRead));
  if (filters.type) qs.append('type', filters.type);
  if (filters.startDate) qs.append('startDate', filters.startDate);
  if (filters.endDate) qs.append('endDate', filters.endDate);
  const str = qs.toString();
  return str ? `?${str}` : '';
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Fetch notifications with optional filters. Integrates with the existing
 * notification service endpoint.
 */
export interface PaginatedNotifications {
  data: Notification[];
  total: number;
  page: number;
  totalPages: number;
}

export function useNotificationsQuery(
  filters?: NotificationFilters,
  page: number = 1,
  limit: number = 20,
) {
  return useQuery({
    queryKey: [...queryKeys.notifications.list(filters), page, limit],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedNotifications>(
        `/notifications${buildQueryString(filters)}${filters ? '&' : '?'}page=${page}&limit=${limit}`,
      );
      return data;
    },
    staleTime: 15_000,
  });
}

/**
 * Fetch the count of unread notifications. Lightweight endpoint suitable
 * for polling or frequent refetches in the notification bell.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: async () => {
      const { data } = await apiClient.get<{ count: number }>(
        '/notifications/unread/count',
      );
      return data.count;
    },
    staleTime: 10_000,
    refetchInterval: 60_000,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Mark a single notification as read.
 * Optimistically marks it read in the cache; reverts on failure.
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await apiClient.patch(`/notifications/${notificationId}/read`);
      return notificationId;
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.all,
      });

      const previousNotifications = queryClient.getQueriesData<Notification[]>({
        queryKey: queryKeys.notifications.all,
      });

      queryClient.setQueriesData<Notification[]>(
        { queryKey: queryKeys.notifications.all },
        (old) =>
          old?.map((n) =>
            (n as unknown as { id: string }).id === notificationId
              ? { ...n, isRead: true }
              : n,
          ),
      );

      const previousCount = queryClient.getQueryData<number>(
        queryKeys.notifications.unreadCount(),
      );
      if (previousCount !== undefined) {
        queryClient.setQueryData(
          queryKeys.notifications.unreadCount(),
          Math.max(0, previousCount - 1),
        );
      }

      return { previousNotifications, previousCount };
    },
    onError: (_err, _id, context) => {
      if (context?.previousNotifications) {
        context.previousNotifications.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(
          queryKeys.notifications.unreadCount(),
          context.previousCount,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/**
 * Mark all notifications as read.
 * Optimistically zeroes the unread count and marks all items read.
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.patch('/notifications/read-all');
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.all,
      });

      const previousNotifications = queryClient.getQueriesData<Notification[]>({
        queryKey: queryKeys.notifications.all,
      });
      const previousCount = queryClient.getQueryData<number>(
        queryKeys.notifications.unreadCount(),
      );

      queryClient.setQueriesData<Notification[]>(
        { queryKey: queryKeys.notifications.all },
        (old) => old?.map((n) => ({ ...n, isRead: true })),
      );
      queryClient.setQueryData(queryKeys.notifications.unreadCount(), 0);

      return { previousNotifications, previousCount };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousNotifications) {
        context.previousNotifications.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(
          queryKeys.notifications.unreadCount(),
          context.previousCount,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/**
 * Delete a single notification.
 * Optimistically removes it from the list; reverts on failure.
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await apiClient.delete(`/notifications/${notificationId}`);
      return notificationId;
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.all,
      });

      const previousNotifications = queryClient.getQueriesData<Notification[]>({
        queryKey: queryKeys.notifications.all,
      });

      queryClient.setQueriesData<Notification[]>(
        { queryKey: queryKeys.notifications.all },
        (old) =>
          old?.filter(
            (n) => (n as unknown as { id: string }).id !== notificationId,
          ),
      );

      return { previousNotifications };
    },
    onError: (_err, _id, context) => {
      if (context?.previousNotifications) {
        context.previousNotifications.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
