import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuthStore } from '@/store/authStore';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/user',
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setAuthState(overrides: {
  isAuthenticated?: boolean;
  loading?: boolean;
}) {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    loading: true,
    walletAddress: null,
    ...overrides,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it('renders loading spinner while auth state is being hydrated', () => {
    setAuthState({ loading: true, isAuthenticated: false });
    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText('Verifying authentication…')).toBeDefined();
    expect(screen.queryByText('Protected content')).toBeNull();
  });

  it('renders children when authenticated and not loading', () => {
    setAuthState({ isAuthenticated: true, loading: false });
    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText('Protected content')).toBeDefined();
  });

  it('renders nothing when not authenticated and not loading', () => {
    setAuthState({ isAuthenticated: false, loading: false });
    const { container } = render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>,
    );
    expect(screen.queryByText('Protected content')).toBeNull();
    expect(container.innerHTML).toBe('');
  });

  it('calls router.replace("/") when unauthenticated after loading', () => {
    setAuthState({ isAuthenticated: false, loading: false });
    render(
      <ProtectedRoute>
        <div>Content</div>
      </ProtectedRoute>,
    );
    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('does not redirect when authenticated', () => {
    setAuthState({ isAuthenticated: true, loading: false });
    render(
      <ProtectedRoute>
        <div>Content</div>
      </ProtectedRoute>,
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not redirect while still loading', () => {
    setAuthState({ loading: true, isAuthenticated: false });
    render(
      <ProtectedRoute>
        <div>Content</div>
      </ProtectedRoute>,
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows the animated spinner element while loading', () => {
    setAuthState({ loading: true });
    const { container } = render(
      <ProtectedRoute>
        <div />
      </ProtectedRoute>,
    );
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
  });

  it('does not gate wallet-only accounts that have no email yet', () => {
    // Those users reach the dashboard and are prompted by WalletEmailBanner,
    // so this guard must let them through.
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: '',
        emailVerified: false,
        firstName: 'Ada',
        lastName: 'Okafor',
        role: 'user',
      },
      accessToken: 'token',
      refreshToken: null,
      isAuthenticated: true,
      loading: false,
      walletAddress: 'GABC',
    });

    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>,
    );

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText('Protected content')).toBeDefined();
  });
});
