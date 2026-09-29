import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { WalletEmailBanner } from '@/components/user/WalletEmailBanner';
import { useAuthStore } from '@/store/authStore';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

function setUser(email: string) {
  useAuthStore.setState({
    user: {
      id: 'u1',
      email,
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
}

/** The banner reveals itself on a scheduler tick, so flush timers. */
function renderBanner() {
  const result = render(<WalletEmailBanner />);
  act(() => {
    vi.runAllTimers();
  });
  return result;
}

describe('WalletEmailBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });

  it('prompts a wallet-only account with no email', () => {
    setUser('');
    renderBanner();
    expect(screen.getByText('Add an email address')).toBeDefined();
  });

  it('stays hidden once the account has an email', () => {
    setUser('ada@example.com');
    renderBanner();
    expect(screen.queryByText('Add an email address')).toBeNull();
  });

  it('links to the complete-profile page rather than blocking', () => {
    setUser('');
    renderBanner();
    const link = screen.getByRole('link', { name: /add email/i });
    expect(link.getAttribute('href')).toBe('/complete-profile');
  });

  it('dismissing hides it and remembers the choice for the session', () => {
    setUser('');
    renderBanner();

    fireEvent.click(screen.getByLabelText('Dismiss'));

    expect(screen.queryByText('Add an email address')).toBeNull();
    expect(sessionStorage.getItem('chioma_onboarding_email_skipped')).toBe('1');
  });

  it('stays hidden on a later render after being dismissed', () => {
    sessionStorage.setItem('chioma_onboarding_email_skipped', '1');
    setUser('');
    renderBanner();
    expect(screen.queryByText('Add an email address')).toBeNull();
  });
});
