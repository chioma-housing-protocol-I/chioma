'use client';

import React, { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import WalletCard from '@/components/dashboard/agent/WalletCard';
import RecentPayouts, {
  type PayoutTransaction,
} from '@/components/dashboard/agent/RecentPayouts';
import WithdrawModal from '@/components/dashboard/agent/WithdrawModal';
import { useAuth } from '@/store/authStore';
import {
  useStellarNetworkAccount,
  readAssetBalance,
} from '@/lib/query/hooks/use-stellar-account';
import { useAnchorTransactions } from '@/lib/query/hooks/use-anchor-transactions';

// Shown while no wallet is connected (or the network is unreachable in dev).
const FALLBACK_BALANCES = { USDC: 12450.0, XLM: 102450.0 };

export default function WalletPage() {
  const [currency, setCurrency] = useState<'USDC' | 'XLM'>('USDC');
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const { walletAddress } = useAuth();

  const { data: networkAccount } = useStellarNetworkAccount(walletAddress);
  const { data: anchorPage } = useAnchorTransactions({ limit: 10 });

  const balance =
    readAssetBalance(networkAccount, currency) ?? FALLBACK_BALANCES[currency];

  const payouts = useMemo<PayoutTransaction[] | undefined>(() => {
    const items = anchorPage?.data ?? [];
    if (items.length === 0) return undefined; // RecentPayouts falls back to its demo rows
    return items.map((tx) => {
      const amount = Number(tx.amount);
      const isPositive = tx.type === 'deposit';
      return {
        id: tx.id,
        title:
          tx.type === 'deposit'
            ? `Deposit${tx.paymentMethod ? ` via ${tx.paymentMethod}` : ''}`
            : `Withdrawal${tx.destination ? ` to ${tx.destination.slice(0, 4)}…${tx.destination.slice(-4)}` : ''}`,
        time: formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true }),
        amount: `${isPositive ? '+' : '-'}$${Number.isFinite(amount) ? amount.toLocaleString() : tx.amount}`,
        currency: tx.currency,
        isPositive,
      };
    });
  }, [anchorPage]);

  const handleCurrencyToggle = () => {
    setCurrency((prev) => (prev === 'USDC' ? 'XLM' : 'USDC'));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Wallet</h1>
        <p className="text-sm text-blue-200/60 mt-1">
          Track your earnings and handle payouts
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 border-white/10">
          <WalletCard
            balance={balance}
            currency={currency}
            onCurrencyToggle={handleCurrencyToggle}
            onWithdraw={() => setIsWithdrawOpen(true)}
          />
        </div>

        <div className="lg:col-span-2">
          <RecentPayouts payouts={payouts} />
        </div>
      </div>

      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        currency={currency}
        balance={balance}
      />
    </div>
  );
}
