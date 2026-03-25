import { describe, it, expect, beforeEach } from 'vitest';
import {
  useNotificationStore,
  selectUnreadCount,
} from '@/store/notificationStore';
import type { Notification } from '@/components/notifications/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetStore() {
  useNotificationStore.setState({
    notifications: [],
    isLoaded: false,
  });
}

const fakeNotification: Notification = {
  id: 'n-1',
  type: 'payment',
  title: 'Rent received',
  body: 'Your tenant paid ₦150,000',
  read: false,
  createdAt: new Date().toISOString(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('notificationStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('starts empty and not loaded', () => {
    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(0);
    expect(state.isLoaded).toBe(false);
  });

  it('fetchNotifications loads sorted mock data', () => {
    useNotificationStore.getState().fetchNotifications();

    const state = useNotificationStore.getState();
    expect(state.isLoaded).toBe(true);
    expect(state.notifications.length).toBeGreaterThan(0);

    // Verify descending chronological order
    for (let i = 1; i < state.notifications.length; i++) {
      const prev = new Date(state.notifications[i - 1].createdAt).getTime();
      const curr = new Date(state.notifications[i].createdAt).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it('addNotification prepends to the list', () => {
    useNotificationStore.getState().fetchNotifications();
    const before = useNotificationStore.getState().notifications.length;

    useNotificationStore.getState().addNotification(fakeNotification);

    const state = useNotificationStore.getState();
    expect(state.notifications.length).toBe(before + 1);
    expect(state.notifications[0].id).toBe('n-1');
  });

  it('markAsRead toggles read flag for a single notification', () => {
    useNotificationStore.getState().addNotification(fakeNotification);
    expect(useNotificationStore.getState().notifications[0].read).toBe(false);

    useNotificationStore.getState().markAsRead('n-1');
    expect(useNotificationStore.getState().notifications[0].read).toBe(true);
  });

  it('markAsUnread reverses markAsRead', () => {
    useNotificationStore.getState().addNotification({
      ...fakeNotification,
      read: true,
    });

    useNotificationStore.getState().markAsUnread('n-1');
    expect(useNotificationStore.getState().notifications[0].read).toBe(false);
  });

  it('markAllAsRead sets every notification to read', () => {
    useNotificationStore.getState().addNotification(fakeNotification);
    useNotificationStore.getState().addNotification({
      ...fakeNotification,
      id: 'n-2',
    });

    useNotificationStore.getState().markAllAsRead();

    const state = useNotificationStore.getState();
    expect(state.notifications.every((n) => n.read)).toBe(true);
  });

  it('selectUnreadCount returns correct count', () => {
    useNotificationStore.getState().addNotification(fakeNotification);
    useNotificationStore.getState().addNotification({
      ...fakeNotification,
      id: 'n-2',
      read: true,
    });

    const count = selectUnreadCount(useNotificationStore.getState());
    expect(count).toBe(1);
  });

  it('markAsRead on non-existent id is a safe no-op', () => {
    useNotificationStore.getState().addNotification(fakeNotification);

    useNotificationStore.getState().markAsRead('does-not-exist');

    const state = useNotificationStore.getState();
    expect(state.notifications[0].read).toBe(false);
  });
});
