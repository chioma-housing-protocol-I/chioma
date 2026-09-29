import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const mockUseTenantDisputes = vi.fn();
const mockUseUploadTenantDisputeEvidence = vi.fn();
const mockOpenModal = vi.fn();

vi.mock('@/lib/query/hooks/use-tenant-disputes', () => ({
  useTenantDisputes: (...args: unknown[]) => mockUseTenantDisputes(...args),
}));

vi.mock('@/lib/query/hooks/use-tenant-dispute', () => ({
  useUploadTenantDisputeEvidence: () => mockUseUploadTenantDisputeEvidence(),
}));

vi.mock('@/contexts/ModalContext', () => ({
  useModal: () => ({ openModal: mockOpenModal }),
}));

vi.mock('@/lib/utils/date-fns-locale', () => ({
  useDateFnsLocale: () => undefined,
}));

import { DisputesList } from '../DisputesList';

const mockDisputes = [
  {
    id: 'd-1',
    backendDisputeId: 'be-1',
    disputeId: 'DSP-001',
    agreementReference: 'AGR-001',
    propertyName: 'Sunset Apartments',
    disputeType: 'MAINTENANCE',
    description: 'AC unit is broken and needs urgent repair.',
    status: 'OPEN',
    requestedAmount: 250,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    evidenceCount: 1,
    commentCount: 2,
  },
  {
    id: 'd-2',
    backendDisputeId: 'be-2',
    disputeId: 'DSP-002',
    agreementReference: 'AGR-002',
    propertyName: 'Ocean View Condos',
    disputeType: 'BILLING',
    description: 'Overcharged on utility bill.',
    status: 'RESOLVED',
    requestedAmount: undefined,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date().toISOString(),
    evidenceCount: 0,
    commentCount: 0,
  },
];

describe('DisputesList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUploadTenantDisputeEvidence.mockReturnValue({
      mutateAsync: vi.fn(),
    });
    mockUseTenantDisputes.mockReturnValue({
      data: mockDisputes,
      isLoading: false,
      error: null,
    });
  });

  it('renders dispute rows with property names and statuses', () => {
    render(React.createElement(DisputesList, {}));

    expect(screen.getByText('Sunset Apartments')).toBeInTheDocument();
    expect(screen.getByText('Ocean View Condos')).toBeInTheDocument();
    expect(screen.getByText('OPEN')).toBeInTheDocument();
    expect(screen.getByText('RESOLVED')).toBeInTheDocument();
    expect(screen.getByText('2 disputes')).toBeInTheDocument();
  });

  it('shows a loading indicator while fetching', () => {
    mockUseTenantDisputes.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(React.createElement(DisputesList, {}));

    expect(screen.getByText('Loading your disputes...')).toBeInTheDocument();
  });

  it('shows an empty state when there are no disputes', () => {
    mockUseTenantDisputes.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(React.createElement(DisputesList, {}));

    expect(screen.getByText('No disputes yet')).toBeInTheDocument();
  });

  it('shows an error state with a retry action', () => {
    mockUseTenantDisputes.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
    });

    render(React.createElement(DisputesList, {}));

    expect(screen.getByText('Failed to load disputes')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('filters disputes by search text', () => {
    render(React.createElement(DisputesList, {}));

    const searchInput = screen.getByPlaceholderText('Search disputes...');
    fireEvent.change(searchInput, { target: { value: 'Sunset' } });

    expect(mockUseTenantDisputes).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'Sunset' }),
    );
  });

  it('filters disputes by status using the select dropdown', () => {
    render(React.createElement(DisputesList, {}));

    const statusSelect = screen.getByDisplayValue('All Statuses');
    fireEvent.change(statusSelect, { target: { value: 'RESOLVED' } });

    expect(mockUseTenantDisputes).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'RESOLVED' }),
    );
  });

  it('opens the dispute detail modal when preview is clicked', () => {
    render(React.createElement(DisputesList, {}));

    const previewButton = screen.getByLabelText('Preview dispute DSP-001');
    fireEvent.click(previewButton);

    expect(mockOpenModal).toHaveBeenCalledWith(
      'disputeDetail',
      expect.objectContaining({
        dispute: expect.objectContaining({ disputeId: 'DSP-001' }),
      }),
    );
  });
});
