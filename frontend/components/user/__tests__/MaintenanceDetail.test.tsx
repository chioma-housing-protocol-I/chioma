import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const addCommentMutate = vi.fn();
const updateMutate = vi.fn();
const scheduleMutate = vi.fn();

const useLandlordMaintenanceDetailMock = vi.fn();

vi.mock('@/lib/query/hooks/use-landlord-maintenance-detail', () => ({
  useLandlordMaintenanceDetail: (id: string) =>
    useLandlordMaintenanceDetailMock(id),
  useAddMaintenanceComment: () => ({
    mutate: addCommentMutate,
    isPending: false,
  }),
  useUpdateMaintenance: () => ({
    mutate: updateMutate,
    isPending: false,
  }),
  useScheduleMaintenance: () => ({
    mutate: scheduleMutate,
    isPending: false,
  }),
}));

vi.mock('@/lib/utils/date-fns-locale', () => ({
  useDateFnsLocale: () => undefined,
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    user: { firstName: 'Lisa', lastName: 'Landlord' },
  }),
}));

import { MaintenanceDetail } from '../MaintenanceDetail';

const baseRequest = {
  id: 'mnt-001',
  requestId: 'MNT-2026-001',
  propertyName: 'Sunset Apartments, Unit 4B',
  propertyId: 'prop-001',
  tenant: {
    id: 'tenant-001',
    name: 'Chioma Okafor',
    email: 'chioma@example.com',
    phone: '+234 805 123 4567',
  },
  title: 'Water leak in bathroom',
  description: 'Water is leaking from the ceiling in the bathroom.',
  status: 'OPEN' as const,
  priority: 'HIGH' as const,
  assignedTo: {
    id: 'maint-001',
    name: 'Emeka Plumbing Services',
    phone: '+234 801 234 5678',
    email: 'emeka@example.com',
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  photos: [
    {
      id: 'photo-1',
      filename: 'leak.jpg',
      url: '/uploads/leak.jpg',
      uploadedAt: '2026-01-02T00:00:00.000Z',
    },
  ],
  comments: [
    {
      id: 'c-1',
      author: { id: 'u-1', name: 'Chioma Okafor', role: 'TENANT' },
      content: 'Please fix this soon.',
      createdAt: '2026-01-02T00:00:00.000Z',
    },
  ],
};

describe('MaintenanceDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state while the request is loading', () => {
    useLandlordMaintenanceDetailMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<MaintenanceDetail requestId="mnt-001" />);

    expect(
      screen.getByText('Loading maintenance details...'),
    ).toBeInTheDocument();
  });

  it('shows a not-found state on error', () => {
    useLandlordMaintenanceDetailMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('failed'),
    });

    render(<MaintenanceDetail requestId="mnt-001" />);

    expect(
      screen.getByText('Maintenance request not found'),
    ).toBeInTheDocument();
  });

  it('renders request details, tenant and assigned personnel', () => {
    useLandlordMaintenanceDetailMock.mockReturnValue({
      data: baseRequest,
      isLoading: false,
      error: null,
    });

    render(<MaintenanceDetail requestId="mnt-001" />);

    expect(
      screen.getByText('MNT-2026-001 - Water leak in bathroom'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Chioma Okafor').length).toBeGreaterThan(0);
    expect(screen.getByText('Emeka Plumbing Services')).toBeInTheDocument();
    expect(screen.getByText('Sunset Apartments, Unit 4B')).toBeInTheDocument();
  });

  it('shows the "no personnel assigned" state when nobody is assigned', () => {
    useLandlordMaintenanceDetailMock.mockReturnValue({
      data: { ...baseRequest, assignedTo: undefined },
      isLoading: false,
      error: null,
    });

    render(<MaintenanceDetail requestId="mnt-001" />);

    expect(screen.getByText('No personnel assigned yet')).toBeInTheDocument();
  });

  it('renders existing comments and photos', () => {
    useLandlordMaintenanceDetailMock.mockReturnValue({
      data: baseRequest,
      isLoading: false,
      error: null,
    });

    render(<MaintenanceDetail requestId="mnt-001" />);

    expect(screen.getByText('Please fix this soon.')).toBeInTheDocument();
    expect(screen.getByText('leak.jpg')).toBeInTheDocument();
    expect(screen.getByText('Comments (1)')).toBeInTheDocument();
    expect(screen.getByText('Photos (1)')).toBeInTheDocument();
  });

  it('submits a new comment and clears the textarea on success', () => {
    useLandlordMaintenanceDetailMock.mockReturnValue({
      data: baseRequest,
      isLoading: false,
      error: null,
    });
    addCommentMutate.mockImplementation((_vars, opts) => {
      opts?.onSuccess?.();
    });

    render(<MaintenanceDetail requestId="mnt-001" />);

    const textarea = screen.getByPlaceholderText('Add a comment or update...');
    fireEvent.change(textarea, { target: { value: 'On my way.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }));

    expect(addCommentMutate).toHaveBeenCalledWith(
      { requestId: 'mnt-001', content: 'On my way.' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    expect(textarea).toHaveValue('');
  });

  it('does not render the comment form when the request is completed', () => {
    useLandlordMaintenanceDetailMock.mockReturnValue({
      data: { ...baseRequest, status: 'COMPLETED' as const },
      isLoading: false,
      error: null,
    });

    render(<MaintenanceDetail requestId="mnt-001" />);

    expect(
      screen.queryByPlaceholderText('Add a comment or update...'),
    ).not.toBeInTheDocument();
  });

  it('schedules maintenance once date and time are provided', () => {
    useLandlordMaintenanceDetailMock.mockReturnValue({
      data: baseRequest,
      isLoading: false,
      error: null,
    });

    const { container } = render(<MaintenanceDetail requestId="mnt-001" />);

    const dateInput = container.querySelector(
      'input[type="date"]',
    ) as HTMLInputElement;
    const timeInput = container.querySelector(
      'input[type="time"]',
    ) as HTMLInputElement;

    fireEvent.change(dateInput, { target: { value: '2026-04-01' } });
    fireEvent.change(timeInput, { target: { value: '10:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Schedule' }));

    expect(scheduleMutate).toHaveBeenCalledWith({
      requestId: 'mnt-001',
      date: '2026-04-01',
      time: '10:00',
    });
  });
});
