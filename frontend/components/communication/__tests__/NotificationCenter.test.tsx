import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import type { Notification } from '@/components/notifications/types';

const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    title: 'Payment Received',
    body: 'You received a payment of $500',
    type: 'payment',
    read: false,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'notif-2',
    title: 'New Message',
    body: 'You have a new message from Jane',
    type: 'message',
    read: true,
    createdAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'notif-3',
    title: 'Maintenance Alert',
    body: 'Scheduled maintenance tomorrow',
    type: 'maintenance',
    read: false,
    createdAt: '2024-01-03T00:00:00Z',
  },
];

const { mockUseNotificationStore } = vi.hoisted(() => ({
  mockUseNotificationStore: vi.fn(),
}));

vi.mock('@/store/notificationStore', () => ({
  useNotificationStore: mockUseNotificationStore,
  selectUnreadCount: (s: { notifications: Notification[] }) =>
    s.notifications.filter((n: Notification) => !n.read).length,
}));

vi.mock('@/components/notifications/NotificationItem', () => ({
  default: (props: Record<string, unknown>) =>
    React.createElement(
      'div',
      {
        'data-testid': `notification-item-${(props.notification as Notification).id}`,
        ...props,
      },
      (props.notification as Notification).title,
    ),
}));

function createDefaultStore() {
  return {
    notifications: mockNotifications,
    unreadCount: 2,
    isLoaded: true,
    fetchNotifications: vi.fn().mockResolvedValue(undefined),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    markAsUnread: vi.fn(),
    addNotification: vi.fn(),
  };
}

import { NotificationCenter } from '../NotificationCenter';

describe('NotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotificationStore.mockImplementation(
      (selector?: (s: Record<string, unknown>) => unknown) => {
        const store = createDefaultStore() as unknown as Record<
          string,
          unknown
        >;
        return selector ? selector(store) : store;
      },
    );
  });

  it('renders the notification bell button', () => {
    render(React.createElement(NotificationCenter));

    const bellButton = screen.getByLabelText(/Open notifications/);
    expect(bellButton).toBeInTheDocument();
  });

  it('shows unread count badge', () => {
    render(React.createElement(NotificationCenter));

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows 99+ badge when unread count exceeds 99', () => {
    const manyNotifications = Array.from({ length: 100 }, (_, i) => ({
      id: `notif-${i}`,
      title: `Notification ${i}`,
      message: 'Test',
      type: 'info' as const,
      read: false,
      createdAt: '2024-01-01T00:00:00Z',
    }));

    mockUseNotificationStore.mockImplementation(
      (selector?: (s: Record<string, unknown>) => unknown) => {
        const store = {
          notifications: manyNotifications,
          isLoaded: true,
          fetchNotifications: vi.fn().mockResolvedValue(undefined),
          markAsRead: vi.fn(),
          markAllAsRead: vi.fn(),
        } as unknown as Record<string, unknown>;
        return selector ? selector(store) : store;
      },
    );

    render(React.createElement(NotificationCenter));
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('opens dropdown when bell button is clicked', async () => {
    render(React.createElement(NotificationCenter));

    const bellButton = screen.getByLabelText(/Open notifications/);
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText('Notification Center')).toBeInTheDocument();
    });
  });

  it('shows notification items in dropdown', async () => {
    render(React.createElement(NotificationCenter));

    fireEvent.click(screen.getByLabelText(/Open notifications/));

    await waitFor(() => {
      expect(screen.getByText('Payment Received')).toBeInTheDocument();
      expect(screen.getByText('New Message')).toBeInTheDocument();
      expect(screen.getByText('Maintenance Alert')).toBeInTheDocument();
    });
  });

  it('shows "All caught up" when there are no unread notifications', async () => {
    const allReadNotifications = mockNotifications.map((n) => ({
      ...n,
      read: true,
    }));

    mockUseNotificationStore.mockImplementation(
      (selector?: (s: Record<string, unknown>) => unknown) => {
        const store = {
          notifications: allReadNotifications,
          isLoaded: true,
          fetchNotifications: vi.fn().mockResolvedValue(undefined),
          markAsRead: vi.fn(),
          markAllAsRead: vi.fn(),
        } as unknown as Record<string, unknown>;
        return selector ? selector(store) : store;
      },
    );

    render(React.createElement(NotificationCenter));
    fireEvent.click(screen.getByLabelText(/Open notifications/));

    await waitFor(() => {
      expect(screen.getByText('All caught up')).toBeInTheDocument();
    });
  });

  it('shows filter buttons for All and Unread', async () => {
    render(React.createElement(NotificationCenter));

    fireEvent.click(screen.getByLabelText(/Open notifications/));

    await waitFor(() => {
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Unread')).toBeInTheDocument();
    });
  });

  it('shows empty state when no notifications match filter', async () => {
    mockUseNotificationStore.mockImplementation(
      (selector?: (s: Record<string, unknown>) => unknown) => {
        const store = {
          notifications: [],
          isLoaded: true,
          fetchNotifications: vi.fn().mockResolvedValue(undefined),
          markAsRead: vi.fn(),
          markAllAsRead: vi.fn(),
        } as unknown as Record<string, unknown>;
        return selector ? selector(store) : store;
      },
    );

    render(React.createElement(NotificationCenter));

    fireEvent.click(screen.getByLabelText(/Open notifications/));

    await waitFor(() => {
      expect(
        screen.getByText('No notifications in this view.'),
      ).toBeInTheDocument();
    });
  });

  it('closes dropdown when close button is clicked', async () => {
    render(React.createElement(NotificationCenter));

    fireEvent.click(screen.getByLabelText(/Open notifications/));

    await waitFor(() => {
      expect(screen.getByText('Notification Center')).toBeInTheDocument();
    });

    const dropdown = screen
      .getByText('Notification Center')
      .closest('div')?.parentElement;
    const closeButton = dropdown?.querySelector('button:last-of-type');
    expect(closeButton).toBeTruthy();
    if (closeButton) fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Notification Center')).not.toBeInTheDocument();
    });
  });

  it('fetches notifications on mount if not loaded', () => {
    const fetchNotifications = vi.fn().mockResolvedValue(undefined);

    mockUseNotificationStore.mockImplementation(
      (selector?: (s: Record<string, unknown>) => unknown) => {
        const store = {
          notifications: [],
          isLoaded: false,
          fetchNotifications,
          markAsRead: vi.fn(),
          markAllAsRead: vi.fn(),
        } as unknown as Record<string, unknown>;
        return selector ? selector(store) : store;
      },
    );

    render(React.createElement(NotificationCenter));

    expect(fetchNotifications).toHaveBeenCalled();
  });
});
