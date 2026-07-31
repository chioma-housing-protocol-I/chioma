'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/store/authStore';
import {
  initializeStellarWalletsKit,
  StellarWalletsKit,
} from '@/lib/stellar-wallets-kit';
import toast from 'react-hot-toast';
import { requestChallenge, verifySignature } from '@/lib/stellar-auth';
import { getNetworkPassphrase } from '@/lib/stellar-network';
import { detectRoleFromWallet } from '@/lib/navigation/detect-user-role';
import { clearEmailOnboardingSkip } from '@/hooks/useOnboardingGate';

interface WalletConnectButtonProps {
  onSuccess?: () => void;
  className?: string;
  buttonText?: string;
}

/**
 * The kit throws `{ code: -1, message: 'The user closed the modal.' }` (or
 * similar wording) when the picker is dismissed without selecting a wallet,
 * and wallet extensions throw their own "user rejected" style errors when
 * the sign request is declined. Both are a deliberate no-op, not a failure.
 */
function isUserDismissal(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    if ((error as { code?: number }).code === -1) return true;
    if ((error as { code?: number }).code === -4) return true;
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message)
        : '';

  const normalized = message.toLowerCase();
  return (
    normalized.includes('closed the modal') ||
    normalized.includes('cancelled') ||
    normalized.includes('canceled') ||
    normalized.includes('reject') ||
    normalized.includes('user denied')
  );
}

export default function WalletConnectButton({
  onSuccess,
  className = '',
  buttonText = 'Connect Wallet',
}: WalletConnectButtonProps) {
  const router = useRouter();
  const { setTokens, setWalletAddress } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleWalletConnect = async () => {
    if (isConnecting) return;
    setIsConnecting(true);

    try {
      initializeStellarWalletsKit();

      // If a wallet is already active in the kit (e.g. it stayed connected
      // across a reload), reuse it. Otherwise open the picker and wait for
      // the user to actually finish selecting one — calling getAddress()
      // before that resolves throws "No wallet has been connected", which
      // is why the previous implementation (hijacking the kit's own button
      // click) failed on every first-time connect.
      let address: string;
      try {
        ({ address } = await StellarWalletsKit.getAddress());
      } catch {
        ({ address } = await StellarWalletsKit.authModal());
      }

      if (!address) {
        throw new Error('Failed to get wallet address');
      }

      // Get Challenge
      toast.loading('Getting authentication challenge...', {
        id: 'wallet-challenge',
      });
      const challengeXdr = await requestChallenge(address);
      toast.dismiss('wallet-challenge');

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
        let userWithRole = {
          ...result.user,
          firstName: result.user.firstName ?? '',
          lastName: result.user.lastName ?? '',
        };

        // Use the role from the backend response directly
        // The backend already determines the role based on the wallet address
        if (!userWithRole.role) {
          // Only detect role if backend didn't provide one (shouldn't happen)
          toast.loading('Detecting user role...', { id: 'role-detect' });
          const detectedRole = await detectRoleFromWallet(address);
          toast.dismiss('role-detect');

          if (detectedRole) {
            userWithRole = { ...userWithRole, role: detectedRole as any };
          } else {
            // No role found - this shouldn't happen in production
            // but handle gracefully
            toast.error('Unable to determine your role. Please try again.');
            setIsConnecting(false);
            return;
          }
        }

        setTokens(
          result.accessToken,
          result.refreshToken ?? null,
          userWithRole,
        );
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

      if (!isUserDismissal(error)) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        toast.error(errorMessage || 'Wallet connection failed');
        console.error('Wallet connect error:', error);
      }
      // Silently ignore user rejections / dismissed modals
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleWalletConnect}
      disabled={isConnecting}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium transition-colors ${className}`}
    >
      {isConnecting && <Loader2 size={16} className="animate-spin" />}
      {isConnecting ? 'Connecting…' : buttonText}
    </button>
  );
}
