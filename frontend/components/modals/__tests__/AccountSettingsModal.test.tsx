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

import toast from 'react-hot-toast';
import { AccountSettingsModal } from '../AccountSettingsModal';

function renderModal(
  props: Partial<React.ComponentProps<typeof AccountSettingsModal>> = {},
) {
  const onClose = vi.fn();
  const utils = render(
    <AccountSettingsModal isOpen onClose={onClose} {...props} />,
  );
  return { onClose, ...utils };
}

describe('AccountSettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(<AccountSettingsModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText('Account Settings')).not.toBeInTheDocument();
  });

  it('renders the security tab by default with password fields', () => {
    renderModal();
    expect(screen.getByText('Account Settings')).toBeInTheDocument();
    expect(screen.getByText('Change Password')).toBeInTheDocument();
    expect(document.getElementById('currentPassword')).toBeInTheDocument();
    expect(document.getElementById('newPassword')).toBeInTheDocument();
    expect(document.getElementById('confirmPassword')).toBeInTheDocument();
  });

  it('toggles password visibility when the eye icon is clicked', () => {
    renderModal();
    const input = document.getElementById(
      'currentPassword',
    ) as HTMLInputElement;
    expect(input).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getAllByLabelText('Show password')[0]);
    expect(input).toHaveAttribute('type', 'text');
  });

  it('shows validation errors when submitting an invalid password form', async () => {
    renderModal({ onChangePassword: vi.fn() });
    fireEvent.click(screen.getByRole('button', { name: /Update Password/i }));

    await waitFor(() => {
      expect(
        screen.getAllByText('Current password is required').length,
      ).toBeGreaterThan(0);
    });
  });

  it('calls onChangePassword with the form values on successful submit', async () => {
    const onChangePassword = vi.fn().mockResolvedValue(undefined);
    renderModal({ onChangePassword });

    fireEvent.change(document.getElementById('currentPassword')!, {
      target: { value: 'oldPass1' },
    });
    fireEvent.change(document.getElementById('newPassword')!, {
      target: { value: 'NewPass1' },
    });
    fireEvent.change(document.getElementById('confirmPassword')!, {
      target: { value: 'NewPass1' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Update Password/i }));

    await waitFor(() => {
      expect(onChangePassword).toHaveBeenCalledWith('oldPass1', 'NewPass1');
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Password changed successfully',
      );
    });
  });

  it('shows a mismatch error when passwords do not match', async () => {
    renderModal({ onChangePassword: vi.fn() });

    fireEvent.change(document.getElementById('currentPassword')!, {
      target: { value: 'oldPass1' },
    });
    fireEvent.change(document.getElementById('newPassword')!, {
      target: { value: 'NewPass1' },
    });
    fireEvent.change(document.getElementById('confirmPassword')!, {
      target: { value: 'Different1' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Update Password/i }));

    await waitFor(() => {
      expect(
        screen.getAllByText('Passwords do not match').length,
      ).toBeGreaterThan(0);
    });
  });

  it('switches to the notifications tab and saves preferences', async () => {
    const onSaveSettings = vi.fn().mockResolvedValue(undefined);
    renderModal({ onSaveSettings });

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();

    const initialSwitches = screen.getAllByRole('switch');
    expect(initialSwitches[initialSwitches.length - 1]).toHaveAttribute(
      'aria-checked',
      'false',
    );
    fireEvent.click(initialSwitches[initialSwitches.length - 1]);

    // The toggle re-renders with a new node, so re-query rather than reuse
    // the stale reference.
    const updatedSwitches = screen.getAllByRole('switch');
    expect(updatedSwitches[updatedSwitches.length - 1]).toHaveAttribute(
      'aria-checked',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: /Save Preferences/i }));

    await waitFor(() => {
      expect(onSaveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          notifications: expect.objectContaining({ smsAlerts: true }),
        }),
      );
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Notification preferences saved',
    );
  });

  it('switches to the privacy tab and saves settings', async () => {
    const onSaveSettings = vi.fn().mockResolvedValue(undefined);
    renderModal({ onSaveSettings });

    fireEvent.click(screen.getByRole('button', { name: 'Privacy' }));
    expect(screen.getByText('Privacy Settings')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Save Settings/i }));

    await waitFor(() => {
      expect(onSaveSettings).toHaveBeenCalled();
    });
    expect(toast.success).toHaveBeenCalledWith('Privacy settings saved');
  });

  it('disables the delete account button until DELETE is typed, then confirms', async () => {
    const onDeleteAccount = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    renderModal({ onDeleteAccount, onClose });

    fireEvent.click(screen.getByRole('button', { name: 'Danger Zone' }));
    const deleteButton = screen.getByRole('button', {
      name: /Delete My Account/i,
    });
    expect(deleteButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('DELETE'), {
      target: { value: 'DELETE' },
    });
    expect(deleteButton).not.toBeDisabled();

    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(onDeleteAccount).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect(toast.success).toHaveBeenCalledWith('Account deletion initiated');
  });
});
