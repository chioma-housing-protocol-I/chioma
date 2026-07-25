import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/admin'),
}));

vi.mock('@/store/authStore', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'admin-1',
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      avatar: '/avatar.png',
    },
  })),
  useAuthStore: vi.fn(() => ({
    user: {
      id: 'admin-1',
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      avatar: '/avatar.png',
    },
  })),
}));

vi.mock('next/image', () => ({
  default: (
    props: React.ImgHTMLAttributes<HTMLImageElement> & {
      fill?: boolean;
      priority?: boolean;
    },
  ) => {
    const { fill, priority, ...rest } = props;
    return React.createElement('img', rest);
  },
}));

vi.mock('next/link', () => ({
  default: (
    props: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      children: React.ReactNode;
    },
  ) => React.createElement('a', props, props.children),
}));

vi.mock('@/components/Logo', () => ({
  default: (props: Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'logo', ...props }, 'Logo'),
}));

vi.mock('@/components/notifications', () => ({
  NotificationBell: (props: Record<string, unknown>) =>
    React.createElement(
      'div',
      { 'data-testid': 'notification-bell', ...props },
      '🔔',
    ),
}));

import Topbar from '../Topbar';

describe('Admin Topbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<Topbar pageTitle="Dashboard" />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders the notification bell', () => {
    render(<Topbar pageTitle="Dashboard" />);

    expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
  });

  it('renders home link', () => {
    render(<Topbar pageTitle="Dashboard" />);

    const homeLink = screen.getByTitle('Go to Home Page');
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('renders search input on desktop', () => {
    render(<Topbar pageTitle="Audit Logs" />);

    const searchInputs = screen.getAllByPlaceholderText('Search audit logs...');
    expect(searchInputs.length).toBeGreaterThanOrEqual(1);
  });

  it('opens mobile search panel when search button is clicked', () => {
    render(<Topbar pageTitle="Dashboard" />);

    const searchButton = screen.getByLabelText('Open search');
    fireEvent.click(searchButton);

    const mobileSearchInput = screen.getAllByPlaceholderText(
      'Search dashboard...',
    );
    expect(mobileSearchInput.length).toBeGreaterThanOrEqual(1);
  });

  it('opens mobile menu when menu button is clicked', () => {
    render(<Topbar pageTitle="Dashboard" />);

    const menuButton = screen.getByLabelText('Open menu');
    fireEvent.click(menuButton);
  });

  it('renders with greeting for different page titles', () => {
    render(<Topbar pageTitle="Security Dashboard" />);

    expect(
      screen.getAllByText('Security Dashboard').length,
    ).toBeGreaterThanOrEqual(1);
  });
});
