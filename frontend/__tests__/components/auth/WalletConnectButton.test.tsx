import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import WalletConnectButton from '@/components/auth/WalletConnectButton';
import { useAuth } from '@/store/authStore';
import { StellarWalletsKit, KitEventType } from '@/lib/stellar-wallets-kit';
import { verifySignature } from '@/lib/stellar-auth';

// ─── Mocks ───────────────────────────────────────────────────────────────────
// vi.mock factories are hoisted so variables must be defined inside them.

const routerPush = vi.fn();
const setTokens = vi.fn();
const setWalletAddress = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock('@/store/authStore', () => ({
  useAuth: vi.fn(() => ({
    setTokens,
    setWalletAddress,
  })),
}));

vi.mock('@/lib/stellar-wallets-kit', () => ({
  initializeStellarWalletsKit: vi.fn(),
  StellarWalletsKit: {
    getAddress: vi.fn(),
    authModal: vi.fn(),
    getNetwork: vi.fn(),
    signTransaction: vi.fn().mockResolvedValue({ signedTxXdr: 'signed-xdr' }),
  },
}));
/**
 * useWallet subscribes to StellarWalletsKit.on(...) for STATE_UPDATED /
 * WALLET_SELECTED / DISCONNECT. The mock below stores the last registered
 * callback per event type and exposes a test-only `__emit` helper so tests
 * can drive the hook's reactive state the same way the real kit would.
 */
const eventCallbacks: Record<string, ((event: unknown) => void) | undefined> =
  {};

vi.mock('@/lib/stellar-wallets-kit', () => {
  const KitEventType = {
    STATE_UPDATED: 'STATE_UPDATE',
    WALLET_SELECTED: 'WALLET_SELECTED',
    DISCONNECT: 'DISCONNECT',
  };

  return {
    initializeStellarWalletsKit: vi.fn(),
    KitEventType,
    StellarWalletsKit: {
      getAddress: vi.fn(),
      fetchAddress: vi.fn(),
      setWallet: vi.fn(),
      signTransaction: vi.fn().mockResolvedValue({ signedTxXdr: 'signed-xdr' }),
      disconnect: vi.fn(),
      refreshSupportedWallets: vi.fn().mockResolvedValue([
        {
          id: 'freighter',
          name: 'Freighter',
          type: 'HOT_WALLET',
          isAvailable: true,
          isPlatformWrapper: false,
          icon: '',
          url: '',
        },
      ]),
      on: vi.fn((type: string, callback: (event: unknown) => void) => {
        eventCallbacks[type] = callback;
        return vi.fn();
      }),
    },
  };
});

vi.mock('@/lib/stellar-auth', () => ({
  requestChallenge: vi.fn().mockResolvedValue('challenge-xdr'),
  verifySignature: vi.fn().mockResolvedValue({
    accessToken: 'token',
    refreshToken: 'refresh',
    user: { id: '1', email: 'test@test.com', role: 'user' },
  }),
}));

vi.mock('@/lib/stellar-network', () => ({
  getConfiguredNetwork: vi.fn().mockReturnValue('TESTNET'),
  getNetworkLabel: vi.fn((n: string) => (n === 'PUBLIC' ? 'Mainnet' : 'Testnet')),
  getNetworkPassphrase: vi.fn().mockReturnValue('Test Network'),
  matchWalletNetwork: vi.fn(
    (walletNetwork: { network: string; networkPassphrase: string } | null) => {
      if (!walletNetwork) return { status: 'undetermined' };
      if (walletNetwork.networkPassphrase === 'Test Network') {
        return { status: 'match' };
      }
      return {
        status: 'mismatch',
        walletNetworkLabel: walletNetwork.network || 'a different network',
      };
    },
  ),
}));

vi.mock('@/lib/navigation/detect-user-role', () => ({
  detectRoleFromWallet: vi.fn().mockResolvedValue('user'),
}));

vi.mock('@/hooks/useOnboardingGate', () => ({
  clearEmailOnboardingSkip: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    loading: vi.fn(),
    dismiss: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Simulates the kit's STATE_UPDATED signal firing with a given address. */
function emitAddress(address: string | undefined) {
  eventCallbacks[KitEventType.STATE_UPDATED]?.({
    eventType: KitEventType.STATE_UPDATED,
    payload: { address, networkPassphrase: 'Test Network' },
  });
}

async function selectWallet(name: RegExp = /freighter/i) {
  fireEvent.click(await screen.findByText(name));
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('WalletConnectButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(eventCallbacks)) delete eventCallbacks[key];
    vi.mocked(useAuth).mockReturnValue({ setTokens, setWalletAddress } as any);
    vi.mocked(StellarWalletsKit.fetchAddress).mockResolvedValue({
      address: 'GABC123',
    });
    vi.mocked(StellarWalletsKit.getNetwork).mockResolvedValue({
      network: 'TESTNET',
      networkPassphrase: 'Test Network',
    });
    vi.mocked(StellarWalletsKit.refreshSupportedWallets).mockResolvedValue([
      {
        id: 'freighter',
        name: 'Freighter',
        type: 'HOT_WALLET',
        isAvailable: true,
        isPlatformWrapper: false,
        icon: '',
        url: '',
      },
    ]);
  });

  it('renders a button with the default label', () => {
    render(<WalletConnectButton />);
    expect(
      screen.getByRole('button', { name: /connect wallet/i }),
    ).toBeInTheDocument();
  });

  it('honors a custom buttonText prop', () => {
    render(<WalletConnectButton buttonText="Connect Stellar Wallet" />);
    expect(
      screen.getByRole('button', { name: /connect stellar wallet/i }),
    ).toBeInTheDocument();
  });

  it('applies a custom className prop to the button', () => {
    render(<WalletConnectButton className="custom-class" />);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('opens the wallet selector modal on click when no wallet is connected', async () => {
    render(<WalletConnectButton />);
    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));

    expect(await screen.findByText('Connect a wallet')).toBeInTheDocument();
    await waitFor(() =>
      expect(StellarWalletsKit.refreshSupportedWallets).toHaveBeenCalled(),
    );
  });

  it('selects a wallet from the modal, then completes login and redirects to the dashboard', async () => {
    render(<WalletConnectButton />);
    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
    await selectWallet();

    await waitFor(() =>
      expect(StellarWalletsKit.setWallet).toHaveBeenCalledWith('freighter'),
    );
    await waitFor(() =>
      expect(verifySignature).toHaveBeenCalledWith(
        'GABC123',
        'challenge-xdr',
        'signed-xdr',
      ),
    );
    await waitFor(() =>
      expect(setTokens).toHaveBeenCalledWith('token', 'refresh', {
        id: '1',
        email: 'test@test.com',
        role: 'user',
        firstName: '',
        lastName: '',
        emailVerified: false,
        avatar: undefined,
        locale: undefined,
      }),
    );
    expect(setWalletAddress).toHaveBeenCalledWith('GABC123');
    expect(routerPush).toHaveBeenCalledWith('/user');
  });

  it('reuses an already-connected wallet without reopening the picker', async () => {
    render(<WalletConnectButton />);

    // Simulates the kit's activeAddress signal already being hydrated from
    // localStorage at mount (i.e. the connection survived a page reload).
    act(() => {
      emitAddress('GXYZ789');
    });

    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));

    await waitFor(() =>
      expect(setWalletAddress).toHaveBeenCalledWith('GXYZ789'),
    );
    expect(screen.queryByText('Connect a wallet')).not.toBeInTheDocument();
  });

  it('normalizes a wallet-only account with no name on file to empty strings, not null', async () => {
    vi.mocked(verifySignature).mockResolvedValueOnce({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: {
        id: '1',
        email: null,
        firstName: null,
        lastName: null,
        role: 'user',
      },
    });

    render(<WalletConnectButton />);
    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
    await selectWallet();

    await waitFor(() =>
      expect(setTokens).toHaveBeenCalledWith(
        'token',
        'refresh',
        expect.objectContaining({ firstName: '', lastName: '' }),
      ),
    );
  });

  it('redirects admins to /admin', async () => {
    vi.mocked(verifySignature).mockResolvedValueOnce({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: '1', email: 'admin@test.com', role: 'admin' },
    });

    render(<WalletConnectButton />);
    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
    await selectWallet();

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith('/admin'));
  });

  it('calls onSuccess instead of redirecting when provided', async () => {
    const onSuccess = vi.fn();
    render(<WalletConnectButton onSuccess={onSuccess} />);
    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
    await selectWallet();

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(routerPush).not.toHaveBeenCalled();
  });

  it('shows a distinct error and keeps the modal open when the wallet is not installed', async () => {
    vi.mocked(StellarWalletsKit.fetchAddress).mockRejectedValue({
      code: -3,
      message: 'Freighter is not installed.',
    });

    render(<WalletConnectButton />);
    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
    await selectWallet();

    expect(
      await screen.findByText("This wallet isn't installed in your browser."),
    ).toBeInTheDocument();
    expect(setTokens).not.toHaveBeenCalled();
  });

  it('silently ignores the user rejecting the connection request, without an error toast', async () => {
    vi.mocked(StellarWalletsKit.fetchAddress).mockRejectedValue({
      code: -1,
      message: 'The user closed the modal.',
    });
    const toast = (await import('react-hot-toast')).default;

    render(<WalletConnectButton />);
    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
    await selectWallet();

    await waitFor(() =>
      expect(StellarWalletsKit.fetchAddress).toHaveBeenCalled(),
    );
    expect(toast.error).not.toHaveBeenCalled();
    expect(setTokens).not.toHaveBeenCalled();
  });

  describe('network mismatch guard', () => {
    it('proceeds to sign when the wallet network matches the configured network', async () => {
      render(<WalletConnectButton />);
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() =>
        expect(StellarWalletsKit.signTransaction).toHaveBeenCalled(),
      );
      expect(setTokens).toHaveBeenCalled();
    });

    it('blocks signing and shows an explanatory error on a detected network mismatch', async () => {
      vi.mocked(StellarWalletsKit.getNetwork).mockResolvedValue({
        network: 'PUBLIC',
        networkPassphrase: 'Public Global Stellar Network ; September 2015',
      });
      const toast = (await import('react-hot-toast')).default;

      render(<WalletConnectButton />);
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
          "Your wallet is connected to PUBLIC, but this app is configured for Testnet. Switch your wallet's network before signing.",
        ),
      );
      expect(StellarWalletsKit.signTransaction).not.toHaveBeenCalled();
      expect(setTokens).not.toHaveBeenCalled();
    });

    it('blocks signing with a verification-failure message when the wallet does not support getNetwork (e.g. Albedo, xBull)', async () => {
      vi.mocked(StellarWalletsKit.getNetwork).mockRejectedValue({
        code: -3,
        message: 'Albedo does not support the "getNetwork" function',
      });
      const toast = (await import('react-hot-toast')).default;

      render(<WalletConnectButton />);
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
          "Could not verify your wallet's network. This app is configured for Testnet — please confirm your wallet is on the same network before signing.",
        ),
      );
      expect(StellarWalletsKit.signTransaction).not.toHaveBeenCalled();
      expect(setTokens).not.toHaveBeenCalled();
    });

    it('re-enables the connect button after blocking on a mismatch', async () => {
      vi.mocked(StellarWalletsKit.getNetwork).mockResolvedValue({
        network: 'PUBLIC',
        networkPassphrase: 'Public Global Stellar Network ; September 2015',
      });

      render(<WalletConnectButton />);
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => expect(screen.getByRole('button')).not.toBeDisabled());
    });
  it('closes the modal without connecting when Cancel is clicked', async () => {
    render(<WalletConnectButton />);
    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
    await screen.findByText('Connect a wallet');

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() =>
      expect(screen.queryByText('Connect a wallet')).not.toBeInTheDocument(),
    );
    expect(StellarWalletsKit.setWallet).not.toHaveBeenCalled();
  });
});
