import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock('@/components/admin/ActivityTimeline', () => ({
  ActivityTimeline: ({ userId }: { userId: string }) =>
    React.createElement('div', { 'data-testid': 'activity-timeline' }, userId),
}));

const useAdminUserDetailBundleMock = vi.fn();
vi.mock('@/lib/query/hooks/use-admin-user-detail', () => ({
  useAdminUserDetailBundle: (...args: unknown[]) =>
    useAdminUserDetailBundleMock(...args),
}));

const useUserTransactionsMock = vi.fn();
vi.mock('@/lib/query/hooks/use-transactions', () => ({
  useUserTransactions: (...args: unknown[]) => useUserTransactionsMock(...args),
}));

const suspendMutateAsync = vi.fn();
const activateMutateAsync = vi.fn();
const verifyMutateAsync = vi.fn();
vi.mock('@/lib/query/hooks/use-admin-users', () => ({
  useSuspendUser: () => ({
    mutateAsync: suspendMutateAsync,
    isPending: false,
  }),
  useActivateUser: () => ({
    mutateAsync: activateMutateAsync,
    isPending: false,
  }),
  useVerifyUser: () => ({ mutateAsync: verifyMutateAsync, isPending: false }),
}));

import toast from 'react-hot-toast';
import { AdminUserDetailView } from '../AdminUserDetailView';

const refetchMock = vi.fn();

const mockUser = {
  id: 'user-1',
  email: 'jane@example.com',
  name: 'Jane Doe',
  role: 'admin' as const,
  phone: '+1 555 000 1111',
  avatar: undefined,
  isVerified: false,
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
};

const mockExtras = {
  kycStatus: 'PENDING' as const,
  kycUpdatedAt: '2024-02-01T00:00:00.000Z',
  kycNotes: 'Awaiting document review.',
  accountStatus: 'active' as const,
  properties: [
    {
      id: 'prop-1',
      title: 'Sunset Apartments, Unit 4B',
      address: 'Lekki Phase 1, Lagos',
      role: 'landlord',
      status: 'active',
    },
  ],
  agreementCount: 1,
};

function setup({
  isLoading = false,
  isError = false,
  user = mockUser,
  extras = mockExtras,
  transactions = [
    {
      id: 'tx-1',
      type: 'payment' as const,
      amount: 500,
      currency: 'USD',
      status: 'completed' as const,
      description: 'Rent payment',
      createdAt: '2024-03-01T00:00:00.000Z',
    },
  ],
  txLoading = false,
} = {}) {
  useAdminUserDetailBundleMock.mockReturnValue({
    data: isError ? undefined : { user, extras },
    isLoading,
    isError,
    refetch: refetchMock,
  });
  useUserTransactionsMock.mockReturnValue({
    data: { data: transactions },
    isLoading: txLoading,
  });
}

describe('AdminUserDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state while the user bundle is loading', () => {
    setup({ isLoading: true });
    render(<AdminUserDetailView userId="user-1" />);

    expect(screen.getByText('Loading user…')).toBeInTheDocument();
  });

  it('shows an error state when the bundle fails to load', () => {
    setup({ isError: true });
    render(<AdminUserDetailView userId="user-1" />);

    expect(screen.getByText('Could not load user')).toBeInTheDocument();
    expect(screen.getByText('Back to users')).toBeInTheDocument();
  });

  it('renders user profile, KYC status, and properties', () => {
    setup();
    render(<AdminUserDetailView userId="user-1" />);

    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThan(0);
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Unverified')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText('Awaiting document review.')).toBeInTheDocument();
    expect(screen.getByText('Sunset Apartments, Unit 4B')).toBeInTheDocument();
    expect(screen.getByText('1 active agreement')).toBeInTheDocument();
  });

  it('renders the transactions table', () => {
    setup();
    render(<AdminUserDetailView userId="user-1" />);

    expect(screen.getByText('payment')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('shows a transactions loading spinner separately from the page loading state', () => {
    setup({ txLoading: true, transactions: [] });
    render(<AdminUserDetailView userId="user-1" />);

    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThan(0);
    expect(
      screen.queryByText('No transactions found.'),
    ).not.toBeInTheDocument();
  });

  it('shows "No transactions found." when there are none', () => {
    setup({ transactions: [] });
    render(<AdminUserDetailView userId="user-1" />);

    expect(screen.getByText('No transactions found.')).toBeInTheDocument();
  });

  it('shows the Mark verified button for an unverified user and calls verifyUser', async () => {
    verifyMutateAsync.mockResolvedValue(undefined);
    setup();
    render(<AdminUserDetailView userId="user-1" />);

    const verifyButton = screen.getByText('Mark verified');
    fireEvent.click(verifyButton);

    await waitFor(() => {
      expect(verifyMutateAsync).toHaveBeenCalledWith('user-1');
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('User marked verified');
    });
  });

  it('does not show the Mark verified button for a verified user', () => {
    setup({ user: { ...mockUser, isVerified: true } });
    render(<AdminUserDetailView userId="user-1" />);

    expect(screen.queryByText('Mark verified')).not.toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('opens the suspend confirmation dialog and suspends the user', async () => {
    suspendMutateAsync.mockResolvedValue(undefined);
    setup();
    render(<AdminUserDetailView userId="user-1" />);

    fireEvent.click(screen.getByText('Suspend account'));

    expect(screen.getByText('Suspend this user?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }));

    await waitFor(() => {
      expect(suspendMutateAsync).toHaveBeenCalledWith('user-1');
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('User suspended');
    });
  });

  it('shows Reactivate account for a suspended user and calls activateUser', async () => {
    activateMutateAsync.mockResolvedValue(undefined);
    setup({ extras: { ...mockExtras, accountStatus: 'suspended' } });
    render(<AdminUserDetailView userId="user-1" />);

    expect(screen.getByText('Suspended')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Reactivate account'));

    await waitFor(() => {
      expect(activateMutateAsync).toHaveBeenCalledWith('user-1');
    });
  });

  it('navigates back to the users list when the back button is clicked', () => {
    setup();
    render(<AdminUserDetailView userId="user-1" />);

    fireEvent.click(screen.getByLabelText('Back to users'));
    expect(pushMock).toHaveBeenCalledWith('/admin/users');
  });
});
