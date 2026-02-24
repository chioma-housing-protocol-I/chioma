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
    bg: 'bg-blue-100',
    text: 'text-blue-800',
  },
  Deposit: {
    label: 'Deposit',
    icon: Wallet,
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
  },
  Refund: {
    label: 'Refund',
    icon: RotateCcw,
    bg: 'bg-violet-100',
    text: 'text-violet-800',
  },
  'Service Fee': {
    label: 'Service Fee',
    icon: CreditCard,
    bg: 'bg-amber-100',
    text: 'text-amber-800',
  },
};

const STATUS_CONFIG: Record<
  Transaction['status'],
  { label: string; bg: string; text: string }
> = {
  Pending: {
    label: 'Pending',
    bg: 'bg-amber-100',
    text: 'text-amber-800',
  },
  Completed: {
    label: 'Completed',
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
  },
  Failed: {
    label: 'Failed',
    bg: 'bg-rose-100',
    text: 'text-rose-800',
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
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-neutral-50/80 border-b border-neutral-200 text-left">
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Date & time
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Type
              </th>
              {showProperty && (
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Property
                </th>
              )}
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Ledger
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {transactions.map((tx) => {
              const typeCfg = TYPE_CONFIG[tx.type];
              const statusCfg = STATUS_CONFIG[tx.status];
              const TypeIcon = typeCfg.icon;
              return (
                <tr
                  key={tx.id}
                  className={`hover:bg-neutral-50/80 transition-colors group ${
                    tx.isSecurityDeposit ? 'bg-emerald-50/50' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-neutral-900">
                      {format(new Date(tx.date), 'MMM d, yyyy')}
                    </div>
                    <div className="text-sm text-neutral-500">
                      {format(new Date(tx.date), 'HH:mm')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${typeCfg.bg} ${typeCfg.text}`}
                    >
                      <TypeIcon size={12} />
                      {typeCfg.label}
                      {tx.isSecurityDeposit && (
                        <Shield size={12} className="opacity-80" />
                      )}
                    </span>
                  </td>
                  {showProperty && (
                    <td className="px-6 py-4 text-sm text-neutral-700">
                      {tx.propertyName}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <span
                      className={
                        tx.type === 'Refund'
                          ? 'text-emerald-700 font-medium'
                          : 'font-medium text-neutral-900'
                      }
                    >
                      {tx.type === 'Refund' ? '+' : ''}
                      {formatAmount(tx)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.text}`}
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
                        className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:text-brand-blue-dark transition-colors"
                      >
                        View on Stellar.Expert
                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      <span className="text-sm text-neutral-400">—</span>
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
