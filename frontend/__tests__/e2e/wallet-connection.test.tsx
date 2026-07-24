/**
 * E2E-style integration tests for wallet connection flow.
 * Covers: WalletConnectButton (blockchain variant) and the connected state display.
 * Issue: #1249
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Stub wallet provider ──────────────────────────────────────────────────

const mockGetFreighterPublicKey = vi.fn();

vi.mock('@/lib/stellar-auth', () => ({
  getFreighterPublicKey: () => mockGetFreighterPublicKey(),
}));

vi.mock('@/components/icons/StellarLogo', () => ({
  StellarLogo: ({ size, className }: { size?: number; className?: string }) =>
    React.createElement(
      'span',
      { 'aria-label': 'stellar-logo', className },
      `[stellar:${size}]`,
    ),
}));

import { WalletConnectButton } from '@/components/blockchain/WalletConnectButton';

const MOCK_PUBLIC_KEY =
  'GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOOHSUJUJ';

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('[E2E] Wallet connection – WalletConnectButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Connect flow ──────────────────────────────────────────────────────────

  it('renders the Connect Freighter button initially', () => {
    render(React.createElement(WalletConnectButton));
    expect(
      screen.getByRole('button', { name: /connect freighter/i }),
    ).toBeInTheDocument();
  });

  it('shows a loading state while connecting', async () => {
    let resolve!: (pk: string) => void;
    mockGetFreighterPublicKey.mockReturnValue(
      new Promise<string>((r) => {
        resolve = r;
      }),
    );

    render(React.createElement(WalletConnectButton));
    fireEvent.click(screen.getByRole('button', { name: /connect freighter/i }));

    await waitFor(() =>
      expect(screen.getByText(/connecting/i)).toBeInTheDocument(),
    );

    resolve(MOCK_PUBLIC_KEY);
  });

  it('displays the truncated public key after a successful connection', async () => {
    mockGetFreighterPublicKey.mockResolvedValue(MOCK_PUBLIC_KEY);

    render(React.createElement(WalletConnectButton));
    fireEvent.click(screen.getByRole('button', { name: /connect freighter/i }));

    // Truncated address is shown (first 6 chars … last 4 chars)
    await waitFor(() =>
      expect(screen.getByText(/GDRXE2…UJUJ/)).toBeInTheDocument(),
    );
  });

  it('invokes the onConnect callback with the full public key', async () => {
    mockGetFreighterPublicKey.mockResolvedValue(MOCK_PUBLIC_KEY);
    const onConnect = vi.fn();

    render(React.createElement(WalletConnectButton, { onConnect }));
    fireEvent.click(screen.getByRole('button', { name: /connect freighter/i }));

    await waitFor(() =>
      expect(onConnect).toHaveBeenCalledWith(MOCK_PUBLIC_KEY),
    );
  });

  // ── Disconnect flow ───────────────────────────────────────────────────────

  it('shows a Disconnect button after connecting', async () => {
    mockGetFreighterPublicKey.mockResolvedValue(MOCK_PUBLIC_KEY);

    render(React.createElement(WalletConnectButton));
    fireEvent.click(screen.getByRole('button', { name: /connect freighter/i }));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /disconnect/i }),
      ).toBeInTheDocument(),
    );
  });

  it('returns to disconnected state after clicking Disconnect', async () => {
    mockGetFreighterPublicKey.mockResolvedValue(MOCK_PUBLIC_KEY);

    render(React.createElement(WalletConnectButton));
    fireEvent.click(screen.getByRole('button', { name: /connect freighter/i }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /disconnect/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /disconnect/i }));
    expect(
      screen.getByRole('button', { name: /connect freighter/i }),
    ).toBeInTheDocument();
  });

  it('invokes the onDisconnect callback when the user disconnects', async () => {
    mockGetFreighterPublicKey.mockResolvedValue(MOCK_PUBLIC_KEY);
    const onDisconnect = vi.fn();

    render(React.createElement(WalletConnectButton, { onDisconnect }));
    fireEvent.click(screen.getByRole('button', { name: /connect freighter/i }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /disconnect/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /disconnect/i }));
    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });

  // ── Error / rejection path ────────────────────────────────────────────────

  it('displays an error message when wallet access is rejected', async () => {
    mockGetFreighterPublicKey.mockRejectedValue(
      new Error('User rejected the request'),
    );

    render(React.createElement(WalletConnectButton));
    fireEvent.click(screen.getByRole('button', { name: /connect freighter/i }));

    await waitFor(() =>
      expect(screen.getByText('User rejected the request')).toBeInTheDocument(),
    );
  });

  it('shows a generic error when wallet is unavailable', async () => {
    mockGetFreighterPublicKey.mockRejectedValue(
      new Error('Could not connect to Freighter'),
    );

    render(React.createElement(WalletConnectButton));
    fireEvent.click(screen.getByRole('button', { name: /connect freighter/i }));

    await waitFor(() =>
      expect(
        screen.getByText('Could not connect to Freighter'),
      ).toBeInTheDocument(),
    );
  });

  it('marks the error message with role="alert"', async () => {
    mockGetFreighterPublicKey.mockRejectedValue(
      new Error('Wallet unavailable'),
    );

    render(React.createElement(WalletConnectButton));
    fireEvent.click(screen.getByRole('button', { name: /connect freighter/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('clears the error message on a subsequent successful connection', async () => {
    mockGetFreighterPublicKey
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockResolvedValueOnce(MOCK_PUBLIC_KEY);

    render(React.createElement(WalletConnectButton));
    fireEvent.click(screen.getByRole('button', { name: /connect freighter/i }));
    await waitFor(() =>
      expect(screen.getByText('First attempt failed')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /connect freighter/i }));
    await waitFor(() =>
      expect(
        screen.queryByText('First attempt failed'),
      ).not.toBeInTheDocument(),
    );
  });

  // ── Connected state persists across re-render ─────────────────────────────

  it('connected state survives a parent re-render', async () => {
    mockGetFreighterPublicKey.mockResolvedValue(MOCK_PUBLIC_KEY);

    const { rerender } = render(
      React.createElement(WalletConnectButton, { className: 'initial' }),
    );
    fireEvent.click(screen.getByRole('button', { name: /connect freighter/i }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /disconnect/i }),
      ).toBeInTheDocument(),
    );

    rerender(
      React.createElement(WalletConnectButton, { className: 'updated' }),
    );
    expect(
      screen.getByRole('button', { name: /disconnect/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/GDRXE2…UJUJ/)).toBeInTheDocument();
  });
});
