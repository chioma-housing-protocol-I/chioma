'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth, type User } from '@/store/authStore';
import { StellarWalletsKit } from '@/lib/stellar-wallets-kit';
import {
  useWallet,
  classifyWalletError,
  type WalletError,
} from '@/hooks/useWallet';
import WalletSelectorModal from '@/components/auth/WalletSelectorModal';
import toast from 'react-hot-toast';
import { requestChallenge, verifySignature } from '@/lib/stellar-auth';
import {
  getConfiguredNetwork,
  getNetworkLabel,
  getNetworkPassphrase,
  matchWalletNetwork,
} from '@/lib/stellar-network';
import { detectRoleFromWallet } from '@/lib/navigation/detect-user-role';
import { clearEmailOnboardingSkip } from '@/hooks/useOnboardingGate';

interface WalletConnectButtonProps {
  onSuccess?: () => void;
  className?: string;
  buttonText?: string;
}

export default function WalletConnectButton({
  onSuccess,
  className = '',
  buttonText = 'Connect Wallet',
}: WalletConnectButtonProps) {
  const router = useRouter();
  const { setTokens, setWalletAddress } = useAuth();
  const wallet = useWallet();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [pendingWalletId, setPendingWalletId] = useState<string | null>(null);

  const isConnecting = wallet.isConnecting || isAuthenticating;

  const authenticateWithAddress = async (address: string) => {
    setIsAuthenticating(true);

    try {
      // Get Challenge
      toast.loading('Getting authentication challenge...', {
        id: 'wallet-challenge',
      });
      const challengeXdr = await requestChallenge(address);
      toast.dismiss('wallet-challenge');

      // Verify the wallet is actually on the network this app is configured
      // for before asking it to sign anything. Every module in the kit
      // implements `getNetwork()` (it's a required part of `ModuleInterface`,
      // not Freighter-specific), but some wallets — Albedo and xBull, at
      // least — always reject it as unsupported. Signing is blocked in that
      // "undetermined" case too: this check exists specifically to prevent
      // an expensive mistake (signing a real transaction thinking it's a
      // test one, or vice versa), so an inability to verify is treated the
      // same as a verified mismatch rather than silently let through.
      let walletNetwork: { network: string; networkPassphrase: string } | null;
      try {
        walletNetwork = await StellarWalletsKit.getNetwork();
      } catch {
        walletNetwork = null;
      }

      const networkMatch = matchWalletNetwork(walletNetwork);
      if (networkMatch.status !== 'match') {
        toast.dismiss('wallet-challenge');
        const configuredLabel = getNetworkLabel(getConfiguredNetwork());
        const message =
          networkMatch.status === 'mismatch'
            ? `Your wallet is connected to ${networkMatch.walletNetworkLabel}, but this app is configured for ${configuredLabel}. Switch your wallet's network before signing.`
            : `Could not verify your wallet's network. This app is configured for ${configuredLabel} — please confirm your wallet is on the same network before signing.`;
        toast.error(message);
        return;
      }

      // Sign Challenge
      toast.loading('Please sign the transaction in your wallet...', {
        id: 'wallet-sign',
      });

      const { signedTxXdr } = await StellarWalletsKit.signTransaction(
        challengeXdr,
        {
          networkPassphrase: getNetworkPassphrase(),
          address,
        },
      );
      toast.dismiss('wallet-sign');

      // Verify Signature
      toast.loading('Verifying authentication...', { id: 'wallet-verify' });
      const result = await verifySignature(address, challengeXdr, signedTxXdr);
      toast.dismiss('wallet-verify');

      // Manage session state. A refresh token is optional — some auth
      // backends only issue an access token — so it must not gate the
      // session, otherwise a valid login is discarded as malformed.
      if (result.accessToken && result.user) {
        // Wallet-only accounts have no name on file yet — the backend
        // returns firstName/lastName as null rather than ''. Every other
        // login path (password, OAuth) normalizes these before setTokens;
        // do the same here so consumers that index user.firstName[0]
        // (e.g. the navbar avatar initial) don't crash on null.
        const rawUser = result.user;
        let userRole = rawUser.role;

        // Use the role from the backend response directly
        // The backend already determines the role based on the wallet address
        if (!userRole) {
          // Only detect role if backend didn't provide one (shouldn't happen)
          toast.loading('Detecting user role...', { id: 'role-detect' });
          const detectedRole = await detectRoleFromWallet(address);
          toast.dismiss('role-detect');

          if (detectedRole) {
            userRole = detectedRole === 'agent' ? 'agent' : 'user';
          } else {
            // No role found - this shouldn't happen in production
            // but handle gracefully
            toast.error('Unable to determine your role. Please try again.');
            setIsAuthenticating(false);
            return;
          }
        }

        const userWithRole: User = {
          id: rawUser.id,
          email: rawUser.email ?? '',
          emailVerified: rawUser.emailVerified ?? false,
          firstName: rawUser.firstName ?? '',
          lastName: rawUser.lastName ?? '',
          avatar: rawUser.avatar,
          locale: rawUser.locale,
          role: (userRole as 'admin' | 'user' | 'agent') ?? 'user',
        };

        setTokens(result.accessToken, result.refreshToken ?? '', userWithRole);
        setWalletAddress(address);
        // A deliberate reconnect starts the onboarding prompt fresh.
        clearEmailOnboardingSkip();
        toast.success('Successfully logged in with Wallet!');

        if (onSuccess) {
          onSuccess();
        } else {
          // Always land on the dashboard. Accounts with no email yet are
          // prompted there by WalletEmailBanner rather than being blocked.
          const isAdmin = ['admin', 'super_admin'].includes(
            userWithRole.role?.toLowerCase() || '',
          );
          const dashboardRoute = isAdmin ? '/admin' : '/user';
          router.push(dashboardRoute);
        }
      } else {
        throw new Error('Invalid authentication response');
      }
    } catch (error: unknown) {
      toast.dismiss('wallet-challenge');
      toast.dismiss('wallet-sign');
      toast.dismiss('wallet-verify');

      // A rejected signature request (declining to sign the auth challenge)
      // is a deliberate no-op, same treatment as dismissing the selector.
      const classified: WalletError =
        error && typeof error === 'object' && 'reason' in error
          ? (error as WalletError)
          : classifyWalletError(error);

      if (classified.reason !== 'rejected') {
        toast.error(classified.message || 'Wallet connection failed');
        console.error('Wallet connect error:', error);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSelectWallet = async (walletId: string) => {
    setPendingWalletId(walletId);
    try {
      const address = await wallet.connect(walletId);
      setIsSelectorOpen(false);
      await authenticateWithAddress(address);
    } catch {
      // wallet.connect already classified and stored the error on
      // wallet.error; the selector modal renders it and stays open so the
      // user can pick a different wallet without restarting the flow.
    } finally {
      setPendingWalletId(null);
    }
  };

  const handleOpenSelector = async () => {
    if (isConnecting) return;

    // Reuse an already-connected wallet (e.g. still active from before a
    // reload) instead of forcing the picker again.
    if (wallet.address) {
      await authenticateWithAddress(wallet.address);
      return;
    }

    wallet.clearError();
    setIsSelectorOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpenSelector}
        disabled={isConnecting}
        className={`inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium transition-colors ${className}`}
      >
        {isConnecting && <Loader2 size={16} className="animate-spin" />}
        {isConnecting ? 'Connecting…' : buttonText}
      </button>

      <WalletSelectorModal
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        onSelectWallet={handleSelectWallet}
        listWallets={wallet.listWallets}
        connectingWalletId={pendingWalletId}
        error={wallet.error}
      />
    </>
  );
}
