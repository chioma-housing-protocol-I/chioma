'use client';

import React from 'react';
import { Shield, Wallet } from 'lucide-react';
import type { SecurityDepositsSectionProps } from './types';

const SecurityDepositsSection = ({
  deposits,
  onDepositClick,
  className = '',
}: SecurityDepositsSectionProps) => {
  if (deposits.length === 0) {
    return null;
  }

  return (
    <div
      className={`bg-white/5 backdrop-blur-sm rounded-3xl shadow-xl border border-white/10 overflow-hidden ${className}`}
    >
      <div className="px-6 py-5 border-b border-white/5 bg-white/5 flex items-center gap-3">
        <Shield className="text-emerald-400" size={20} strokeWidth={2.5} />
        <h2 className="text-lg font-bold text-white tracking-tight">
          Active Security Deposits
        </h2>
      </div>
      <div className="divide-y divide-white/5">
        {deposits.map((deposit) => (
          <div
            key={deposit.id}
            onClick={() => onDepositClick?.(deposit)}
            className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-white/5 transition-all duration-200 group cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-emerald-400 border border-white/5 group-hover:scale-110 transition-transform">
                <Wallet size={22} strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                  {deposit.propertyName}
                </p>
                <p className="text-xs text-blue-300/40 font-bold uppercase tracking-widest mt-1">
                  Tenant: {deposit.tenantName}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-white text-lg">
                {deposit.currency}{' '}
                {deposit.amount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p className="text-[10px] text-blue-300/40 font-bold uppercase tracking-widest mt-0.5">
                {deposit.status === 'held' && 'Held in escrow'}
                {deposit.status === 'released' && 'Released'}
                {deposit.status === 'disputed' && 'Disputed'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SecurityDepositsSection;
