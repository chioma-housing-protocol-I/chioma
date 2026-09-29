import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KycStatusBadge } from '../KycStatusBadge';

describe('KycStatusBadge', () => {
  it.each([
    [null, 'Not verified'],
    ['PENDING', 'Pending review'],
    ['APPROVED', 'Verified'],
    ['REJECTED', 'Rejected'],
    ['NEEDS_INFO', 'More info needed'],
  ] as const)('renders %s as "%s"', (status, label) => {
    render(<KycStatusBadge status={status} />);
    expect(screen.getByTestId('kyc-status-badge')).toHaveTextContent(label);
  });
});
