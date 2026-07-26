'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAccountBalances } from '@/lib/stellar-horizon';
import { TrendingUp, Loader2 } from 'lucide-react';
import { formatCrypto } from '@/lib/utils/format';

interface StellarAccountBalanceProps {
  publicKey: string;
}

export function StellarAccountBalance({
  publicKey,
}: StellarAccountBalanceProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['stellar-balances', publicKey],
    queryFn: () => fetchAccountBalances(publicKey),
    staleTime: 30_000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 size={14} className="animate-spin" />
        <span>Loading balances...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-xs text-slate-500">
        Balance unavailable — account may not be funded on this network.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={14} className="text-emerald-400" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Balances
        </span>
      </div>
      {data.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5"
        >
          <span className="text-xs font-mono text-slate-400">{row.label}</span>
          <span className="text-sm font-semibold text-white">
            {formatCrypto(row.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}
