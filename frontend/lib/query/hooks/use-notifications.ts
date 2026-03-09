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
export function useNotificationsQuery(filters?: NotificationFilters) {
  return useQuery({
    queryKey: queryKeys.notifications.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<Notification[]>(
        `/notifications${buildQueryString(filters)}`,
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
 * Mark a single notification as read. Optimistically updates the unread
 * count cache for immediate UI feedback.
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await apiClient.patch(`/notifications/${notificationId}/read`);
      return notificationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },
  });
}

/**
 * Mark all notifications as read.
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },
  });
}

/**
 * Delete a single notification.
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await apiClient.delete(`/notifications/${notificationId}`);
      return notificationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },
  });
}
