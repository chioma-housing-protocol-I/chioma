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
  fetchNotifications: () => Promise<void>;
  /** Mark a single notification as read. */
  markAsRead: (id: string) => void;
  /** Mark a single notification as unread. */
  markAsUnread: (id: string) => void;
  /** Mark every notification as read. */
  markAllAsRead: () => void;
  /** Push a new notification (e.g. from SSE / real-time). */
  addNotification: (notification: Notification) => void;
}

export type NotificationStore = NotificationState & NotificationActions;

const normalizeNotificationType = (type?: string | null): NotificationType => {
  if (type === 'maintenance' || type === 'payment') {
    return type;
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
      fetchNotifications: async () => {
        try {
          const { data } =
            await apiClient.get<BackendNotification[]>('/notifications');
          const sorted: Notification[] = data
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
            state.notifications = sorted;
            state.isLoaded = true;
          });
        } catch {
          set((state) => {
            state.notifications = [];
            state.isLoaded = true;
          });
        }
      },

      markAsRead: (id) => {
        set((state) => {
          const target = state.notifications.find((n) => n.id === id);
          if (target) target.read = true;
        });
      },

      markAsUnread: (id) => {
        set((state) => {
          const target = state.notifications.find((n) => n.id === id);
          if (target) target.read = false;
        });
      },

      markAllAsRead: () => {
        set((state) => {
          state.notifications.forEach((n) => {
            n.read = true;
          });
        });
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
