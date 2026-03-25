'use client';

import React from 'react';
import {
  ExternalLink,
  Receipt,
  Wallet,
  RotateCcw,
  CreditCard,
  Shield,
} from 'lucide-react';
import {
  type Transaction,
  getStellarExplorerUrl,
} from '@/lib/transactions-data';
import { format } from 'date-fns';

const TYPE_CONFIG: Record<
  Transaction['type'],
  { label: string; icon: React.ElementType; bg: string; text: string }
> = {
  Rent: {
    label: 'Rent',
    icon: Receipt,
    bg: 'bg-blue-500/10 border-blue-500/20',
    text: 'text-blue-400',
  },
  Deposit: {
    label: 'Deposit',
    icon: Wallet,
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    text: 'text-emerald-400',
  },
  Refund: {
    label: 'Refund',
    icon: RotateCcw,
    bg: 'bg-indigo-500/10 border-indigo-500/20',
    text: 'text-indigo-400',
  },
  'Service Fee': {
    label: 'Service Fee',
    icon: CreditCard,
    bg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-400',
  },
};

const STATUS_CONFIG: Record<
  Transaction['status'],
  { label: string; bg: string; text: string }
> = {
  Pending: {
    label: 'Pending',
    bg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-400',
  },
  Completed: {
    label: 'Completed',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    text: 'text-emerald-400',
  },
  Failed: {
    label: 'Failed',
    bg: 'bg-rose-500/10 border-rose-500/20',
    text: 'text-rose-400',
  },
};

function formatAmount(t: Transaction): string {
  const main = `${t.currency} ${Math.abs(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  if (t.amountUsd != null && t.currency !== 'USD') {
    return `${main} (≈ $${t.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })})`;
  }
  return main;
}

interface TransactionsTableProps {
  transactions: Transaction[];
  showProperty?: boolean;
}

export default function TransactionsTable({
  transactions,
  showProperty = true,
}: TransactionsTableProps) {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl shadow-xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-white/5 border-b border-white/5 text-left text-blue-300/40">
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">
                Date & time
              </th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">
                Type
              </th>
              {showProperty && (
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">
                  Property
                </th>
              )}
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">
                Amount
              </th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">
                Status
              </th>
              <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest leading-none">
                Ledger
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {transactions.map((tx) => {
              const typeCfg = TYPE_CONFIG[tx.type];
              const statusCfg = STATUS_CONFIG[tx.status];
              const TypeIcon = typeCfg.icon;
              return (
                <tr
                  key={tx.id}
                  className={`hover:bg-white/5 transition-colors group ${
                    tx.isSecurityDeposit ? 'bg-emerald-500/5' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="font-bold text-white uppercase tracking-tight">
                      {format(new Date(tx.date), 'MMM d, yyyy')}
                    </div>
                    <div className="text-xs text-blue-300/40 font-bold uppercase tracking-widest mt-1">
                      {format(new Date(tx.date), 'HH:mm')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm ${typeCfg.bg} ${typeCfg.text}`}
                    >
                      <TypeIcon size={12} strokeWidth={2.5} />
                      {typeCfg.label}
                      {tx.isSecurityDeposit && (
                        <Shield
                          size={12}
                          className="opacity-80"
                          strokeWidth={2.5}
                        />
                      )}
                    </span>
                  </td>
                  {showProperty && (
                    <td className="px-6 py-4 text-xs font-bold text-blue-200/60 uppercase tracking-widest">
                      {tx.propertyName}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <span
                      className={
                        tx.type === 'Refund'
                          ? 'text-emerald-400 font-bold'
                          : 'font-bold text-white'
                      }
                    >
                      {tx.type === 'Refund' ? '+' : ''}
                      {formatAmount(tx)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm ${statusCfg.bg} ${statusCfg.text}`}
                    >
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {tx.txHash ? (
                      <a
                        href={getStellarExplorerUrl(tx.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-all uppercase tracking-widest group/link"
                      >
                        <span className="group-hover/link:underline decoration-blue-500/30 underline-offset-4">
                          Explorer
                        </span>
                        <ExternalLink size={14} className="opacity-60" />
                      </a>
                    ) : (
                      <span className="text-xs text-blue-300/20 font-bold uppercase tracking-widest">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
