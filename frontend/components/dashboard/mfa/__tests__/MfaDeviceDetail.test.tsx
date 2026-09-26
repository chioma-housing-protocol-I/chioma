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

import toast from 'react-hot-toast';
import { MfaDeviceDetail } from '../MfaDeviceDetail';

const baseDevice = {
  id: 'device-1',
  name: 'My Authenticator',
  type: 'totp' as const,
  enabled: true,
  verified: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  lastUsed: '2026-02-01T00:00:00.000Z',
};

describe('MfaDeviceDetail', () => {
  const onVerify = vi.fn();
  const onRename = vi.fn();
  const onRegenerateBackupCodes = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the device name and type label', () => {
    render(
      <MfaDeviceDetail
        device={baseDevice}
        onVerify={onVerify}
        onRename={onRename}
        onRegenerateBackupCodes={onRegenerateBackupCodes}
      />,
    );

    expect(screen.getByText('My Authenticator')).toBeInTheDocument();
    expect(screen.getByText('Authenticator App')).toBeInTheDocument();
  });

  it('shows a Verified badge when the device is verified', () => {
    render(
      <MfaDeviceDetail
        device={baseDevice}
        onVerify={onVerify}
        onRename={onRename}
        onRegenerateBackupCodes={onRegenerateBackupCodes}
      />,
    );

    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Enter Verification Code'),
    ).not.toBeInTheDocument();
  });

  it('shows the verification form and an Unverified badge for an unverified device', () => {
    render(
      <MfaDeviceDetail
        device={{ ...baseDevice, verified: false }}
        onVerify={onVerify}
        onRename={onRename}
        onRegenerateBackupCodes={onRegenerateBackupCodes}
      />,
    );

    expect(screen.getByText('Unverified')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Enter 6-digit code'),
    ).toBeInTheDocument();
  });

  it('shows an error toast and does not call onVerify when submitting an empty code', () => {
    render(
      <MfaDeviceDetail
        device={{ ...baseDevice, verified: false }}
        onVerify={onVerify}
        onRename={onRename}
        onRegenerateBackupCodes={onRegenerateBackupCodes}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Verify Device' }));

    expect(toast.error).toHaveBeenCalledWith(
      'Please enter a verification code',
    );
    expect(onVerify).not.toHaveBeenCalled();
  });

  it('calls onVerify and hides the verification form after entering a code', () => {
    render(
      <MfaDeviceDetail
        device={{ ...baseDevice, verified: false }}
        onVerify={onVerify}
        onRename={onRename}
        onRegenerateBackupCodes={onRegenerateBackupCodes}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Enter 6-digit code'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify Device' }));

    expect(onVerify).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByPlaceholderText('Enter 6-digit code'),
    ).not.toBeInTheDocument();
  });

  it('allows renaming the device', () => {
    render(
      <MfaDeviceDetail
        device={baseDevice}
        onVerify={onVerify}
        onRename={onRename}
        onRegenerateBackupCodes={onRegenerateBackupCodes}
      />,
    );

    fireEvent.click(screen.getByTitle('Rename'));

    const input = screen.getByDisplayValue('My Authenticator');
    fireEvent.change(input, { target: { value: 'Work Phone' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onRename).toHaveBeenCalledWith('Work Phone');
  });

  it('does not render the backup codes section when there are none', () => {
    render(
      <MfaDeviceDetail
        device={baseDevice}
        onVerify={onVerify}
        onRename={onRename}
        onRegenerateBackupCodes={onRegenerateBackupCodes}
      />,
    );

    expect(screen.queryByText('Backup Codes')).not.toBeInTheDocument();
  });

  it('toggles visibility of backup codes and copies a code to the clipboard', () => {
    const writeText = vi.fn();
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <MfaDeviceDetail
        device={{ ...baseDevice, backupCodes: ['CODE-1111', 'CODE-2222'] }}
        onVerify={onVerify}
        onRename={onRename}
        onRegenerateBackupCodes={onRegenerateBackupCodes}
      />,
    );

    expect(screen.getByText('Backup Codes')).toBeInTheDocument();
    expect(screen.queryByText('CODE-1111')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Show'));
    expect(screen.getByText('CODE-1111')).toBeInTheDocument();

    fireEvent.click(screen.getByText('CODE-1111'));
    expect(writeText).toHaveBeenCalledWith('CODE-1111');
    expect(toast.success).toHaveBeenCalledWith('Code copied to clipboard');
  });

  it('calls onRegenerateBackupCodes when Regenerate is clicked', () => {
    render(
      <MfaDeviceDetail
        device={{ ...baseDevice, backupCodes: ['CODE-1111'] }}
        onVerify={onVerify}
        onRename={onRename}
        onRegenerateBackupCodes={onRegenerateBackupCodes}
      />,
    );

    fireEvent.click(screen.getByText('Regenerate'));
    expect(onRegenerateBackupCodes).toHaveBeenCalledTimes(1);
  });
});
