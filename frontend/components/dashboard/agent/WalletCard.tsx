'use client';

import React from 'react';
import { StellarLogo } from '@/components/icons/StellarLogo';

const WalletCard = () => {
  return (
    <div className="bg-linear-to-br from-blue-600 to-blue-500 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden">
      {/* Decorative Circles */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start mb-6">
          <span className="text-blue-100 text-sm font-medium">Main Wallet</span>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <StellarLogo size={20} color="white" />
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight">
            $12,450.00{' '}
            <span className="text-lg font-medium text-blue-100">USDC</span>
          </h2>
          <p className="text-xs text-blue-100 mt-1">
            Powered by Stellar Network
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button className="py-2 px-4 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm text-sm font-semibold transition-colors">
            Withdraw
          </button>
          <button className="py-2 px-4 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm text-sm font-semibold transition-colors">
            History
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalletCard;
