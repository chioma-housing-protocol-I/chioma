'use client';

import React from 'react';
import { StellarLogo } from '@/components/icons/StellarLogo';

interface WalletCardProps {
  balance?: number;
  currency?: 'USDC' | 'XLM';
  onCurrencyToggle?: () => void;
  onWithdraw?: () => void;
}

const WalletCard = ({
  balance = 12450.0,
  currency = 'USDC',
  onCurrencyToggle,
  onWithdraw,
}: WalletCardProps = {}) => {
  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(balance);

  const displayBalance =
    currency === 'USDC' ? formattedBalance : `${balance.toLocaleString()} XLM`;

  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/20 rounded-full blur-3xl pointer-events-none group-hover:bg-white/30 transition-all duration-500" />
      <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start mb-8">
          <div className="flex flex-col">
            <span className="text-blue-100/60 text-[10px] font-bold uppercase tracking-widest">
              Main Wallet
            </span>
            <span className="text-white text-xs font-bold tracking-tight mt-1 opacity-80">
              Stellar Wallet
            </span>
          </div>
          <button
            onClick={onCurrencyToggle}
            className="px-3 py-1.5 rounded-xl bg-white/20 border border-white/20 flex items-center justify-center backdrop-blur-md shadow-lg hover:bg-white/30 transition-colors text-xs font-bold"
            title="Toggle Currency"
          >
            <StellarLogo size={16} color="white" className="mr-2" />
            {currency}
          </button>
        </div>

        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-baseline gap-2">
            {displayBalance}
            {currency === 'USDC' && (
              <span className="text-base font-bold text-blue-200">USDC</span>
            )}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <p className="text-[10px] font-bold text-blue-100/60 uppercase tracking-widest">
              Live on Stellar
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onWithdraw}
            className="py-2.5 px-4 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-xs font-bold transition-all border border-white/10 uppercase tracking-widest shadow-lg"
          >
            Withdraw
          </button>
          <button className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-xs font-bold transition-all border border-white/10 uppercase tracking-widest">
            History
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalletCard;
