import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DisputeFilingModal } from '../DisputeFilingModal';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/ui/Uploader', () => ({
  Uploader: () => <div data-testid="uploader" />,
}));

describe('DisputeFilingModal', () => {
  it('shows validation errors and does not call onSubmit when fields are invalid', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <DisputeFilingModal
        isOpen
        onClose={vi.fn()}
        agreementId=""
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /file dispute/i }));

    await waitFor(() => {
      expect(
        screen.getAllByText('Agreement ID is required').length,
      ).toBeGreaterThan(0);
    });
    expect(
      screen.getAllByText('Description must be at least 20 characters').length,
    ).toBeGreaterThan(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with valid data', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <DisputeFilingModal
        isOpen
        onClose={onClose}
        agreementId="AGR-2025-014"
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('AGR-2025-014'), {
      target: { value: 'AGR-2025-014' },
    });
    fireEvent.change(
      screen.getByPlaceholderText(
        'Describe the issue, timeline, and the outcome you are requesting...',
      ),
      {
        target: {
          value: 'The landlord has not addressed the leaking roof issue.',
        },
      },
    );

    fireEvent.click(screen.getByRole('button', { name: /file dispute/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          agreementId: 'AGR-2025-014',
          disputeType: 'MAINTENANCE',
          description: 'The landlord has not addressed the leaking roof issue.',
        }),
      );
    });
  });

  it('rejects a non-numeric requested amount', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <DisputeFilingModal
        isOpen
        onClose={vi.fn()}
        agreementId="AGR-2025-014"
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('AGR-2025-014'), {
      target: { value: 'AGR-2025-014' },
    });
    fireEvent.change(
      screen.getByPlaceholderText(
        'Describe the issue, timeline, and the outcome you are requesting...',
      ),
      {
        target: {
          value: 'The landlord has not addressed the leaking roof issue.',
        },
      },
    );
    fireEvent.change(screen.getByPlaceholderText('e.g. 40000'), {
      target: { value: 'not-a-number' },
    });

    fireEvent.click(screen.getByRole('button', { name: /file dispute/i }));

    await waitFor(() => {
      expect(
        screen.getAllByText('Must be a positive number').length,
      ).toBeGreaterThan(0);
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
