import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

import toast from 'react-hot-toast';
import { UserManagementModal } from '../UserManagementModal';

const mockUser = {
  id: 'user-1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+1 (555) 123-4567',
  role: 'admin' as const,
  status: 'active' as const,
  isVerified: true,
};

describe('UserManagementModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders user details in view mode', () => {
    render(
      <UserManagementModal
        isOpen
        onClose={vi.fn()}
        user={mockUser}
        mode="view"
      />,
    );

    expect(screen.getByText('User Details')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getAllByText('jane@example.com').length).toBeGreaterThan(0);
    expect(screen.getByText('+1 (555) 123-4567')).toBeInTheDocument();
    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('shows "Not provided" when phone is missing in view mode', () => {
    render(
      <UserManagementModal
        isOpen
        onClose={vi.fn()}
        user={{ ...mockUser, phone: undefined }}
        mode="view"
      />,
    );

    expect(screen.getByText('Not provided')).toBeInTheDocument();
  });

  it('calls onClose when the Close button is clicked in view mode', () => {
    const onClose = vi.fn();
    render(
      <UserManagementModal
        isOpen
        onClose={onClose}
        user={mockUser}
        mode="view"
      />,
    );

    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders editable inputs in edit mode and submits updated data', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <UserManagementModal
        isOpen
        onClose={onClose}
        user={mockUser}
        mode="edit"
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText('Edit User')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText('John Doe');
    fireEvent.change(nameInput, { target: { value: 'Jane Updated' } });

    fireEvent.click(screen.getByText('Save Changes'));

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Jane Updated' }),
      );
    });
    await vi.waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('User updated successfully');
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows a validation error toast when required fields are missing in create mode', () => {
    const onSubmit = vi.fn();
    render(
      <UserManagementModal
        isOpen
        onClose={vi.fn()}
        mode="create"
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText('Create New User')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Create User'));

    expect(toast.error).toHaveBeenCalledWith(
      'Please fill in all required fields',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows a validation error toast for an invalid email address', () => {
    const onSubmit = vi.fn();
    render(
      <UserManagementModal
        isOpen
        onClose={vi.fn()}
        mode="create"
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('John Doe'), {
      target: { value: 'New User' },
    });
    fireEvent.change(screen.getByPlaceholderText('john@example.com'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByText('Create User'));

    expect(toast.error).toHaveBeenCalledWith(
      'Please enter a valid email address',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSuspend after confirming the suspend action', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onSuspend = vi.fn().mockResolvedValue(undefined);
    render(
      <UserManagementModal
        isOpen
        onClose={vi.fn()}
        user={mockUser}
        mode="view"
        onSuspend={onSuspend}
      />,
    );

    fireEvent.click(screen.getByText('Suspend'));

    await vi.waitFor(() => {
      expect(onSuspend).toHaveBeenCalledWith('user-1');
    });
  });

  it('does not suspend when the confirmation dialog is declined', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const onSuspend = vi.fn();
    render(
      <UserManagementModal
        isOpen
        onClose={vi.fn()}
        user={mockUser}
        mode="view"
        onSuspend={onSuspend}
      />,
    );

    fireEvent.click(screen.getByText('Suspend'));
    expect(onSuspend).not.toHaveBeenCalled();
  });

  it('shows the delete confirmation screen and deletes the user', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <UserManagementModal
        isOpen
        onClose={vi.fn()}
        user={mockUser}
        mode="view"
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByText('Delete'));

    expect(screen.getByText('Delete User Account')).toBeInTheDocument();
    expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Delete User'));

    await vi.waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith('user-1');
    });
    await vi.waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('User deleted successfully');
    });
  });

  it('does not render the Suspend button when the user is already suspended', () => {
    render(
      <UserManagementModal
        isOpen
        onClose={vi.fn()}
        user={{ ...mockUser, status: 'suspended' }}
        mode="view"
        onSuspend={vi.fn()}
      />,
    );

    expect(screen.queryByText('Suspend')).not.toBeInTheDocument();
  });
});
