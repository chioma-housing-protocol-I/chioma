'use client';

import React from 'react';
import { format } from 'date-fns';
import {
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import type { Transaction, PaginatedResponse } from '@/types';

interface TransactionHistoryProps {
  transactions: PaginatedResponse<Transaction> | undefined;
  isLoading: boolean;
  page: number;
  setPage: (page: number) => void;
}

const STELLAR_EXPLORER_BASE = 'https://stellar.expert/explorer/public/tx';

function getTypeBadge(type: Transaction['type']): string {
  const colors: Record<Transaction['type'], string> = {
    payment: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    refund: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    deposit: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    withdrawal: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  return colors[type] ?? 'bg-white/5 text-blue-300/40 border-white/10';
}

function getStatusBadge(status: Transaction['status']): string {
  const colors: Record<Transaction['status'], string> = {
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    failed: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };
  return colors[status] ?? 'bg-white/5 text-blue-300/40 border-white/10';
}

function TypeIcon({ type }: { type: Transaction['type'] }) {
  if (type === 'payment' || type === 'withdrawal') {
    return (
      <div className="w-8 h-8 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center">
        <ArrowUpRight size={14} className="text-rose-400" />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
      <ArrowDownLeft size={14} className="text-emerald-400" />
    </div>
  );
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  isLoading,
  page,
  setPage,
}) => {
  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center bg-white/5 rounded-3xl border border-white/10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  const data = transactions?.data ?? [];
  const totalPages = transactions?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white/5 text-blue-300/40">
              <tr>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">
                  Type
                </th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">
                  Description
                </th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">
                  Amount
                </th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">
                  Status
                </th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">
                  Date
                </th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-right">
                  Explorer
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map((tx) => (
                <tr
                  key={tx.id}
                  className="hover:bg-white/5 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <TypeIcon type={tx.type} />
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getTypeBadge(tx.type)}`}
                      >
                        {tx.type}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-[200px]">
                    <span className="text-white truncate block">
                      {tx.description}
                    </span>
                    {tx.id && (
                      <span className="text-[10px] text-blue-300/40 font-mono truncate block">
                        {tx.id}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`font-bold ${tx.type === 'payment' || tx.type === 'withdrawal' ? 'text-rose-400' : 'text-emerald-400'}`}
                    >
                      {tx.type === 'payment' || tx.type === 'withdrawal'
                        ? '-'
                        : '+'}
                      {tx.amount.toLocaleString()} {tx.currency}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(tx.status)}`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-blue-200/60">
                    {format(new Date(tx.createdAt), 'MMM d, yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {tx.blockchainTxHash ? (
                      <a
                        href={`${STELLAR_EXPLORER_BASE}/${tx.blockchainTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 inline-flex text-blue-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                        title="View on Stellar Explorer"
                      >
                        <ExternalLink size={16} />
                      </a>
                    ) : (
                      <span className="p-2 inline-flex text-blue-300/20">
                        <ExternalLink size={16} />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-blue-200/40"
                  >
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between px-2">
        <p className="text-xs text-blue-300/40">
          Page <span className="text-white font-bold">{page}</span> of{' '}
          <span className="text-white font-bold">{totalPages}</span>
          {transactions?.total !== undefined && (
            <span>
              {' '}
              -{' '}
              <span className="text-white font-bold">
                {transactions.total}
              </span>{' '}
              total
            </span>
          )}
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="p-2 text-blue-400 hover:text-white hover:bg-white/5 border border-white/10 rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="p-2 text-blue-400 hover:text-white hover:bg-white/5 border border-white/10 rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
