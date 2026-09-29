import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import React from 'react';

const mockRefetchRoles = vi.fn();
const mockRefetchPermissions = vi.fn();
const mockRefetchUsers = vi.fn();
const mockAssignRoleMutateAsync = vi.fn();
const mockUpdatePermissionsMutateAsync = vi.fn();

const mockUseAdminRoles = vi.fn();
const mockUseAdminPermissions = vi.fn();
const mockUseAdminUsers = vi.fn();

vi.mock('@/lib/query/hooks/use-admin-roles', () => ({
  useAdminRoles: () => mockUseAdminRoles(),
  useAdminPermissions: () => mockUseAdminPermissions(),
  useAssignUserRole: () => ({
    mutateAsync: mockAssignRoleMutateAsync,
    isPending: false,
  }),
  useUpdateRolePermissions: () => ({
    mutateAsync: mockUpdatePermissionsMutateAsync,
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
vi.mock('react-hot-toast', () => ({
  default: toastMock,
}));

import { RoleManagement } from '../RoleManagement';

const permission1 = {
  id: 'perm-1',
  name: 'read-properties',
  description: 'Read properties',
  resource: 'properties',
  action: 'read',
  isActive: true,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};
const permission2 = {
  id: 'perm-2',
  name: 'write-properties',
  description: 'Write properties',
  resource: 'properties',
  action: 'write',
  isActive: true,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

const roleAdmin = {
  id: 'role-admin',
  name: 'admin',
  description: 'Administrator role',
  isActive: true,
  permissions: [permission1],
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};
const roleUser = {
  id: 'role-user',
  name: 'user',
  description: 'Standard user role',
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
  mockUseAdminRoles.mockReturnValue({
    data: [roleAdmin, roleUser],
    isLoading: false,
    refetch: mockRefetchRoles,
  });
  mockUseAdminPermissions.mockReturnValue({
    data: [permission1, permission2],
    isLoading: false,
    refetch: mockRefetchPermissions,
  });
  mockUseAdminUsers.mockReturnValue({
    data: { data: [userAlice, userBob] },
    isLoading: false,
    refetch: mockRefetchUsers,
  });
}

describe('RoleManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDefaultMocks();
    mockAssignRoleMutateAsync.mockResolvedValue(undefined);
    mockUpdatePermissionsMutateAsync.mockResolvedValue(undefined);
  });

  it('renders roles, stat cards, and the user assignment table', () => {
    render(<RoleManagement />);

    expect(screen.getByText('Role Management')).toBeInTheDocument();
    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0);
    expect(screen.getAllByText('User').length).toBeGreaterThan(0);
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('shows an empty state while roles are loading', () => {
    mockUseAdminRoles.mockReturnValue({
      data: [],
      isLoading: true,
      refetch: mockRefetchRoles,
    });

    render(<RoleManagement />);

    expect(screen.getByText('Loading roles...')).toBeInTheDocument();
  });

  it('selects a role and toggles a permission, then saves changes', async () => {
    render(<RoleManagement />);

    const rolesSection = screen
      .getByRole('heading', { name: 'Available Roles' })
      .closest('section')!;
    fireEvent.click(within(rolesSection).getByText('User'));

    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(mockUpdatePermissionsMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ roleId: 'role-user' }),
      );
    });
    expect(toastMock.success).toHaveBeenCalledWith('User permissions updated');
  });

  it('filters users by search text', () => {
    render(<RoleManagement />);

    const searchInput = screen.getByPlaceholderText(
      'Search users by name or email...',
    );
    fireEvent.change(searchInput, { target: { value: 'alice' } });

    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.queryByText('bob@example.com')).not.toBeInTheDocument();
  });

  it('assigns a new role to a user from the table', async () => {
    render(<RoleManagement />);

    const row = screen.getByText('alice@example.com').closest('tr')!;
    const roleSelect = row.querySelector('select') as HTMLSelectElement;

    fireEvent.change(roleSelect, { target: { value: 'admin' } });

    const saveButton = row.querySelector(
      'button:not([disabled])',
    ) as HTMLButtonElement;
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockAssignRoleMutateAsync).toHaveBeenCalledWith({
        userId: 'user-1',
        role: 'admin',
      });
    });
    expect(toastMock.success).toHaveBeenCalledWith(
      'Assigned Admin role to alice@example.com',
    );
  });

  it('refreshes all data sources when the refresh button is clicked', async () => {
    mockRefetchRoles.mockResolvedValue(undefined);
    mockRefetchPermissions.mockResolvedValue(undefined);
    mockRefetchUsers.mockResolvedValue(undefined);

    render(<RoleManagement />);

    fireEvent.click(screen.getByTitle('Refresh'));

    await waitFor(() => {
      expect(mockRefetchRoles).toHaveBeenCalled();
      expect(mockRefetchPermissions).toHaveBeenCalled();
      expect(mockRefetchUsers).toHaveBeenCalled();
    });
    expect(toastMock.success).toHaveBeenCalledWith(
      'Role management data refreshed',
    );
  });
});
