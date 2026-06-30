import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

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

import NotificationItem from '../NotificationItem';
import type { Notification } from '../types';

const base: Notification = {
  id: 'n-1',
  type: 'payment',
  title: 'Rent received',
  body: 'Your tenant paid $150,000 USDC',
  read: false,
  createdAt: new Date().toISOString(),
};

describe('NotificationItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the notification title', () => {
    render(
      React.createElement(NotificationItem, {
        notification: base,
        onToggleRead: vi.fn(),
      }),
    );
    expect(screen.getByText('Rent received')).toBeInTheDocument();
  });

  it('shows an unread indicator dot when notification is unread', () => {
    const { container } = render(
      React.createElement(NotificationItem, {
        notification: base,
        onToggleRead: vi.fn(),
      }),
    );
    const dot = container.querySelector('.rounded-full.bg-blue-400');
    expect(dot).toBeInTheDocument();
  });

  it('does not show the unread indicator dot when notification is read', () => {
    const { container } = render(
      React.createElement(NotificationItem, {
        notification: { ...base, read: true },
        onToggleRead: vi.fn(),
      }),
    );
    const dot = container.querySelector('.rounded-full.bg-blue-400');
    expect(dot).not.toBeInTheDocument();
  });

  it('shows the body text in full variant', () => {
    render(
      React.createElement(NotificationItem, {
        notification: base,
        onToggleRead: vi.fn(),
        variant: 'full',
      }),
    );
    expect(
      screen.getByText('Your tenant paid $150,000 USDC'),
    ).toBeInTheDocument();
  });

  it('does not render body text in compact variant', () => {
    render(
      React.createElement(NotificationItem, {
        notification: base,
        onToggleRead: vi.fn(),
        variant: 'compact',
      }),
    );
    expect(
      screen.queryByText('Your tenant paid $150,000 USDC'),
    ).not.toBeInTheDocument();
  });

  it('shows Mark read button for unread notification in full variant', () => {
    render(
      React.createElement(NotificationItem, {
        notification: base,
        onToggleRead: vi.fn(),
        variant: 'full',
      }),
    );
    expect(
      screen.getByRole('button', { name: /mark read/i }),
    ).toBeInTheDocument();
  });

  it('does not show Mark read button in compact variant', () => {
    render(
      React.createElement(NotificationItem, {
        notification: base,
        onToggleRead: vi.fn(),
        variant: 'compact',
      }),
    );
    expect(
      screen.queryByRole('button', { name: /mark read/i }),
    ).not.toBeInTheDocument();
  });

  it('calls onToggleRead with the notification id when Mark read is clicked', () => {
    const onToggleRead = vi.fn();
    render(
      React.createElement(NotificationItem, {
        notification: base,
        onToggleRead,
        variant: 'full',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /mark read/i }));
    expect(onToggleRead).toHaveBeenCalledWith('n-1');
  });

  it('renders a link when the notification has a link property', () => {
    render(
      React.createElement(NotificationItem, {
        notification: { ...base, link: '/payments' },
        onToggleRead: vi.fn(),
      }),
    );
    const anchor = screen.getByRole('link');
    expect(anchor).toHaveAttribute('href', '/payments');
  });

  it('does not render a wrapping link when there is no link property', () => {
    render(
      React.createElement(NotificationItem, {
        notification: base,
        onToggleRead: vi.fn(),
      }),
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders a maintenance-type notification with its title', () => {
    render(
      React.createElement(NotificationItem, {
        notification: { ...base, type: 'maintenance', title: 'AC repaired' },
        onToggleRead: vi.fn(),
      }),
    );
    expect(screen.getByText('AC repaired')).toBeInTheDocument();
  });

  it('renders a message-type notification with its title', () => {
    render(
      React.createElement(NotificationItem, {
        notification: { ...base, type: 'message', title: 'New message' },
        onToggleRead: vi.fn(),
      }),
    );
    expect(screen.getByText('New message')).toBeInTheDocument();
  });
});
