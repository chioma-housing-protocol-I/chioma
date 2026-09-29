'use client';

import { create } from 'zustand';
import { withMiddleware } from './middleware';
import type {
  Notification,
  NotificationType,
} from '@/components/notifications/types';
import { apiClient } from '@/lib/api-client';

type BackendNotification = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  type?: string | null;
  createdAt: string;
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface NotificationState {
  notifications: Notification[];
  isLoaded: boolean;
}

interface NotificationActions {
  /** Load notifications from the API. */
  fetchNotifications: (page?: number, limit?: number) => Promise<void>;
  /** Mark a single notification as read. */
  markAsRead: (id: string) => Promise<void>;
  /** Mark a single notification as unread. */
  markAsUnread: (id: string) => void;
  /** Mark every notification as read. */
  markAllAsRead: () => Promise<void>;
  /** Delete a notification. */
  deleteNotification: (id: string) => Promise<void>;
  /** Push a new notification (e.g. from SSE / real-time). */
  addNotification: (notification: Notification) => void;
}

export type NotificationStore = NotificationState & NotificationActions;

const normalizeNotificationType = (type?: string | null): NotificationType => {
  const normalized = (type ?? '').toLowerCase();

  if (normalized.includes('maintenance')) {
    return 'maintenance';
  }

  if (normalized.includes('payment')) {
    return 'payment';
  }

  return 'message';
};

// ─── Derived selectors ──────────────────────────────────────────────────────

export const selectUnreadCount = (state: NotificationStore) =>
  state.notifications.filter((n) => !n.read).length;

// ─── Store ──────────────────────────────────────────────────────────────────

export const useNotificationStore = create<NotificationStore>()(
  withMiddleware(
    (set) => ({
      // — state
      notifications: [],
      isLoaded: false,

      // — actions
      fetchNotifications: async (page = 1, limit = 20) => {
        try {
          const { data } = await apiClient.get<{
            data: BackendNotification[];
            total: number;
            page: number;
            totalPages: number;
          }>(`/notifications?page=${page}&limit=${limit}`);
          const sorted: Notification[] = data.data
            .map((notification) => ({
              id: notification.id,
              type: normalizeNotificationType(notification.type),
              title: notification.title,
              body: notification.message,
              read: notification.isRead,
              createdAt: notification.createdAt,
            }))
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            );

          set((state) => {
            state.notifications =
              page === 1 ? sorted : [...state.notifications, ...sorted];
            state.isLoaded = true;
          });
        } catch {
          set((state) => {
            if (page === 1) state.notifications = [];
            state.isLoaded = true;
          });
        }
      },

      markAsRead: async (id) => {
        try {
          await apiClient.patch(`/notifications/${id}/read`);
          set((state) => {
            const target = state.notifications.find((n) => n.id === id);
            if (target) target.read = true;
          });
        } catch (error) {
          console.error('Failed to mark as read', error);
        }
      },

      markAsUnread: (id) => {
        // Backend currently doesn't have an unread endpoint but we can update state
        set((state) => {
          const target = state.notifications.find((n) => n.id === id);
          if (target) target.read = false;
        });
      },

      markAllAsRead: async () => {
        try {
          await apiClient.patch('/notifications/read-all');
          set((state) => {
            state.notifications.forEach((n) => {
              n.read = true;
            });
          });
        } catch (error) {
          console.error('Failed to mark all as read', error);
        }
      },

      deleteNotification: async (id) => {
        try {
          await apiClient.delete(`/notifications/${id}`);
          set((state) => {
            state.notifications = state.notifications.filter(
              (n) => n.id !== id,
            );
          });
        } catch (error) {
          console.error('Failed to delete notification', error);
        }
      },

      addNotification: (notification) => {
        set((state) => {
          state.notifications.unshift(notification);
        });
      },
    }),
    'notifications',
  ),
);
