import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import React from 'react';

const mockUseAdminRoles = vi.fn();
const mockUseAdminUsers = vi.fn();
const mockAssignRoleMutateAsync = vi.fn();
const mockRefetch = vi.fn();

vi.mock('@/lib/query/hooks/use-admin-roles', () => ({
  useAdminRoles: () => mockUseAdminRoles(),
  useAssignUserRole: () => ({
    mutateAsync: mockAssignRoleMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/lib/query/hooks/use-admin-users', () => ({
  useAdminUsers: () => mockUseAdminUsers(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: toastMock }));

import { RoleAssignment } from '../RoleAssignment';

const roleAdmin = {
  id: 'role-admin',
  name: 'admin',
  description: '',
  isActive: true,
  permissions: [],
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};
const roleUser = {
  id: 'role-user',
  name: 'user',
  description: '',
  isActive: true,
  permissions: [],
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

const userAlice = {
  id: 'user-1',
  email: 'alice@example.com',
  name: 'Alice',
  role: 'user' as const,
  isVerified: true,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};
const userBob = {
  id: 'user-2',
  email: 'bob@example.com',
  name: 'Bob',
  role: 'admin' as const,
  isVerified: true,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

function setDefaultMocks() {
  mockUseAdminRoles.mockReturnValue({ data: [roleAdmin, roleUser] });
  mockUseAdminUsers.mockReturnValue({
    data: { data: [userAlice, userBob] },
    isLoading: false,
    refetch: mockRefetch,
  });
}

describe('RoleAssignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDefaultMocks();
    mockAssignRoleMutateAsync.mockResolvedValue(undefined);
    mockRefetch.mockResolvedValue(undefined);
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
  });

  it('renders the users table with stats', () => {
    render(<RoleAssignment />);

    expect(screen.getByText('Role Assignments')).toBeInTheDocument();
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('shows a loading state while users are loading', () => {
    mockUseAdminUsers.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: mockRefetch,
    });
    render(<RoleAssignment />);

    expect(screen.getByText('Loading users...')).toBeInTheDocument();
  });

  it('filters users by search text', () => {
    render(<RoleAssignment />);

    fireEvent.change(
      screen.getByPlaceholderText('Search by name or email...'),
      { target: { value: 'bob' } },
    );

    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument();
  });

  it('selects users and performs a bulk role assignment', async () => {
    render(<RoleAssignment />);

    const checkboxes = screen.getAllByRole('checkbox');
    // checkboxes[0] is the "select all" header checkbox
    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);

    const bulkSection = screen.getByText('Bulk Operations')
      .parentElement as HTMLElement;
    const bulkRoleSelect = within(bulkSection).getByRole('combobox');
    fireEvent.change(bulkRoleSelect, { target: { value: 'admin' } });

    fireEvent.click(screen.getByText('Assign to 2 Users'));

    await waitFor(() => {
      expect(mockAssignRoleMutateAsync).toHaveBeenCalledTimes(2);
    });
    expect(toastMock.success).toHaveBeenCalledWith('Assigned Admin to 2 users');
  });

  it('assigns a role to a single user from the table row', async () => {
    render(<RoleAssignment />);

    const row = screen.getByText('alice@example.com').closest('tr')!;
    const selects = row.querySelectorAll('select');
    const roleSelect = selects[0] as HTMLSelectElement;

    fireEvent.change(roleSelect, { target: { value: 'admin' } });
    fireEvent.click(within(row).getByText('Save'));

    await waitFor(() => {
      expect(mockAssignRoleMutateAsync).toHaveBeenCalledWith({
        userId: 'user-1',
        role: 'admin',
      });
    });
    expect(toastMock.success).toHaveBeenCalledWith(
      'Assigned Admin to alice@example.com',
    );
  });

  it('exports user role data as CSV', () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    render(<RoleAssignment />);
    fireEvent.click(screen.getByTitle('Export'));

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledWith('Data exported');

    clickSpy.mockRestore();
  });
});
