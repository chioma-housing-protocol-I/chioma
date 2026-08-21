import { describe, it, expect, vi, beforeAll } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LeaseList } from '../LeaseList';
import { MOCK_LEASE_ACTIVE, MOCK_LEASE_PENDING, MOCK_LEASE_EXPIRED } from '@/mocks/entities/leases';

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

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

describe('LeaseList', () => {
  it('renders EmptyState when leases array is empty', () => {
    render(<LeaseList leases={[]} currentUserRole="user" />);

    expect(screen.getByText('No Lease Agreements')).toBeInTheDocument();
    expect(
      screen.getByText('There are currently no active or past lease agreements to display.'),
    ).toBeInTheDocument();
  });

  it('renders all leases in the table', () => {
    render(
      <LeaseList
        leases={[MOCK_LEASE_ACTIVE, MOCK_LEASE_PENDING, MOCK_LEASE_EXPIRED]}
        currentUserRole="user"
      />,
    );

    expect(screen.getByText('101 Park Avenue, Manhattan, NY')).toBeInTheDocument();
    expect(screen.getByText('High Street Kensington, London')).toBeInTheDocument();
    expect(screen.getByText('Shibuya City, Tokyo')).toBeInTheDocument();
  });

  it('displays the correct status badge for each lease', () => {
    render(
      <LeaseList
        leases={[MOCK_LEASE_ACTIVE, MOCK_LEASE_PENDING, MOCK_LEASE_EXPIRED]}
        currentUserRole="user"
      />,
    );

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Pending Signature')).toBeInTheDocument();
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('displays rent amount for each lease', () => {
    render(
      <LeaseList
        leases={[MOCK_LEASE_ACTIVE, MOCK_LEASE_PENDING, MOCK_LEASE_EXPIRED]}
        currentUserRole="user"
      />,
    );

    expect(screen.getByText('$2,500/yr')).toBeInTheDocument();
    expect(screen.getByText('$3,800/yr')).toBeInTheDocument();
    expect(screen.getByText('$1,500/yr')).toBeInTheDocument();
  });

  it('shows tenant name when currentUserRole is admin', () => {
    render(
      <LeaseList
        leases={[MOCK_LEASE_ACTIVE]}
        currentUserRole="admin"
      />,
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('shows landlord name when currentUserRole is user', () => {
    render(
      <LeaseList
        leases={[MOCK_LEASE_ACTIVE]}
        currentUserRole="user"
      />,
    );

    expect(screen.getByText('Sarah Okafor')).toBeInTheDocument();
  });

  it('opens the LeaseDetailsModal when View button is clicked', () => {
    render(
      <LeaseList
        leases={[MOCK_LEASE_ACTIVE]}
        currentUserRole="user"
      />,
    );

    const viewButton = screen.getByText('View');
    fireEvent.click(viewButton);

    expect(screen.getByText('Lease Agreement')).toBeInTheDocument();
    // The property name appears both in the table and the modal header
    expect(screen.getAllByText('101 Park Avenue, Manhattan, NY').length).toBeGreaterThanOrEqual(1);
  });

  it('closes the LeaseDetailsModal when the close button is clicked', () => {
    render(
      <LeaseList
        leases={[MOCK_LEASE_ACTIVE]}
        currentUserRole="user"
      />,
    );

    const viewButton = screen.getByText('View');
    fireEvent.click(viewButton);

    expect(screen.getByText('Lease Agreement')).toBeInTheDocument();

    // Click the Close button in the modal footer
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    expect(screen.queryByText('Lease Agreement')).not.toBeInTheDocument();
  });

  it('calls onSignComplete when provided', async () => {
    const onSignComplete = vi.fn().mockResolvedValue(undefined);
    render(
      <LeaseList
        leases={[MOCK_LEASE_PENDING]}
        currentUserRole="user"
        onSignComplete={onSignComplete}
      />,
    );

    const viewButton = screen.getByText('View');
    fireEvent.click(viewButton);

    // Click "Review & Sign" to enter sign mode
    const reviewSign = screen.getByText('Review & Sign');
    fireEvent.click(reviewSign);

    // Draw on the canvas to enable the sign button
    const canvas = document.querySelector('canvas');
    if (canvas) {
      fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
      fireEvent.mouseUp(canvas);
    }

    // Click "Sign Agreement" button
    const signAgreement = screen.getByText('Sign Agreement');
    await vi.waitFor(() => expect(signAgreement).not.toBeDisabled());
    fireEvent.click(signAgreement);

    // onSignComplete should have been called with the lease id
    await vi.waitFor(() => {
      expect(onSignComplete).toHaveBeenCalledWith('lease-2');
    });
  });
});