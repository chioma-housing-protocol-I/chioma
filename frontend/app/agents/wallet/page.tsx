import React from 'react';
import { Wallet } from 'lucide-react';

export default function WalletPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">My Wallet</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Track your earnings and payouts
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-neutral-100">
        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
          <Wallet size={28} className="text-brand-blue" />
        </div>
        <h2 className="text-lg font-semibold text-neutral-800">
          No transactions yet
        </h2>
        <p className="text-sm text-neutral-500 mt-1 max-w-xs">
          Your wallet activity and payout history will appear here.
        </p>
      </div>
    </div>
  );
}
