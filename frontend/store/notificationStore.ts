'use client';

import { create } from 'zustand';
import { withMiddleware } from './middleware';
import type { Notification } from '@/components/notifications/types';
import { MOCK_NOTIFICATIONS } from '@/components/notifications/mockData';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NotificationState {
  notifications: Notification[];
  isLoaded: boolean;
}

interface NotificationActions {
  /** Load notifications (uses mock data for now). */
  fetchNotifications: () => void;
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
      fetchNotifications: () => {
        const sorted = [...MOCK_NOTIFICATIONS].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        set((state) => {
          state.notifications = sorted;
          state.isLoaded = true;
        });
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
