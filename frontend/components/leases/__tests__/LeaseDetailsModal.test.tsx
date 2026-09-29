import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import type { Lease } from '../LeaseDetailsModal';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock('../SignaturePad', () => ({
  SignaturePad: ({
    onSign,
    onCancel,
  }: {
    onSign: () => void;
    onCancel: () => void;
    isSubmitting?: boolean;
  }) => (
    <div>
      <button onClick={onSign}>confirm-signature</button>
      <button onClick={onCancel}>cancel-signature</button>
    </div>
  ),
}));

vi.mock('../NegotiationSidebar', () => ({
  NegotiationSidebar: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div>
        <span>negotiation-sidebar-open</span>
        <button onClick={onClose}>close-sidebar</button>
      </div>
    ) : null,
}));

import toast from 'react-hot-toast';
import { LeaseDetailsModal } from '../LeaseDetailsModal';

const baseLease: Lease = {
  id: 'lease-1',
  property: 'Sunset Apartments, Unit 4B',
  tenantName: 'Jane Tenant',
  landlordName: 'John Landlord',
  rentAmount: '$2,000',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  status: 'PENDING',
  terms: 'Standard lease terms and conditions.',
};

describe('LeaseDetailsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders lease details', () => {
    render(
      React.createElement(LeaseDetailsModal, {
        lease: baseLease,
        onClose: vi.fn(),
        currentUserRole: 'user',
      }),
    );

    expect(screen.getByText('Lease Agreement')).toBeInTheDocument();
    expect(screen.getByText('Sunset Apartments, Unit 4B')).toBeInTheDocument();
    expect(screen.getByText('Jane Tenant')).toBeInTheDocument();
    expect(screen.getByText('John Landlord')).toBeInTheDocument();
    expect(screen.getByText('$2,000')).toBeInTheDocument();
    expect(
      screen.getByText('This lease is pending signature.'),
    ).toBeInTheDocument();
  });

  it('shows the active banner for an active lease and hides sign controls', () => {
    render(
      React.createElement(LeaseDetailsModal, {
        lease: { ...baseLease, status: 'ACTIVE' },
        onClose: vi.fn(),
        currentUserRole: 'user',
      }),
    );

    expect(
      screen.getByText(
        'This lease is active and digitally signed by all parties.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Review & Sign')).not.toBeInTheDocument();
  });

  it('shows the Review & Sign button for a pending lease when the user can sign', () => {
    render(
      React.createElement(LeaseDetailsModal, {
        lease: baseLease,
        onClose: vi.fn(),
        currentUserRole: 'user',
      }),
    );

    expect(screen.getByText('Review & Sign')).toBeInTheDocument();
  });

  it('shows a disabled waiting message for an admin viewing a pending lease', () => {
    render(
      React.createElement(LeaseDetailsModal, {
        lease: baseLease,
        onClose: vi.fn(),
        currentUserRole: 'admin',
      }),
    );

    expect(screen.queryByText('Review & Sign')).not.toBeInTheDocument();
    expect(screen.getByText('Waiting for User Signature')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(
      React.createElement(LeaseDetailsModal, {
        lease: baseLease,
        onClose,
        currentUserRole: 'user',
      }),
    );

    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('enters signature mode and signs the lease successfully', async () => {
    const onClose = vi.fn();
    const onSignComplete = vi.fn().mockResolvedValue(undefined);

    render(
      React.createElement(LeaseDetailsModal, {
        lease: baseLease,
        onClose,
        currentUserRole: 'user',
        onSignComplete,
      }),
    );

    fireEvent.click(screen.getByText('Review & Sign'));
    expect(screen.getByText('Provide Signature')).toBeInTheDocument();

    fireEvent.click(screen.getByText('confirm-signature'));

    await waitFor(() => {
      expect(onSignComplete).toHaveBeenCalledWith('lease-1');
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Lease agreement signed successfully!',
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows an error toast when signing fails', async () => {
    const onSignComplete = vi.fn().mockRejectedValue(new Error('fail'));

    render(
      React.createElement(LeaseDetailsModal, {
        lease: baseLease,
        onClose: vi.fn(),
        currentUserRole: 'user',
        onSignComplete,
      }),
    );

    fireEvent.click(screen.getByText('Review & Sign'));
    fireEvent.click(screen.getByText('confirm-signature'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to sign the agreement.');
    });
  });

  it('cancels signature mode and returns to the footer actions', () => {
    render(
      React.createElement(LeaseDetailsModal, {
        lease: baseLease,
        onClose: vi.fn(),
        currentUserRole: 'user',
      }),
    );

    fireEvent.click(screen.getByText('Review & Sign'));
    fireEvent.click(screen.getByText('cancel-signature'));

    expect(screen.queryByText('Provide Signature')).not.toBeInTheDocument();
    expect(screen.getByText('Review & Sign')).toBeInTheDocument();
  });

  it('opens the negotiation sidebar when Negotiate is clicked', () => {
    render(
      React.createElement(LeaseDetailsModal, {
        lease: baseLease,
        onClose: vi.fn(),
        currentUserRole: 'user',
      }),
    );

    expect(
      screen.queryByText('negotiation-sidebar-open'),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Negotiate'));

    expect(screen.getByText('negotiation-sidebar-open')).toBeInTheDocument();

    fireEvent.click(screen.getByText('close-sidebar'));
    expect(
      screen.queryByText('negotiation-sidebar-open'),
    ).not.toBeInTheDocument();
  });
});
