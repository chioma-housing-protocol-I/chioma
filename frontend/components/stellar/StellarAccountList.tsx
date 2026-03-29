'use client';

import React from 'react';
import { Wallet, CheckCircle, XCircle } from 'lucide-react';
import type { ManagedStellarAccount } from '@/lib/services/stellar-accounts.service';

interface StellarAccountListProps {
  accounts: ManagedStellarAccount[];
  selectedId: number | null;
  isLoading: boolean;
  onSelect: (account: ManagedStellarAccount) => void;
}

const TYPE_COLORS: Record<string, string> = {
  USER: 'bg-blue-500/10 text-blue-400',
  ESCROW: 'bg-purple-500/10 text-purple-400',
  FEE: 'bg-amber-500/10 text-amber-400',
  PLATFORM: 'bg-emerald-500/10 text-emerald-400',
};

export function StellarAccountList({
  accounts,
  selectedId,
  isLoading,
  onSelect,
}: StellarAccountListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
          <Wallet size={24} className="text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-300">No Stellar accounts found</p>
        <p className="text-xs text-slate-500 mt-1">Connect a wallet to get started</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2" role="list" aria-label="Stellar accounts">
      {accounts.map((account) => {
        const isSelected = account.id === selectedId;
        return (
          <li key={account.id}>
            <button
              onClick={() => onSelect(account)}
              aria-current={isSelected ? 'true' : undefined}
              className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-blue-600/20 border-blue-500/40'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs text-slate-300 truncate max-w-[180px]">
                  {account.publicKey.slice(0, 8)}…{account.publicKey.slice(-6)}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    TYPE_COLORS[account.accountType] ?? 'bg-white/10 text-slate-400'
                  }`}
                >
                  {account.accountType}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">
                  {parseFloat(account.balance).toFixed(2)} XLM
                </span>
                <span className="flex items-center gap-1 text-xs">
                  {account.isActive ? (
                    <>
                      <CheckCircle size={11} className="text-emerald-400" />
                      <span className="text-emerald-400">Active</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={11} className="text-red-400" />
                      <span className="text-red-400">Inactive</span>
                    </>
                  )}
                </span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
