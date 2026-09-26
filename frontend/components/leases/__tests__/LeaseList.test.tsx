import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MOCK_LEASES } from './fixtures';

vi.mock('../LeaseDetailsModal', () => ({
  LeaseDetailsModal: ({
    lease,
    onClose,
  }: {
    lease: { id: string; property: string };
    onClose: () => void;
  }) => (
    <div>
      <span>lease-details-open:{lease.id}</span>
      <span>lease-details-property:{lease.property}</span>
      <button onClick={onClose}>close-details</button>
    </div>
  ),
}));

import { LeaseList } from '../LeaseList';

describe('LeaseList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a row for each lease with property, rent, and status', () => {
    render(<LeaseList leases={MOCK_LEASES} currentUserRole="user" />);

    expect(screen.getByText('Sunset Apartments - Unit 4B')).toBeInTheDocument();
    expect(screen.getByText('Riverside Lofts - Unit 2A')).toBeInTheDocument();
    expect(screen.getByText('Old Town House - Unit 1')).toBeInTheDocument();

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Pending Signature')).toBeInTheDocument();
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('shows the empty state when there are no leases', () => {
    render(<LeaseList leases={[]} currentUserRole="user" />);

    expect(screen.getByText('No Lease Agreements')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows the landlord name in the counterparty column for a tenant user', () => {
    render(<LeaseList leases={[MOCK_LEASES[0]]} currentUserRole="user" />);

    expect(screen.getByText('John Landlord')).toBeInTheDocument();
    expect(screen.queryByText('Jane Tenant')).not.toBeInTheDocument();
  });

  it('shows the tenant name in the counterparty column for an admin user', () => {
    render(<LeaseList leases={[MOCK_LEASES[0]]} currentUserRole="admin" />);

    expect(screen.getByText('Jane Tenant')).toBeInTheDocument();
    expect(screen.queryByText('John Landlord')).not.toBeInTheDocument();
  });

  it('opens the details modal for the selected lease when View is clicked', () => {
    render(<LeaseList leases={MOCK_LEASES} currentUserRole="user" />);

    const viewButtons = screen.getAllByRole('button', { name: /view/i });
    fireEvent.click(viewButtons[1]);

    expect(screen.getByText('lease-details-open:lease-2')).toBeInTheDocument();
    expect(
      screen.getByText('lease-details-property:Riverside Lofts - Unit 2A'),
    ).toBeInTheDocument();
  });

  it('closes the details modal when its onClose is invoked', () => {
    render(<LeaseList leases={MOCK_LEASES} currentUserRole="user" />);

    fireEvent.click(screen.getAllByRole('button', { name: /view/i })[0]);
    expect(screen.getByText(/lease-details-open/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('close-details'));
    expect(screen.queryByText(/lease-details-open/)).not.toBeInTheDocument();
  });
});
