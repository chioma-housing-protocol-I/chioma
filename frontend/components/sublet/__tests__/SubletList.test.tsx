import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubletList } from '../SubletList';
import type { SubletRequest } from '@/lib/query/hooks/use-sublets';

function buildRequest(overrides: Partial<SubletRequest> = {}): SubletRequest {
  return {
    id: 'sub-1',
    agreementId: 'agreement-12345678',
    tenantId: 'tenant-1',
    landlordId: 'landlord-1',
    status: 'pending',
    requestedStartDate: '2026-01-01T00:00:00.000Z',
    requestedEndDate: '2026-02-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('SubletList', () => {
  it('renders an empty state when there are no requests', () => {
    render(<SubletList requests={[]} emptyActionHref="/sublet/request" />);

    expect(screen.getByText('No active sublets')).toBeInTheDocument();
    expect(screen.getByText('Request a sublet')).toBeInTheDocument();
  });

  it('renders a row per sublet request with status badge', () => {
    render(
      <SubletList
        requests={[
          buildRequest({ id: 'sub-1', status: 'approved' }),
          buildRequest({ id: 'sub-2', status: 'pending' }),
        ]}
      />,
    );

    expect(screen.getByText('approved')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('shows the truncated agreement id and formatted date range', () => {
    render(<SubletList requests={[buildRequest()]} />);

    expect(screen.getByText('agreemen')).toBeInTheDocument();
    expect(screen.getByText(/→/)).toBeInTheDocument();
  });

  it('does not render the empty-state action when no href is provided', () => {
    render(<SubletList requests={[]} />);

    expect(screen.queryByText('Request a sublet')).not.toBeInTheDocument();
  });
});
