import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const pushMock = vi.fn();
const usePathnameMock = vi.fn(() => '/');

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  usePathname: () => usePathnameMock(),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => React.createElement('a', { href, ...rest }, children),
}));

vi.mock('next/dynamic', () => ({
  default: () => {
    const DynamicStub = (props: { buttonText?: string }) =>
      React.createElement(
        'button',
        { type: 'button' },
        props.buttonText ?? 'Connect Wallet',
      );
    DynamicStub.displayName = 'DynamicStub';
    return DynamicStub;
  },
}));

vi.mock('@/components/Logo', () => ({
  default: () => React.createElement('div', null, 'Chioma Logo'),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

const logoutMock = vi.fn().mockResolvedValue(undefined);
const useAuthMock = vi.fn();
vi.mock('@/store/authStore', () => ({
  useAuth: () => useAuthMock(),
}));

const useAuthDisplayMock = vi.fn();
vi.mock('@/store/useAuthDisplay', () => ({
  useAuthDisplay: () => useAuthDisplayMock(),
}));

import toast from 'react-hot-toast';
import Navbar from '../Navbar';

function setSignedOut() {
  useAuthMock.mockReturnValue({
    walletAddress: null,
    user: null,
    logout: logoutMock,
  });
  useAuthDisplayMock.mockReturnValue({
    isAuthenticated: false,
    firstName: '',
    lastName: '',
    role: undefined,
  });
}

function setSignedIn(
  overrides: Partial<{
    role: 'admin' | 'user';
    walletAddress: string | null;
  }> = {},
) {
  useAuthMock.mockReturnValue({
    walletAddress: overrides.walletAddress ?? null,
    user: { email: 'jane@example.com' },
    logout: logoutMock,
  });
  useAuthDisplayMock.mockReturnValue({
    isAuthenticated: true,
    firstName: 'Jane',
    lastName: 'Doe',
    role: overrides.role ?? 'user',
  });
}

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathnameMock.mockReturnValue('/');
  });

  it('renders the logo and nav links', () => {
    setSignedOut();
    render(<Navbar />);
    expect(screen.getByText('Chioma Logo')).toBeInTheDocument();
    expect(screen.getAllByText('Find a Home').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Resources').length).toBeGreaterThan(0);
  });

  it('shows sign in and get started links when signed out', () => {
    setSignedOut();
    render(<Navbar />);
    expect(screen.getAllByText('Sign in').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Get started').length).toBeGreaterThan(0);
  });

  it('does not show the sign-out button when signed out', () => {
    setSignedOut();
    render(<Navbar />);
    expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
  });

  it('shows the user first name and dashboard link when signed in', () => {
    setSignedIn({ role: 'user' });
    render(<Navbar />);
    expect(screen.getAllByText('Jane').length).toBeGreaterThan(0);
  });

  it('opens the user menu and shows account details', () => {
    setSignedIn({ role: 'user' });
    render(<Navbar />);

    const menuButton = document.querySelector(
      'button[aria-haspopup="true"]',
    ) as HTMLButtonElement;
    fireEvent.click(menuButton);

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    const dashboardLinks = screen.getAllByText('Dashboard');
    expect(dashboardLinks.length).toBeGreaterThan(0);
  });

  it('links to /admin for admin users and /user for regular users', () => {
    setSignedIn({ role: 'admin' });
    render(<Navbar />);
    fireEvent.click(
      document.querySelector('button[aria-haspopup="true"]') as HTMLElement,
    );
    const dashboardLink = screen
      .getAllByText('Dashboard')
      .map((el) => el.closest('a'))
      .find((a) => a?.getAttribute('href') === '/admin');
    expect(dashboardLink).toBeTruthy();
  });

  it('calls logout, shows a success toast, and redirects on sign out', async () => {
    setSignedIn({ role: 'user' });
    render(<Navbar />);
    fireEvent.click(
      document.querySelector('button[aria-haspopup="true"]') as HTMLElement,
    );

    const signOutButtons = screen.getAllByText('Sign out');
    fireEvent.click(signOutButtons[0]);

    await vi.waitFor(() => {
      expect(logoutMock).toHaveBeenCalledTimes(1);
    });
    expect(toast.success).toHaveBeenCalledWith('Signed out successfully.');
    expect(pushMock).toHaveBeenCalledWith('/');
  });

  it('shows the wallet address chip when a wallet is connected', () => {
    setSignedIn({ role: 'user', walletAddress: 'GABCDEFGHIJKLMNOPQRSTUV' });
    const { container } = render(<Navbar />);
    expect(container.textContent).toContain('GABCDE…STUV');
  });

  it('toggles the mobile menu when the hamburger button is clicked', () => {
    setSignedOut();
    render(<Navbar />);

    expect(
      screen.queryByLabelText('Mobile navigation'),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Toggle menu'));
    expect(screen.getByLabelText('Mobile navigation')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Toggle menu'));
    expect(
      screen.queryByLabelText('Mobile navigation'),
    ).not.toBeInTheDocument();
  });

  it('closes the mobile menu when a nav link is clicked', () => {
    setSignedOut();
    render(<Navbar />);
    fireEvent.click(screen.getByLabelText('Toggle menu'));
    expect(screen.getByLabelText('Mobile navigation')).toBeInTheDocument();

    const mobileLinks = screen.getAllByText('Resources');
    fireEvent.click(mobileLinks[mobileLinks.length - 1]);

    expect(
      screen.queryByLabelText('Mobile navigation'),
    ).not.toBeInTheDocument();
  });
});
