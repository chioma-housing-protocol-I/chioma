import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    patch: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => React.createElement('a', { href, ...props }, children),
}));

vi.mock('@/components/notifications/NotificationItem', () => ({
  default: ({
    notification,
    onToggleRead,
  }: {
    notification: { id: string; title: string };
    onToggleRead: (id: string) => void;
  }) =>
    React.createElement(
      'div',
      { 'data-testid': `notif-${notification.id}` },
      React.createElement('span', null, notification.title),
      React.createElement(
        'button',
        { onClick: () => onToggleRead(notification.id) },
        'Toggle',
      ),
    ),
}));

import NotificationDropdown from '../NotificationDropdown';
import { useNotificationStore } from '@/store/notificationStore';

function resetStore() {
  useNotificationStore.setState({ notifications: [], isLoaded: true });
}

const makeNotification = (id: string, read = false) => ({
  id,
  type: 'payment' as const,
  title: `Notification ${id}`,
  body: 'Some body text',
  read,
  createdAt: new Date().toISOString(),
});

describe('NotificationDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  it('shows empty state message when there are no notifications', () => {
    render(
      React.createElement(NotificationDropdown, {
        viewAllHref: '/notifications',
        onClose: vi.fn(),
      }),
    );
    expect(screen.getByText('No notifications yet.')).toBeInTheDocument();
  });

  it('renders a list of notifications (up to 4)', () => {
    const notifications = Array.from({ length: 6 }, (_, i) =>
      makeNotification(`n-${i}`),
    );
    useNotificationStore.setState({ notifications, isLoaded: true });

    render(
      React.createElement(NotificationDropdown, {
        viewAllHref: '/notifications',
        onClose: vi.fn(),
      }),
    );

    // Should only show first 4
    expect(screen.getByTestId('notif-n-0')).toBeInTheDocument();
    expect(screen.getByTestId('notif-n-3')).toBeInTheDocument();
    expect(screen.queryByTestId('notif-n-4')).not.toBeInTheDocument();
  });

  it('shows the Notifications heading', () => {
    render(
      React.createElement(NotificationDropdown, {
        viewAllHref: '/notifications',
        onClose: vi.fn(),
      }),
    );
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('shows unread badge count in the header', () => {
    useNotificationStore.setState({
      notifications: [
        makeNotification('n-1', false),
        makeNotification('n-2', true),
      ],
      isLoaded: true,
    });
    render(
      React.createElement(NotificationDropdown, {
        viewAllHref: '/notifications',
        onClose: vi.fn(),
      }),
    );
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows the Mark all read button when there are unread notifications', () => {
    useNotificationStore.setState({
      notifications: [makeNotification('n-1', false)],
      isLoaded: true,
    });
    render(
      React.createElement(NotificationDropdown, {
        viewAllHref: '/notifications',
        onClose: vi.fn(),
      }),
    );
    expect(
      screen.getByRole('button', { name: /mark all read/i }),
    ).toBeInTheDocument();
  });

  it('hides the Mark all read button when all notifications are read', () => {
    useNotificationStore.setState({
      notifications: [makeNotification('n-1', true)],
      isLoaded: true,
    });
    render(
      React.createElement(NotificationDropdown, {
        viewAllHref: '/notifications',
        onClose: vi.fn(),
      }),
    );
    expect(
      screen.queryByRole('button', { name: /mark all read/i }),
    ).not.toBeInTheDocument();
  });

  it('calls markAllAsRead when the button is clicked', async () => {
    useNotificationStore.setState({
      notifications: [
        makeNotification('n-1', false),
        makeNotification('n-2', false),
      ],
      isLoaded: true,
    });
    render(
      React.createElement(NotificationDropdown, {
        viewAllHref: '/notifications',
        onClose: vi.fn(),
      }),
    );
    // Since markAllAsRead is async in the store, we need to wait for its effects
    fireEvent.click(screen.getByRole('button', { name: /mark all read/i }));

    // allow microtasks to flush
    await new Promise(process.nextTick);

    const state = useNotificationStore.getState();
    expect(state.notifications.every((n) => n.read)).toBe(true);
  });

  it('renders the View All link pointing to the provided href', () => {
    const { container } = render(
      React.createElement(NotificationDropdown, {
        viewAllHref: '/user/notifications',
        onClose: vi.fn(),
      }),
    );
    const viewAllText = screen.getByText(/view all notifications/i);
    expect(viewAllText).toBeInTheDocument();
    const anchor = viewAllText.closest('a');
    expect(anchor).toHaveAttribute('href', '/user/notifications');
  });
});
