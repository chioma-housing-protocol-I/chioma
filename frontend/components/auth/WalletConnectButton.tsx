'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/authStore';
import {
  initializeStellarWalletsKit,
  StellarWalletsKit,
} from '@/lib/stellar-wallets-kit';
import toast from 'react-hot-toast';
import { requestChallenge, verifySignature } from '@/lib/stellar-auth';
import { getNetworkPassphrase } from '@/lib/stellar-network';
import { detectRoleFromWallet } from '@/lib/navigation/detect-user-role';

interface WalletConnectButtonProps {
  onSuccess?: () => void;
  className?: string;
  buttonText?: string;
}

export default function WalletConnectButton({
  onSuccess,
  className = '',
}: WalletConnectButtonProps) {
  const buttonWrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { setTokens, setWalletAddress } = useAuth();
  const isInitializedRef = useRef(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component only renders on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !buttonWrapperRef.current || isInitializedRef.current)
      return;

    try {
      initializeStellarWalletsKit();

      // Create the wallet kit button
      StellarWalletsKit.createButton(buttonWrapperRef.current);
      isInitializedRef.current = true;

      // Override the button click handler to add our authentication logic
      const handleWalletConnect = async () => {
        if (isConnecting) return;
        setIsConnecting(true);

        try {
          const { address } = await StellarWalletsKit.getAddress();

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
          const result = await verifySignature(
            address,
            challengeXdr,
            signedTxXdr,
          );
          toast.dismiss('wallet-verify');

          // Manage session state
          if (result.accessToken && result.refreshToken && result.user) {
            let userWithRole = result.user;

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

            setTokens(result.accessToken, result.refreshToken, userWithRole);
            setWalletAddress(address);
            toast.success('Successfully logged in with Wallet!');

            if (onSuccess) {
              onSuccess();
            } else if (!userWithRole.email) {
              // Wallet-only account: no email on file yet, so route into the
              // short onboarding flow before the dashboard.
              setTimeout(() => {
                router.push('/complete-profile');
              }, 800);
            } else {
              const isAdmin = ['admin', 'super_admin'].includes(
                userWithRole.role?.toLowerCase() || '',
              );
              const dashboardRoute = isAdmin ? '/admin' : '/user';
              setTimeout(() => {
                router.push(dashboardRoute);
              }, 800);
            }
          } else {
            throw new Error('Invalid authentication response');
          }
        } catch (error: unknown) {
          toast.dismiss('wallet-challenge');
          toast.dismiss('wallet-sign');
          toast.dismiss('wallet-verify');

          // Check if error is a user rejection
          const isUserRejection =
            (error instanceof Error &&
              (error.message.toLowerCase().includes('cancelled') ||
                error.message.toLowerCase().includes('reject') ||
                error.message.toLowerCase().includes('user denied'))) ||
            (typeof error === 'object' &&
              error !== null &&
              'code' in error &&
              (error as any).code === -4);

          if (!isUserRejection) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            toast.error(errorMessage || 'Wallet connection failed');
            console.error('Wallet connect error:', error);
          }
          // Silently ignore user rejections
        } finally {
          setIsConnecting(false);
        }
      };

      // Find and override the button's click handler
      const observer = new MutationObserver(() => {
        const button = buttonWrapperRef.current?.querySelector('button');
        if (button && !button.dataset.customHandler) {
          button.dataset.customHandler = 'true';
          button.addEventListener('click', (e) => {
            e.preventDefault();
            handleWalletConnect();
          });
        }
      });

      observer.observe(buttonWrapperRef.current, {
        childList: true,
        subtree: true,
      });

      return () => {
        observer.disconnect();
      };
    } catch (error) {
      console.error('Failed to initialize wallet button:', error);
      toast.error('Failed to initialize wallet connection');
    }
  }, [setTokens, setWalletAddress, onSuccess, isConnecting, isMounted]);

  // Don't render anything until mounted on client
  if (!isMounted) {
    return (
      <div
        className={`${className} px-6 py-2.5 text-sm rounded-lg bg-blue-600 text-white font-medium`}
        suppressHydrationWarning
      >
        Connect Wallet
      </div>
    );
  }

  return (
    <div
      ref={buttonWrapperRef}
      className={className}
      suppressHydrationWarning
    />
  );
}
