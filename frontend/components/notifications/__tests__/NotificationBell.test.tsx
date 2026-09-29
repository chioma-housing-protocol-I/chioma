import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('@/components/notifications/NotificationDropdown', () => ({
  default: ({ onClose }: { onClose: () => void }) =>
    React.createElement(
      'div',
      { 'data-testid': 'notification-dropdown' },
      React.createElement('button', { onClick: onClose }, 'Close dropdown'),
    ),
}));

import NotificationBell from '../NotificationBell';
import { useNotificationStore } from '@/store/notificationStore';

function resetStore() {
  useNotificationStore.setState({ notifications: [], isLoaded: false });
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  it('renders the bell button', () => {
    render(
      React.createElement(NotificationBell, { viewAllHref: '/notifications' }),
    );
    expect(
      screen.getByRole('button', { name: /notifications/i }),
    ).toBeInTheDocument();
  });

  it('does not show an unread badge when there are no notifications', () => {
    render(
      React.createElement(NotificationBell, { viewAllHref: '/notifications' }),
    );
    expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();
  });

  it('shows the unread count badge when there are unread notifications', () => {
    useNotificationStore.setState({
      notifications: [
        {
          id: 'n-1',
          type: 'payment',
          title: 'Rent',
          body: 'Paid',
          read: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'n-2',
          type: 'message',
          title: 'Msg',
          body: 'Hello',
          read: true,
          createdAt: new Date().toISOString(),
        },
      ],
      isLoaded: true,
    });
    render(
      React.createElement(NotificationBell, { viewAllHref: '/notifications' }),
    );
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('caps the badge at "99+" when unread count exceeds 99', () => {
    const notifications = Array.from({ length: 100 }, (_, i) => ({
      id: `n-${i}`,
      type: 'payment' as const,
      title: `Notification ${i}`,
      body: 'Body',
      read: false,
      createdAt: new Date().toISOString(),
    }));
    useNotificationStore.setState({ notifications, isLoaded: true });
    render(
      React.createElement(NotificationBell, { viewAllHref: '/notifications' }),
    );
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('toggles the dropdown open on click', () => {
    useNotificationStore.setState({ notifications: [], isLoaded: true });
    render(
      React.createElement(NotificationBell, { viewAllHref: '/notifications' }),
    );
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
  });

  it('closes the dropdown when it emits onClose', () => {
    useNotificationStore.setState({ notifications: [], isLoaded: true });
    render(
      React.createElement(NotificationBell, { viewAllHref: '/notifications' }),
    );
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Close dropdown' }));
    expect(
      screen.queryByTestId('notification-dropdown'),
    ).not.toBeInTheDocument();
  });

  it('includes the aria-label with unread count', () => {
    useNotificationStore.setState({
      notifications: [
        {
          id: 'n-1',
          type: 'payment',
          title: 'Rent',
          body: 'Paid',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      isLoaded: true,
    });
    render(
      React.createElement(NotificationBell, { viewAllHref: '/notifications' }),
    );
    expect(
      screen.getByLabelText('Notifications (1 unread)'),
    ).toBeInTheDocument();
  });
});
