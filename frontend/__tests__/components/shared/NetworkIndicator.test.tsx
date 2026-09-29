import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import NetworkIndicator from '@/components/shared/NetworkIndicator';
import { getConfiguredNetwork } from '@/lib/stellar-network';

vi.mock('@/lib/stellar-network', () => ({
  getConfiguredNetwork: vi.fn(),
}));

describe('NetworkIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when the configured network is PUBLIC (mainnet)', () => {
    vi.mocked(getConfiguredNetwork).mockReturnValue('PUBLIC');
    const { container } = render(<NetworkIndicator />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a visible TESTNET badge when the configured network is TESTNET', () => {
    vi.mocked(getConfiguredNetwork).mockReturnValue('TESTNET');
    render(<NetworkIndicator />);
    expect(screen.getByTestId('network-indicator-badge')).toHaveTextContent(
      'TESTNET',
    );
  });

  it('exposes the indicator as a status region for assistive tech', () => {
    vi.mocked(getConfiguredNetwork).mockReturnValue('TESTNET');
    render(<NetworkIndicator />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('explains the network in plain language', () => {
    vi.mocked(getConfiguredNetwork).mockReturnValue('TESTNET');
    render(<NetworkIndicator />);
    expect(screen.getByText(/transactions are not real/i)).toBeInTheDocument();
  });
});
