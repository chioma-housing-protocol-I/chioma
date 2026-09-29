import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import type { MaintenanceRequest } from '../types';

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

const authState = vi.hoisted(() => ({
  user: { role: 'user' } as { role: string } | null,
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: { user: unknown }) => unknown) =>
    selector(authState),
}));

vi.mock('../api', () => ({
  fetchMaintenanceRequests: vi.fn(),
  submitMaintenanceRequest: vi.fn(),
  updateMaintenanceRequest: vi.fn(),
}));

class MockEventSource {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();
}

vi.stubGlobal('EventSource', MockEventSource);

import MaintenanceFlow from '../MaintenanceFlow';
import { fetchMaintenanceRequests, submitMaintenanceRequest } from '../api';

const buildRequest = (
  overrides: Partial<MaintenanceRequest> = {},
): MaintenanceRequest => ({
  id: 'req-1',
  propertyId: 'prop-1',
  propertyName: 'Sunset View Apartments',
  category: 'Plumbing',
  description: 'Leaking kitchen faucet',
  priority: 'urgent',
  status: 'open',
  createdAt: new Date('2026-01-01').toISOString(),
  updatedAt: new Date('2026-01-01').toISOString(),
  media: [],
  ...overrides,
});

describe('MaintenanceFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = { role: 'user' };
  });

  it('renders the maintenance requests list for a signed-in user', async () => {
    (fetchMaintenanceRequests as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildRequest(),
    ]);

    render(React.createElement(MaintenanceFlow));

    expect(
      await screen.findByRole('heading', { name: 'Sunset View Apartments' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Leaking kitchen faucet/)).toBeInTheDocument();
    // Regular users get the submission form, not the manager filters.
    expect(screen.getByText('Submit Maintenance Request')).toBeInTheDocument();
    expect(screen.queryByText('All properties')).not.toBeInTheDocument();
  });

  it('shows the empty state when there are no requests', async () => {
    (fetchMaintenanceRequests as ReturnType<typeof vi.fn>).mockResolvedValue(
      [],
    );

    render(React.createElement(MaintenanceFlow));

    expect(
      await screen.findByText('No maintenance requests'),
    ).toBeInTheDocument();
  });

  it('shows an error banner when loading requests fails', async () => {
    (fetchMaintenanceRequests as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('network down'),
    );

    render(React.createElement(MaintenanceFlow));

    expect(
      await screen.findByText('Unable to load maintenance requests right now.'),
    ).toBeInTheDocument();
  });

  it('lets a manager filter, and switch to board view with status columns', async () => {
    authState.user = { role: 'admin' };
    (fetchMaintenanceRequests as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildRequest({ id: 'req-1', status: 'open' }),
      buildRequest({ id: 'req-2', status: 'resolved' }),
    ]);

    render(React.createElement(MaintenanceFlow));

    await screen.findAllByRole('heading', { name: 'Sunset View Apartments' });

    // Manager-only property/status filters are visible.
    expect(screen.getByText('All properties')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /board/i }));

    // Board view groups requests under status columns.
    const openColumnHeading = screen.getByRole('heading', { name: 'Open' });
    const column = openColumnHeading.closest('div')?.parentElement;
    expect(column).toBeTruthy();
    if (column) {
      expect(
        within(column).getAllByRole('heading', {
          name: 'Sunset View Apartments',
        }).length,
      ).toBeGreaterThan(0);
    }
  });

  it('submits a new maintenance request and shows it in the list', async () => {
    (fetchMaintenanceRequests as ReturnType<typeof vi.fn>).mockResolvedValue(
      [],
    );
    const created = buildRequest({
      id: 'req-new',
      propertyName: 'Pine Tree Townhouse',
      description: 'Broken heater',
    });
    (submitMaintenanceRequest as ReturnType<typeof vi.fn>).mockResolvedValue(
      created,
    );

    render(React.createElement(MaintenanceFlow));

    await screen.findByText('No maintenance requests');

    fireEvent.change(
      screen.getByPlaceholderText(
        'Help our maintenance team understand the issue...',
      ),
      { target: { value: 'Broken heater' } },
    );

    fireEvent.click(
      screen.getByRole('button', { name: /finalize and submit/i }),
    );

    expect(await screen.findByText('Pine Tree Townhouse')).toBeInTheDocument();
    expect(submitMaintenanceRequest).toHaveBeenCalledTimes(1);
  });
});
