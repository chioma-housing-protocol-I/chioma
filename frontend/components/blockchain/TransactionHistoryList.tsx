'use client';

import React from 'react';
import type { BlockchainTxRow } from '@/components/blockchain/types';
import { getStellarExpertTxUrl } from '@/lib/stellar-network';
import { ArrowDownLeft, ArrowUpRight, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useDateFnsLocale } from '@/lib/utils/date-fns-locale';

export interface TransactionHistoryListProps {
  items: BlockchainTxRow[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function TransactionHistoryList({
  items,
  loading,
  emptyMessage = 'No on-chain transactions yet.',
  className = '',
}: TransactionHistoryListProps) {
  const dateFnsLocale = useDateFnsLocale();
  if (loading) {
    return (
      <div
        className={`rounded-2xl border border-white/10 bg-white/5 px-4 py-12 text-center text-slate-400 text-sm ${className}`}
      >
        Loading history…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className={`rounded-2xl border border-white/10 bg-white/5 px-4 py-12 text-center text-slate-500 text-sm ${className}`}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul
      className={`divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5 overflow-hidden ${className}`}
    >
      {items.map((tx) => (
        <li
          key={tx.id}
          className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                tx.direction === 'in'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
              }`}
            >
              {tx.direction === 'in' ? (
                <ArrowDownLeft size={18} />
              ) : (
                <ArrowUpRight size={18} />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {tx.amount} {tx.asset}
              </p>
              <p className="text-xs text-slate-500 font-mono truncate">
                {tx.hash}
              </p>
              {tx.memo && (
                <p className="text-xs text-slate-500 truncate">
                  Memo: {tx.memo}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            <span className="text-xs text-slate-500 whitespace-nowrap">
              {format(new Date(tx.createdAt), 'MMM d, yyyy HH:mm', {
                locale: dateFnsLocale,
              })}
            </span>
            <a
              href={getStellarExpertTxUrl(tx.hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-sky-400 hover:text-sky-300"
            >
              Explorer
              <ExternalLink size={12} />
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
