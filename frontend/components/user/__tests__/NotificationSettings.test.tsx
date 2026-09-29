import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { UserPreferences } from '@/components/settings/types';

const getMock = vi.fn();
const patchMock = vi.fn();
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
  },
}));

import NotificationSettings from '../NotificationSettings';

function basePreferences(
  overrides: Partial<UserPreferences['notifications']> = {},
): UserPreferences {
  return {
    notifications: {
      email: {
        newPropertyMatches: true,
        paymentReminders: true,
        maintenanceUpdates: true,
      },
      push: {
        newMessages: true,
        criticalAlerts: false,
      },
      inAppSummary: true,
      ...overrides,
    },
    appearanceTheme: 'system',
    language: 'en',
    currency: 'USD',
  };
}

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe('NotificationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows a loading state before preferences resolve', () => {
    getMock.mockReturnValue(new Promise(() => {}));
    renderWithClient(<NotificationSettings userId="user-1" />);
    expect(
      screen.getByText('Loading notification preferences...'),
    ).toBeInTheDocument();
  });

  it('shows an error state when the preferences request fails', async () => {
    getMock.mockRejectedValue(new Error('Network down'));
    renderWithClient(<NotificationSettings userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Network down')).toBeInTheDocument();
    });
  });

  it('renders delivery preference cards once preferences load', async () => {
    getMock.mockResolvedValue({ data: basePreferences() });
    renderWithClient(<NotificationSettings userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Delivery Preferences')).toBeInTheDocument();
    });
    expect(screen.getByText('Email alerts')).toBeInTheDocument();
    expect(screen.getByText('SMS alerts')).toBeInTheDocument();
    expect(screen.getByText('In-app alerts')).toBeInTheDocument();

    // Email derives to "On" because at least one email preference is true.
    const emailCard = screen.getByText('Email alerts').closest('button');
    expect(emailCard).toHaveTextContent('On');
    // SMS has no server-side signal and no stored extra settings, so it's off.
    const smsCard = screen.getByText('SMS alerts').closest('button');
    expect(smsCard).toHaveTextContent('Off');
  });

  it('toggles the email channel and saves the updated preferences', async () => {
    getMock.mockResolvedValue({ data: basePreferences() });
    patchMock.mockResolvedValue({ data: {} });
    renderWithClient(<NotificationSettings userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Email alerts')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Email alerts').closest('button')!);

    await waitFor(() => {
      expect(patchMock).toHaveBeenCalledWith(
        '/users/preferences',
        expect.objectContaining({
          notifications: expect.objectContaining({
            email: expect.objectContaining({
              newPropertyMatches: false,
              paymentReminders: false,
              maintenanceUpdates: false,
            }),
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Preferences saved.')).toBeInTheDocument();
    });
  });

  it('changes the notification frequency when a frequency option is clicked', async () => {
    getMock.mockResolvedValue({ data: basePreferences() });
    patchMock.mockResolvedValue({ data: {} });
    renderWithClient(<NotificationSettings userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Daily digest')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Daily digest').closest('button')!);

    await waitFor(() => {
      expect(patchMock).toHaveBeenCalled();
    });

    // Frequency is stored client-side per user once the patch resolves.
    await waitFor(() => {
      const stored = localStorage.getItem(
        'chioma_landlord_notification_settings:user-1',
      );
      expect(stored).toContain('"frequency":"daily"');
    });
  });

  it('mutes a notification type when its checkbox is toggled', async () => {
    getMock.mockResolvedValue({ data: basePreferences() });
    patchMock.mockResolvedValue({ data: {} });
    renderWithClient(<NotificationSettings userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Payment')).toBeInTheDocument();
    });

    const paymentRow = screen.getByText('Payment').closest('label')!;
    const checkbox = paymentRow.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(patchMock).toHaveBeenCalledWith(
        '/users/preferences',
        expect.objectContaining({
          notifications: expect.objectContaining({
            email: expect.objectContaining({ paymentReminders: false }),
          }),
        }),
      );
    });
  });
});
