'use client';

import React, { useState } from 'react';
import WalletCard from '@/components/dashboard/agent/WalletCard';
import RecentPayouts from '@/components/dashboard/agent/RecentPayouts';
import WithdrawModal from '@/components/dashboard/agent/WithdrawModal';

export default function WalletPage() {
  const [currency, setCurrency] = useState<'USDC' | 'XLM'>('USDC');
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  // Mock balance
  const balance = currency === 'USDC' ? 12450.0 : 102450.0;

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
          <RecentPayouts />
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
