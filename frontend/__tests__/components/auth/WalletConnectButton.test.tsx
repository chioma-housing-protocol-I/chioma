import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import WalletConnectButton from '@/components/auth/WalletConnectButton';
import {
  initializeStellarWalletsKit,
  StellarWalletsKit,
} from '@/lib/stellar-wallets-kit';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// vi.mock factories are hoisted so variables must be defined inside them.

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/store/authStore', () => ({
  useAuth: vi.fn(() => ({
    setTokens: vi.fn(),
    setWalletAddress: vi.fn(),
  })),
}));

vi.mock('@/lib/stellar-wallets-kit', () => ({
  initializeStellarWalletsKit: vi.fn(),
  StellarWalletsKit: {
    createButton: vi.fn(),
    getAddress: vi.fn().mockResolvedValue({ address: 'GABC123' }),
    signTransaction: vi.fn().mockResolvedValue({ signedTxXdr: 'signed-xdr' }),
  },
}));

vi.mock('@/lib/stellar-auth', () => ({
  requestChallenge: vi.fn().mockResolvedValue('challenge-xdr'),
  verifySignature: vi.fn().mockResolvedValue({
    accessToken: 'token',
    refreshToken: 'refresh',
    user: { id: '1', email: 'test@test.com', role: 'user' },
  }),
}));

vi.mock('@/lib/stellar-network', () => ({
  getNetworkPassphrase: vi.fn().mockReturnValue('Test Network'),
}));

vi.mock('@/lib/navigation/detect-user-role', () => ({
  detectRoleFromWallet: vi.fn().mockResolvedValue('tenant'),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    loading: vi.fn(),
    dismiss: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('WalletConnectButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a container element after mounting', () => {
    const { container } = render(<WalletConnectButton />);
    // After mount, a div wrapper is rendered for the wallet kit button
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('renders wrapper div after mounting', async () => {
    const { container } = render(<WalletConnectButton />);
    await act(async () => {});
    // After mount, the buttonWrapperRef div replaces the placeholder
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('calls initializeStellarWalletsKit on mount', async () => {
    render(<WalletConnectButton />);
    await act(async () => {});
    expect(vi.mocked(initializeStellarWalletsKit)).toHaveBeenCalled();
  });

  it('accepts a custom className prop', async () => {
    const { container } = render(
      <WalletConnectButton className="custom-class" />,
    );
    await act(async () => {});
    const el = container.querySelector('.custom-class');
    expect(el).not.toBeNull();
  });

  it('calls StellarWalletsKit.createButton with wrapper element', async () => {
    render(<WalletConnectButton />);
    await act(async () => {});
    expect(vi.mocked(StellarWalletsKit.createButton)).toHaveBeenCalled();
  });
});
