'use client';

import { create } from 'zustand';
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

export const useNotificationStore = create<NotificationStore>((set) => ({
  // — state
  notifications: [],
  isLoaded: false,

  // — actions
  fetchNotifications: () => {
    // TODO: replace with real API call → GET /api/notifications
    set({
      notifications: [...MOCK_NOTIFICATIONS].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
      isLoaded: true,
    });
  },

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    })),

  markAsUnread: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: false } : n,
      ),
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
    })),
}));
