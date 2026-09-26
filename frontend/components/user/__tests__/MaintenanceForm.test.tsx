import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'u1', firstName: 'Jane' } }),
}));

import { MaintenanceForm } from '../MaintenanceForm';

describe('MaintenanceForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows validation errors and does not submit when required fields are empty', async () => {
    const onSuccess = vi.fn();
    render(<MaintenanceForm onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Title is required').length).toBeGreaterThan(
        0,
      );
    });
    expect(
      screen.getAllByText('Description is required').length,
    ).toBeGreaterThan(0);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only title and description', async () => {
    const onSuccess = vi.fn();
    render(<MaintenanceForm onSuccess={onSuccess} />);

    fireEvent.change(
      screen.getByPlaceholderText('Brief description of the issue'),
      { target: { value: '   ' } },
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        'Provide detailed information about the maintenance issue...',
      ),
      { target: { value: '   ' } },
    );

    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Title is required').length).toBeGreaterThan(
        0,
      );
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('calls onSuccess after submitting with valid title and description', async () => {
    const onSuccess = vi.fn();
    render(<MaintenanceForm onSuccess={onSuccess} />);

    fireEvent.change(
      screen.getByPlaceholderText('Brief description of the issue'),
      { target: { value: 'Leaking faucet' } },
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        'Provide detailed information about the maintenance issue...',
      ),
      { target: { value: 'The kitchen faucet has been leaking for days.' } },
    );

    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(
      () => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      },
      { timeout: 2000 },
    );
  });

  it('navigates to the maintenance list when no onSuccess callback is provided', async () => {
    render(<MaintenanceForm />);

    fireEvent.change(
      screen.getByPlaceholderText('Brief description of the issue'),
      { target: { value: 'Leaking faucet' } },
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        'Provide detailed information about the maintenance issue...',
      ),
      { target: { value: 'The kitchen faucet has been leaking for days.' } },
    );

    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith('/user/maintenance');
      },
      { timeout: 2000 },
    );
  });

  it('calls onCancel when the cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<MaintenanceForm onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
