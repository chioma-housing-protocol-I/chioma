import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import type { Permission, Role } from '@/types';

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastMock.success,
    error: toastMock.error,
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

const hooksState = vi.hoisted(() => ({
  permissions: [] as Permission[],
  isLoading: false,
  refetch: vi.fn().mockResolvedValue(undefined),
  roles: [] as Role[],
  deleteMutateAsync: vi.fn().mockResolvedValue(undefined),
  createMutateAsync: vi.fn().mockResolvedValue(undefined),
  updateMutateAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/query/hooks/use-admin-roles', () => ({
  useAdminPermissions: () => ({
    data: hooksState.permissions,
    isLoading: hooksState.isLoading,
    refetch: hooksState.refetch,
  }),
  useAdminRoles: () => ({ data: hooksState.roles }),
  useDeletePermission: () => ({
    mutateAsync: hooksState.deleteMutateAsync,
    isPending: false,
  }),
  useCreatePermission: () => ({
    mutateAsync: hooksState.createMutateAsync,
    isPending: false,
  }),
  useUpdatePermission: () => ({
    mutateAsync: hooksState.updateMutateAsync,
    isPending: false,
  }),
}));

import { PermissionList } from '../PermissionList';

const buildPermission = (overrides: Partial<Permission> = {}): Permission => ({
  id: 'perm-1',
  name: 'user_create',
  description: 'Allows creating users',
  resource: 'users',
  action: 'create',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('PermissionList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hooksState.permissions = [];
    hooksState.roles = [];
    hooksState.isLoading = false;
    hooksState.refetch = vi.fn().mockResolvedValue(undefined);
    hooksState.deleteMutateAsync = vi.fn().mockResolvedValue(undefined);
    hooksState.createMutateAsync = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('shows a loading indicator while permissions are loading', () => {
    hooksState.isLoading = true;
    render(React.createElement(PermissionList));
    expect(screen.getByText('Loading permissions...')).toBeInTheDocument();
  });

  it('shows an empty state when there are no permissions', () => {
    render(React.createElement(PermissionList));
    expect(screen.getByText('No permissions yet')).toBeInTheDocument();
    expect(
      screen.getByText('Select a permission to view details'),
    ).toBeInTheDocument();
  });

  it('lists permissions and shows details when one is selected', () => {
    hooksState.permissions = [
      buildPermission(),
      buildPermission({
        id: 'perm-2',
        name: 'role_update',
        resource: 'roles',
        action: 'update',
        description: null,
      }),
    ];
    hooksState.roles = [
      {
        id: 'role-1',
        name: 'admin',
        description: 'Administrator',
        isActive: true,
        permissions: [buildPermission()],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    render(React.createElement(PermissionList));

    expect(screen.getByText('Create')).toBeInTheDocument();
    expect(screen.getByText('Update')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Create'));

    expect(
      screen.queryByText('Select a permission to view details'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Allows creating users')).toBeInTheDocument();
    expect(screen.getByText('user_create')).toBeInTheDocument();
    // The permission is used by one role.
    expect(screen.getByText('Roles with this Permission')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('filters permissions by search text', () => {
    hooksState.permissions = [
      buildPermission(),
      buildPermission({
        id: 'perm-2',
        name: 'role_update',
        resource: 'roles',
        action: 'update',
      }),
    ];

    render(React.createElement(PermissionList));

    fireEvent.change(screen.getByPlaceholderText('Search permissions...'), {
      target: { value: 'role_update' },
    });

    expect(screen.getByText('Update')).toBeInTheDocument();
    expect(screen.queryByText('Create')).not.toBeInTheDocument();
  });

  it('filters permissions by resource tab', () => {
    hooksState.permissions = [
      buildPermission(),
      buildPermission({
        id: 'perm-2',
        name: 'role_update',
        resource: 'roles',
        action: 'update',
      }),
    ];

    render(React.createElement(PermissionList));

    fireEvent.click(screen.getByRole('button', { name: 'Roles' }));

    expect(screen.getByText('Update')).toBeInTheDocument();
    expect(screen.queryByText('Create')).not.toBeInTheDocument();
  });

  it('deletes the selected permission after confirmation', async () => {
    hooksState.permissions = [buildPermission()];

    render(React.createElement(PermissionList));
    fireEvent.click(screen.getByText('Create'));

    fireEvent.click(screen.getByTitle('Delete'));

    expect(window.confirm).toHaveBeenCalled();
    expect(hooksState.deleteMutateAsync).toHaveBeenCalledWith('perm-1');
    await screen.findByText('Select a permission to view details');
    expect(toastMock.success).toHaveBeenCalledWith(
      'Permission deleted successfully',
    );
  });

  it('opens the create-permission form when "New Permission" is clicked', () => {
    render(React.createElement(PermissionList));

    fireEvent.click(screen.getByText('New Permission'));

    expect(screen.getByText('Create New Permission')).toBeInTheDocument();
  });

  it('refreshes the permissions list and shows a success toast', async () => {
    render(React.createElement(PermissionList));

    fireEvent.click(screen.getByTitle('Refresh'));

    expect(hooksState.refetch).toHaveBeenCalledTimes(1);
    await screen.findByText('No permissions yet');
    expect(toastMock.success).toHaveBeenCalledWith('Permissions refreshed');
  });
});
