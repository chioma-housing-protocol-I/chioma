'use client';

import React, { useState } from 'react';
import { Wallet, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/authStore';
import {
  getFreighterPublicKey,
  requestChallenge,
  signChallengeXdr,
  verifySignature,
} from '@/lib/stellar-auth';

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
  const [isLoading, setIsLoading] = useState(false);
  const { setTokens } = useAuth();

  const handleWalletConnect = async () => {
    setIsLoading(true);

    try {
      // 1. Get Public Key from Freighter
      const publicKey = await getFreighterPublicKey();

      // 2. Get Challenge
      const challengeXdr = await requestChallenge(publicKey);

      // 3. Sign Challenge
      toast.loading('Please sign the transaction in your wallet...', {
        id: 'wallet-sign',
      });
      let signature = '';
      try {
        signature = await signChallengeXdr(challengeXdr);
        toast.dismiss('wallet-sign');
      } catch (signError: unknown) {
        toast.dismiss('wallet-sign');
        toast.error('Authentication cancelled');
        throw signError;
      }

      // 4. Verify Signature
      toast.loading('Verifying authentication...', { id: 'wallet-verify' });
      const result = await verifySignature(publicKey, challengeXdr, signature);
      toast.dismiss('wallet-verify');

      // 5. Manage session state
      if (result.accessToken && result.refreshToken && result.user) {
        setTokens(result.accessToken, result.refreshToken, result.user);
        toast.success('Successfully logged in with Wallet!');
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error('Invalid authentication response');
      }
    } catch (error: unknown) {
      toast.dismiss('wallet-sign');
      toast.dismiss('wallet-verify');
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        !errorMessage.toLowerCase().includes('cancelled') &&
        !errorMessage.toLowerCase().includes('reject')
      ) {
        toast.error(errorMessage || 'Wallet connection failed');
      }
      console.error('Wallet connect error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleWalletConnect}
      disabled={isLoading}
      className={`relative w-full py-3 px-4 bg-neutral-900 border border-neutral-800 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-75 disabled:cursor-not-allowed group overflow-hidden hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:border-neutral-700 ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-white/80" />
      ) : (
        <Wallet className="w-5 h-5 text-white/90 group-hover:text-white transition-colors" />
      )}

      <span className="relative z-10">
        {isLoading ? 'Connecting...' : buttonText}
      </span>
    </button>
  );
}
