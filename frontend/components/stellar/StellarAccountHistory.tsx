'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ArrowDownLeft, ArrowUpRight, Loader2 } from 'lucide-react';
import { formatDate, formatCrypto } from '@/lib/utils/format';

interface Transaction {
  id: number;
  transactionHash: string;
  sourceAccount: string;
  destinationAccount: string;
  amount: string;
  assetType: string;
  assetCode?: string;
  status: string;
  createdAt: string;
}

interface StellarAccountHistoryProps {
  publicKey: string;
}

export function StellarAccountHistory({
  publicKey,
}: StellarAccountHistoryProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['stellar-history', publicKey],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        transactions: Transaction[];
        total: number;
      }>(`/stellar/transactions?publicKey=${publicKey}&limit=20`);
      return data;
    },
    staleTime: 30_000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
        <Loader2 size={14} className="animate-spin" />
        <span>Loading history...</span>
      </div>
    );
  }

  const transactions = data?.transactions ?? [];

  if (transactions.length === 0) {
    return (
      <p className="text-xs text-slate-500 py-4 text-center">
        No transactions found.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => {
        const isIncoming = tx.destinationAccount === publicKey;
        return (
          <div
            key={tx.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                isIncoming ? 'bg-emerald-500/10' : 'bg-red-500/10'
              }`}
            >
              {isIncoming ? (
                <ArrowDownLeft size={14} className="text-emerald-400" />
              ) : (
                <ArrowUpRight size={14} className="text-red-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-slate-400 truncate">
                {tx.transactionHash.slice(0, 16)}…
              </p>
              <p className="text-[10px] text-slate-500">
                {formatDate(tx.createdAt)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p
                className={`text-sm font-semibold ${
                  isIncoming ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {isIncoming ? '+' : '-'}
                {formatCrypto(tx.amount, tx.assetCode ?? 'XLM', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  tx.status === 'completed'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : tx.status === 'failed'
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-amber-500/10 text-amber-400'
                }`}
              >
                {tx.status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
