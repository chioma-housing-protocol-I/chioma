import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useNotificationStore,
  selectUnreadCount,
} from '@/store/notificationStore';
import type { Notification } from '@/components/notifications/types';

// ─── Mock apiClient ───────────────────────────────────────────────────────────

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        data: [
          {
            id: 'mock-1',
            title: 'Rent received',
            message: 'Your tenant paid',
            isRead: false,
            type: 'payment',
            createdAt: '2026-03-27T12:00:00.000Z',
          },
          {
            id: 'mock-2',
            title: 'Maintenance update',
            message: 'Request resolved',
            isRead: true,
            type: 'maintenance',
            createdAt: '2026-03-26T10:00:00.000Z',
          },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      },
    }),
    patch: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  },
}));

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
  body: 'Your tenant paid $150,000 USDC',
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

  it('fetchNotifications loads sorted mock data', async () => {
    await useNotificationStore.getState().fetchNotifications();

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

  it('addNotification prepends to the list', async () => {
    await useNotificationStore.getState().fetchNotifications();
    const before = useNotificationStore.getState().notifications.length;

    useNotificationStore.getState().addNotification(fakeNotification);

    const state = useNotificationStore.getState();
    expect(state.notifications.length).toBe(before + 1);
    expect(state.notifications[0].id).toBe('n-1');
  });

  it('markAsRead toggles read flag for a single notification', async () => {
    useNotificationStore.getState().addNotification(fakeNotification);
    expect(useNotificationStore.getState().notifications[0].read).toBe(false);

    await useNotificationStore.getState().markAsRead('n-1');
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

  it('markAllAsRead sets every notification to read', async () => {
    useNotificationStore.getState().addNotification(fakeNotification);
    useNotificationStore.getState().addNotification({
      ...fakeNotification,
      id: 'n-2',
    });

    await useNotificationStore.getState().markAllAsRead();

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

  it('markAsRead on non-existent id is a safe no-op', async () => {
    useNotificationStore.getState().addNotification(fakeNotification);

    await useNotificationStore.getState().markAsRead('does-not-exist');

    const state = useNotificationStore.getState();
    expect(state.notifications[0].read).toBe(false);
  });
});
