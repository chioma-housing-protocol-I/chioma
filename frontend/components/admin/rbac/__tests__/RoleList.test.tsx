import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

const useAdminRolesMock = vi.fn();
const useAdminPermissionsMock = vi.fn();
const deleteRoleMutateAsync = vi.fn();
const createRoleMutateAsync = vi.fn();
const updateRoleMutateAsync = vi.fn();
const updatePermissionsMutateAsync = vi.fn();
const refetchMock = vi.fn();

vi.mock('@/lib/query/hooks/use-admin-roles', () => ({
  useAdminRoles: () => useAdminRolesMock(),
  useAdminPermissions: () => useAdminPermissionsMock(),
  useDeleteRole: () => ({ mutateAsync: deleteRoleMutateAsync }),
  useCreateRole: () => ({
    mutateAsync: createRoleMutateAsync,
    isPending: false,
  }),
  useUpdateRole: () => ({
    mutateAsync: updateRoleMutateAsync,
    isPending: false,
  }),
  useUpdateRolePermissions: () => ({
    mutateAsync: updatePermissionsMutateAsync,
    isPending: false,
  }),
}));

const useAdminUsersMock = vi.fn();
vi.mock('@/lib/query/hooks/use-admin-users', () => ({
  useAdminUsers: (...args: unknown[]) => useAdminUsersMock(...args),
}));

import toast from 'react-hot-toast';
import { RoleList } from '../RoleList';

const mockRoles = [
  {
    id: 'role-1',
    name: 'admin',
    description: 'Full access role',
    permissions: [
      {
        id: 'perm-1',
        name: 'manage_users',
        action: 'manage',
        resource: 'users',
        description: 'Manage users',
      },
    ],
  },
  {
    id: 'role-2',
    name: 'support',
    description: 'Support staff role',
    permissions: [],
  },
];

function setup({
  roles = mockRoles,
  isLoading = false,
  users = [
    { id: 'u1', role: 'admin' },
    { id: 'u2', role: 'admin' },
  ],
  permissions = [
    {
      id: 'perm-1',
      name: 'manage_users',
      action: 'manage',
      resource: 'users',
      description: 'Manage users',
    },
  ],
} = {}) {
  useAdminRolesMock.mockReturnValue({
    data: roles,
    isLoading,
    refetch: refetchMock,
  });
  useAdminUsersMock.mockReturnValue({ data: { data: users } });
  useAdminPermissionsMock.mockReturnValue({ data: permissions });
}

describe('RoleList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    setup();
  });

  it('renders the roles list with user counts', () => {
    render(<RoleList />);

    expect(screen.getByText('Role Management')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
    expect(screen.getByText('2 users')).toBeInTheDocument();
  });

  it('shows a loading indicator while roles are loading', () => {
    setup({ isLoading: true });
    render(<RoleList />);

    expect(screen.getByText('Loading roles...')).toBeInTheDocument();
  });

  it('shows an empty state when there are no roles', () => {
    setup({ roles: [] });
    render(<RoleList />);

    expect(screen.getByText('No roles yet')).toBeInTheDocument();
  });

  it('filters the roles list by search term', () => {
    render(<RoleList />);

    const searchInput = screen.getByPlaceholderText('Search roles...');
    fireEvent.change(searchInput, { target: { value: 'support' } });

    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
  });

  it('shows a "no matching roles" message when the search has no results', () => {
    render(<RoleList />);

    fireEvent.change(screen.getByPlaceholderText('Search roles...'), {
      target: { value: 'nonexistent-role' },
    });

    expect(screen.getByText('No matching roles')).toBeInTheDocument();
  });

  it('shows a placeholder until a role is selected', () => {
    render(<RoleList />);

    expect(
      screen.getByText('Select a role to view details'),
    ).toBeInTheDocument();
  });

  it('shows role details and the permission matrix when a role is selected', () => {
    render(<RoleList />);

    fireEvent.click(screen.getByText('Support'));

    expect(
      screen.getByRole('heading', { name: 'Support' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Support staff role').length).toBeGreaterThan(0);
    expect(screen.getByText('No permissions assigned')).toBeInTheDocument();
  });

  it('toggles the create-role form', () => {
    render(<RoleList />);

    fireEvent.click(screen.getByText('New Role'));
    expect(screen.getByText('Create New Role')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Create New Role')).not.toBeInTheDocument();
  });

  it('deletes a role after confirmation', async () => {
    deleteRoleMutateAsync.mockResolvedValue(undefined);
    render(<RoleList />);

    fireEvent.click(screen.getByText('Support'));
    fireEvent.click(screen.getByTitle('Delete'));

    expect(window.confirm).toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(deleteRoleMutateAsync).toHaveBeenCalledWith('role-2');
    });
    await vi.waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Role deleted successfully');
    });
  });

  it('refreshes the roles list when the refresh button is clicked', async () => {
    refetchMock.mockResolvedValue(undefined);
    render(<RoleList />);

    fireEvent.click(screen.getByTitle('Refresh'));

    await vi.waitFor(() => {
      expect(refetchMock).toHaveBeenCalled();
    });
    await vi.waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Roles refreshed');
    });
  });
});
