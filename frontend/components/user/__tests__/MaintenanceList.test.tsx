import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import type { MaintenanceRecord } from '@/lib/query/hooks/use-landlord-maintenance';

const useLandlordMaintenanceMock = vi.fn();
vi.mock('@/lib/query/hooks/use-landlord-maintenance', () => ({
  useLandlordMaintenance: (...args: unknown[]) =>
    useLandlordMaintenanceMock(...args),
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

import { MaintenanceList } from '../MaintenanceList';

function makeRequest(
  overrides: Partial<MaintenanceRecord> = {},
): MaintenanceRecord {
  return {
    id: 'mnt-1',
    requestId: 'MNT-2026-001',
    propertyName: 'Sunset Apartments, Unit 4B',
    propertyId: 'prop-001',
    tenantName: 'Chioma Okafor',
    tenantId: 'tenant-001',
    title: 'Water leak in bathroom',
    description: 'Water is leaking from the ceiling.',
    status: 'OPEN',
    priority: 'HIGH',
    assignedTo: { id: 'm1', name: 'Emeka Plumbing', phone: '+234' },
    createdAt: '2026-03-25T10:00:00.000Z',
    updatedAt: '2026-03-25T10:00:00.000Z',
    deadline: '2026-03-28T18:00:00.000Z',
    commentCount: 3,
    photoCount: 2,
    ...overrides,
  };
}

describe('MaintenanceList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state while requests are fetching', () => {
    useLandlordMaintenanceMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    render(<MaintenanceList />);
    expect(
      screen.getByText('Loading maintenance requests...'),
    ).toBeInTheDocument();
  });

  it('shows an error state with a retry button', () => {
    useLandlordMaintenanceMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
    });
    render(<MaintenanceList />);
    expect(
      screen.getByText('Failed to load maintenance requests'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows an empty state when there are no requests', () => {
    useLandlordMaintenanceMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    render(<MaintenanceList />);
    expect(screen.getByText('No maintenance requests')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create Request' }),
    ).toBeInTheDocument();
  });

  it('renders a table row per maintenance request with status and priority badges', () => {
    useLandlordMaintenanceMock.mockReturnValue({
      data: [
        makeRequest(),
        makeRequest({
          id: 'mnt-2',
          requestId: 'MNT-2026-002',
          title: 'AC not cooling',
          status: 'COMPLETED',
          priority: 'LOW',
        }),
      ],
      isLoading: false,
      error: null,
    });
    render(<MaintenanceList />);

    expect(screen.getByText('Maintenance Requests')).toBeInTheDocument();
    expect(screen.getByText('MNT-2026-001')).toBeInTheDocument();
    expect(screen.getByText('MNT-2026-002')).toBeInTheDocument();
    expect(screen.getByText('Water leak in bathroom')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('2 requests')).toBeInTheDocument();
  });

  it('shows "Unassigned" for requests with no assignee', () => {
    useLandlordMaintenanceMock.mockReturnValue({
      data: [makeRequest({ assignedTo: undefined })],
      isLoading: false,
      error: null,
    });
    render(<MaintenanceList />);
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('updates the search filter as the user types, re-querying the hook', async () => {
    useLandlordMaintenanceMock.mockReturnValue({
      data: [makeRequest()],
      isLoading: false,
      error: null,
    });
    render(<MaintenanceList />);

    const searchInput = screen.getByPlaceholderText('Search requests...');
    fireEvent.change(searchInput, { target: { value: 'leak' } });

    await waitFor(() => {
      expect(useLandlordMaintenanceMock).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'leak' }),
      );
    });
  });

  it('links the view action to the request detail page', () => {
    useLandlordMaintenanceMock.mockReturnValue({
      data: [makeRequest({ id: 'mnt-42' })],
      isLoading: false,
      error: null,
    });
    render(<MaintenanceList />);

    const link = screen.getByRole('link', { name: /view details/i });
    expect(link).toHaveAttribute('href', '/landlords/maintenance/mnt-42');
  });

  it('disables the Previous pagination button on the first page', () => {
    useLandlordMaintenanceMock.mockReturnValue({
      data: [makeRequest()],
      isLoading: false,
      error: null,
    });
    render(<MaintenanceList />);

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  });
});
