import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    [key: string]: unknown;
  }) => React.createElement('img', { src, alt, ...props }),
}));

const mockUseAuth = vi.fn();
vi.mock('@/store/authStore', () => ({
  useAuth: () => mockUseAuth(),
}));

import { SettingsPageClient } from '../SettingsPageClient';

function mockFetchOnce(response: Partial<Response> & { ok: boolean }) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
    response as Response,
  );
}

describe('SettingsPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseAuth.mockReturnValue({ accessToken: null });

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
  });

  it('renders the settings page with default notification counts', async () => {
    render(<SettingsPageClient requireAuthGuard={false} />);

    expect(screen.getByText('Settings & Preferences')).toBeInTheDocument();
    expect(
      screen.getByText(
        'In-app summary: 3 email types and 2 push types are currently enabled.',
      ),
    ).toBeInTheDocument();
  });

  it('renders the account security card and password fields', () => {
    render(<SettingsPageClient requireAuthGuard={false} />);

    expect(screen.getByLabelText('Current password')).toBeInTheDocument();
    expect(screen.getByLabelText('New password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm new password')).toBeInTheDocument();
  });

  it('toggles a notification preference and persists it to localStorage', async () => {
    render(<SettingsPageClient requireAuthGuard={false} />);

    const emailSwitch = screen.getByLabelText('Email: New property matches');
    expect(emailSwitch).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(emailSwitch);

    await waitFor(() => {
      expect(emailSwitch).toHaveAttribute('aria-checked', 'false');
    });

    await waitFor(() => {
      const stored = JSON.parse(
        localStorage.getItem('chioma_user_preferences') ?? '{}',
      );
      expect(stored.notifications.email.newPropertyMatches).toBe(false);
    });

    expect(
      screen.getByText(
        'In-app summary: 2 email types and 2 push types are currently enabled.',
      ),
    ).toBeInTheDocument();
  });

  it('reverts the preference and shows an error banner when the sync fails', async () => {
    mockFetchOnce({ ok: false });

    render(<SettingsPageClient requireAuthGuard={false} />);

    const emailSwitch = screen.getByLabelText('Email: New property matches');
    fireEvent.click(emailSwitch);

    await waitFor(() => {
      expect(
        screen.getByText(
          'Unable to sync preferences to the server. Your changes were reverted.',
        ),
      ).toBeInTheDocument();
    });

    expect(emailSwitch).toHaveAttribute('aria-checked', 'true');
  });

  it('switches the appearance theme when a theme button is clicked', async () => {
    render(<SettingsPageClient requireAuthGuard={false} />);

    const darkButton = screen.getByRole('button', { name: 'Dark' });
    fireEvent.click(darkButton);

    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  it('shows validation errors when submitting an invalid password change', async () => {
    render(<SettingsPageClient requireAuthGuard={false} />);

    fireEvent.change(screen.getByLabelText('Current password'), {
      target: { value: 'short' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => {
      expect(
        screen.getAllByText('Current password must be at least 8 characters')
          .length,
      ).toBeGreaterThan(0);
    });
  });

  it('starts MFA setup and renders the QR code when a switch is enabled with a token', async () => {
    mockUseAuth.mockReturnValue({ accessToken: 'token-123' });
    // 1) GET /api/users/preferences (skip, keep local defaults)
    mockFetchOnce({ ok: false });
    // 2) GET /api/auth/mfa/status
    mockFetchOnce({ ok: true, json: async () => ({ mfaEnabled: false }) });
    // 3) POST /api/auth/mfa/enable
    mockFetchOnce({
      ok: true,
      json: async () => ({
        qrCodeUrl: 'https://example.com/qr.png',
        secret: 'SECRET123',
        backupCodes: ['aaa-111', 'bbb-222'],
      }),
    });

    render(<SettingsPageClient requireAuthGuard={false} />);

    await waitFor(() => {
      expect(
        screen.getByLabelText('Multi-factor authentication (MFA)'),
      ).toHaveAttribute('aria-checked', 'false');
    });

    fireEvent.click(screen.getByLabelText('Multi-factor authentication (MFA)'));

    await waitFor(() => {
      expect(screen.getByText('Complete MFA setup')).toBeInTheDocument();
    });

    expect(
      screen.getByAltText('MFA QR code for authenticator setup'),
    ).toHaveAttribute('src', 'https://example.com/qr.png');
  });
});
