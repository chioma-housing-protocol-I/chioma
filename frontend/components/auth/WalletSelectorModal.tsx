'use client';

import { useEffect, useState } from 'react';
import { Loader2, Wallet as WalletIcon, ExternalLink } from 'lucide-react';
import type { ISupportedWallet } from '@/lib/stellar-wallets-kit';
import type { WalletError } from '@/hooks/useWallet';

interface WalletSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWallet: (walletId: string) => void;
  listWallets: () => Promise<ISupportedWallet[]>;
  connectingWalletId: string | null;
  error: WalletError | null;
}

const ERROR_COPY: Record<WalletError['reason'], string> = {
  'not-installed': "This wallet isn't installed in your browser.",
  rejected: 'Connection request was rejected in your wallet.',
  'wrong-network': 'Your wallet is set to the wrong network.',
  unknown: 'Could not connect. Please try again.',
};

export default function WalletSelectorModal({
  isOpen,
  onClose,
  onSelectWallet,
  listWallets,
  connectingWalletId,
  error,
}: WalletSelectorModalProps) {
  const [wallets, setWallets] = useState<ISupportedWallet[]>([]);
  const [isLoadingWallets, setIsLoadingWallets] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    (async () => {
      setIsLoadingWallets(true);
      try {
        const result = await listWallets();
        if (!cancelled) setWallets(result);
      } finally {
        if (!cancelled) setIsLoadingWallets(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, listWallets]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 max-w-md w-full border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-1">
            Connect a wallet
          </h2>
          <p className="text-sm text-blue-200/60">
            Choose a Stellar wallet to continue.
          </p>
        </div>

        {isLoadingWallets ? (
          <div className="flex items-center justify-center py-10 text-blue-200/60">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : wallets.length === 0 ? (
          <p className="text-center text-sm text-blue-200/60 py-10">
            No supported wallets were found.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {wallets.map((wallet) => {
              const isConnectingThis = connectingWalletId === wallet.id;
              const isDisabled =
                connectingWalletId !== null && !isConnectingThis;

              return (
                <button
                  key={wallet.id}
                  type="button"
                  onClick={() => onSelectWallet(wallet.id)}
                  disabled={isDisabled || isConnectingThis}
                  className={`flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isConnectingThis ? 'border-blue-500/50 bg-blue-500/10' : ''
                  }`}
                >
                  {wallet.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element -- wallet icons are remote SVGs supplied by each wallet module at runtime
                    <img
                      src={wallet.icon}
                      alt=""
                      className="h-8 w-8 rounded-md"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-md bg-white/10 flex items-center justify-center text-blue-300">
                      <WalletIcon size={16} />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {wallet.name}
                    </p>
                    {!wallet.isAvailable && (
                      <p className="text-xs text-amber-300/80 flex items-center gap-1">
                        Not installed
                        <ExternalLink size={10} />
                      </p>
                    )}
                  </div>

                  {isConnectingThis && (
                    <Loader2
                      size={16}
                      className="animate-spin text-blue-300 shrink-0"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {ERROR_COPY[error.reason]}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl border border-white/10 py-2.5 text-sm text-blue-200/60 hover:text-white hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
