import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

const mutateAsync = vi.fn();
const useAdminRolesMock = vi.fn();
const useAdminPermissionsMock = vi.fn();

vi.mock('@/lib/query/hooks/use-admin-roles', () => ({
  useAdminRoles: () => useAdminRolesMock(),
  useAdminPermissions: () => useAdminPermissionsMock(),
  useUpdateRolePermissions: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

import toast from 'react-hot-toast';
import { PermissionMatrix } from '../PermissionMatrix';

const permissions = [
  {
    id: 'perm-1',
    name: 'View Properties',
    description: 'Can view property listings',
    resource: 'properties',
    action: 'view',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'perm-2',
    name: 'Edit Properties',
    description: 'Can edit property listings',
    resource: 'properties',
    action: 'edit',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const roles = [
  {
    id: 'role-1',
    name: 'property_manager',
    description: 'Manages properties',
    isActive: true,
    permissions: [permissions[0]],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('PermissionMatrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAdminRolesMock.mockReturnValue({ data: roles });
    useAdminPermissionsMock.mockReturnValue({ data: permissions });
  });

  it('renders nothing when the role cannot be found', () => {
    const { container } = render(<PermissionMatrix roleId="missing-role" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there are no permissions', () => {
    useAdminPermissionsMock.mockReturnValue({ data: [] });
    const { container } = render(<PermissionMatrix roleId="role-1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the matrix header and grouped permissions for the selected role', () => {
    render(<PermissionMatrix roleId="role-1" />);

    expect(
      screen.getByText('Permission Matrix - Property Manager'),
    ).toBeInTheDocument();
    expect(screen.getByText('Properties')).toBeInTheDocument();
    expect(screen.getByText('View Properties')).toBeInTheDocument();
    expect(screen.getByText('Edit Properties')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 permissions assigned')).toBeInTheDocument();
  });

  it('does not show the Save Changes button until a permission is toggled', () => {
    render(<PermissionMatrix roleId="role-1" />);

    expect(
      screen.queryByRole('button', { name: 'Save Changes' }),
    ).not.toBeInTheDocument();
  });

  it('toggles a permission checkbox and reveals the Save Changes button', () => {
    render(<PermissionMatrix roleId="role-1" />);

    const toggleButtons = screen.getAllByRole('button');
    // Toggle the "Edit Properties" permission (currently unassigned).
    fireEvent.click(toggleButtons[1]);

    expect(
      screen.getByRole('button', { name: 'Save Changes' }),
    ).toBeInTheDocument();
    // Only the just-toggled permission is tracked as "checked" once edits
    // have started, so the assigned count stays at 1 (now "Edit Properties"
    // instead of the originally-assigned "View Properties").
    expect(screen.getByText('1 of 2 permissions assigned')).toBeInTheDocument();
  });

  it('saves the updated permissions and shows a success toast', async () => {
    mutateAsync.mockResolvedValue(undefined);
    render(<PermissionMatrix roleId="role-1" />);

    const toggleButtons = screen.getAllByRole('button');
    fireEvent.click(toggleButtons[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        roleId: 'role-1',
        permissionIds: ['perm-2'],
      });
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Permissions updated successfully',
    );
  });

  it('shows an error toast when saving fails', async () => {
    mutateAsync.mockRejectedValue(new Error('network error'));
    render(<PermissionMatrix roleId="role-1" />);

    const toggleButtons = screen.getAllByRole('button');
    fireEvent.click(toggleButtons[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update permissions');
    });
  });
});
