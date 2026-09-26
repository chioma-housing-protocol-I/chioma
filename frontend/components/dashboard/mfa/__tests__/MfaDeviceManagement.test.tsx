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
import { MfaDeviceManagement } from '../MfaDeviceManagement';

function addDevice(name: string) {
  fireEvent.click(screen.getByText('Add Device'));
  fireEvent.change(screen.getByPlaceholderText('e.g., My iPhone, Work Phone'), {
    target: { value: name },
  });
  fireEvent.click(screen.getByText('Continue Setup'));
}

describe('MfaDeviceManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders the header and an empty device list initially', () => {
    render(<MfaDeviceManagement userId="user-1" />);

    expect(screen.getByText('MFA Device Management')).toBeInTheDocument();
    expect(screen.getByText('Add a device to get started')).toBeInTheDocument();
    expect(screen.getByText('No devices added yet')).toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(3); // Total, Enabled, Unverified
  });

  it('toggles the add-device form', () => {
    render(<MfaDeviceManagement userId="user-1" />);

    fireEvent.click(screen.getByText('Add Device'));
    expect(screen.getByText('Add New MFA Device')).toBeInTheDocument();

    fireEvent.click(screen.getAllByText('Cancel')[0]);
    expect(screen.queryByText('Add New MFA Device')).not.toBeInTheDocument();
  });

  it('adds a new MFA device via the form and shows it as unverified', async () => {
    render(<MfaDeviceManagement userId="user-1" />);

    addDevice('My iPhone');

    expect(await screen.findByText('My iPhone')).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith(
      'MFA device added. Please verify to complete setup.',
    );
    expect(screen.getByText('1 unverified device')).toBeInTheDocument();
  });

  it('selects a device and verifies it via the verification form', async () => {
    render(<MfaDeviceManagement userId="user-1" />);
    addDevice('My iPhone');

    fireEvent.click(await screen.findByText('My iPhone'));

    expect(
      screen.getByRole('heading', { name: 'My iPhone' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Enter Verification Code')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Enter 6-digit code'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByText('Verify Device'));

    expect(toast.success).toHaveBeenCalledWith(
      'MFA device verified and enabled',
    );
    expect(screen.queryByText('1 unverified device')).not.toBeInTheDocument();
  });

  it('removes a device after confirmation', async () => {
    render(<MfaDeviceManagement userId="user-1" />);
    addDevice('My iPhone');
    await screen.findByText('My iPhone');

    fireEvent.click(screen.getByTitle('Remove'));

    expect(window.confirm).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('MFA device removed');
    expect(screen.getByText('No devices added yet')).toBeInTheDocument();
  });

  it('does not remove a device when confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<MfaDeviceManagement userId="user-1" />);
    addDevice('My iPhone');
    await screen.findByText('My iPhone');

    fireEvent.click(screen.getByTitle('Remove'));

    expect(screen.getByText('My iPhone')).toBeInTheDocument();
  });

  it('toggles a device enabled state', async () => {
    render(<MfaDeviceManagement userId="user-1" />);
    addDevice('My iPhone');
    await screen.findByText('My iPhone');

    fireEvent.click(screen.getByTitle('Disable'));

    expect(toast.success).toHaveBeenCalledWith('Device status updated');
  });
});
