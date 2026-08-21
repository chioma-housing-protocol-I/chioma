import { describe, it, expect, vi, beforeAll } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LeaseDetailsModal } from '../LeaseDetailsModal';
import { MOCK_LEASE_ACTIVE, MOCK_LEASE_PENDING } from '@/mocks/entities/leases';

// jsdom doesn't support canvas getContext; mock it (SignaturePad depends on it)
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
  })) as any;
});

vi.mock('react-hot-toast', () => {
  const success = vi.fn();
  const error = vi.fn();
  return {
    default: { success, error },
    toast: { success, error },
  };
});

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'user-1', role: 'user' } }),
}));

describe('LeaseDetailsModal', () => {
  it('shows active status banner for ACTIVE lease', () => {
    render(
      <LeaseDetailsModal
        lease={MOCK_LEASE_ACTIVE}
        onClose={() => {}}
        currentUserRole="user"
      />,
    );

    expect(
      screen.getByText('This lease is active and digitally signed by all parties.'),
    ).toBeInTheDocument();
  });

  it('shows pending status banner for PENDING lease', () => {
    render(
      <LeaseDetailsModal
        lease={MOCK_LEASE_PENDING}
        onClose={() => {}}
        currentUserRole="user"
      />,
    );

    expect(screen.getByText('This lease is pending signature.')).toBeInTheDocument();
  });

  it('renders landlord, tenant, rent and duration details', () => {
    render(
      <LeaseDetailsModal
        lease={MOCK_LEASE_ACTIVE}
        onClose={() => {}}
        currentUserRole="user"
      />,
    );

    expect(screen.getByText('Sarah Okafor')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('$2,500')).toBeInTheDocument();
    expect(screen.getByText('Terms & Conditions')).toBeInTheDocument();
  });

  it('does not show close/negotiate/sign in footer when in sign mode', () => {
    render(
      <LeaseDetailsModal
        lease={MOCK_LEASE_PENDING}
        onClose={() => {}}
        currentUserRole="user"
      />,
    );

    // Enter sign mode
    const reviewSign = screen.getByText('Review & Sign');
    fireEvent.click(reviewSign);

    expect(screen.getByText('Provide Signature')).toBeInTheDocument();
    expect(screen.queryByText('Negotiate')).not.toBeInTheDocument();
  });

  it('shows negotiate button for PENDING lease as user', () => {
    render(
      <LeaseDetailsModal
        lease={MOCK_LEASE_PENDING}
        onClose={() => {}}
        currentUserRole="user"
      />,
    );

    expect(screen.getByText('Negotiate')).toBeInTheDocument();
    expect(screen.getByText('Review & Sign')).toBeInTheDocument();
  });

  it('shows waiting for signature button for PENDING lease as admin (disabled)', () => {
    render(
      <LeaseDetailsModal
        lease={MOCK_LEASE_PENDING}
        onClose={() => {}}
        currentUserRole="admin"
      />,
    );

    const waitingButton = screen.getByText('Waiting for User Signature');
    expect(waitingButton).toBeInTheDocument();
    expect(waitingButton).toBeDisabled();
    expect(screen.queryByText('Review & Sign')).not.toBeInTheDocument();
  });

  it('opens negotiation sidebar when Negotiate is clicked', () => {
    render(
      <LeaseDetailsModal
        lease={MOCK_LEASE_PENDING}
        onClose={() => {}}
        currentUserRole="user"
      />,
    );

    fireEvent.click(screen.getByText('Negotiate'));

    expect(screen.getByText('Lease Negotiation')).toBeInTheDocument();
  });

  it('does not show negotiate for ACTIVE lease', () => {
    render(
      <LeaseDetailsModal
        lease={MOCK_LEASE_ACTIVE}
        onClose={() => {}}
        currentUserRole="user"
      />,
    );

    expect(screen.queryByText('Negotiate')).not.toBeInTheDocument();
    expect(screen.queryByText('Review & Sign')).not.toBeInTheDocument();
  });

  it('calls onSignComplete and closes after successful signing', async () => {
    const onClose = vi.fn();
    const onSignComplete = vi.fn().mockResolvedValue(undefined);

    render(
      <LeaseDetailsModal
        lease={MOCK_LEASE_PENDING}
        onClose={onClose}
        currentUserRole="user"
        onSignComplete={onSignComplete}
      />,
    );

    // Enter sign mode
    fireEvent.click(screen.getByText('Review & Sign'));

    // Sign button is initially disabled (no signature drawn)
    const signAgreement = screen.getByText('Sign Agreement');
    expect(signAgreement).toBeDisabled();

    // Simulate drawing by firing mouse events on the canvas
    const canvas = document.querySelector('canvas');
    expect(canvas).not.toBeNull();
    if (canvas) {
      fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
      fireEvent.mouseMove(canvas, { clientX: 20, clientY: 20 });
      fireEvent.mouseUp(canvas);
    }

    await waitFor(() => {
      expect(signAgreement).not.toBeDisabled();
    });

    fireEvent.click(signAgreement);

    await waitFor(() => {
      expect(onSignComplete).toHaveBeenCalledWith('lease-2');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows toast error and does not close when signing fails', async () => {
    const onClose = vi.fn();
    const onSignComplete = vi.fn().mockRejectedValue(new Error('Failed'));

    const { toast } = await import('react-hot-toast');

    render(
      <LeaseDetailsModal
        lease={MOCK_LEASE_PENDING}
        onClose={onClose}
        currentUserRole="user"
        onSignComplete={onSignComplete}
      />,
    );

    fireEvent.click(screen.getByText('Review & Sign'));

    const canvas = document.querySelector('canvas');
    if (canvas) {
      fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
      fireEvent.mouseUp(canvas);
    }

    const signAgreement = screen.getByText('Sign Agreement');
    await waitFor(() => expect(signAgreement).not.toBeDisabled());
    fireEvent.click(signAgreement);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to sign the agreement.');
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});