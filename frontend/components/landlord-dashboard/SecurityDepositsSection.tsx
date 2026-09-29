'use client';

import React from 'react';
import { Shield, Wallet } from 'lucide-react';
import type { Transaction } from '@/lib/transactions-data';
import { format } from 'date-fns';
import { useDateFnsLocale } from '@/lib/utils/date-fns-locale';
import { formatCurrency } from '@/lib/utils/format';

interface SecurityDepositsSectionProps {
  activeDeposits: Transaction[];
}

/** Derives active deposits: type Deposit, isSecurityDeposit, not yet refunded. */
export function getActiveDeposits(transactions: Transaction[]): Transaction[] {
  const refundedIds = new Set(
    transactions
      .filter((t) => t.type === 'Refund' && t.securityDepositId)
      .map((t) => t.securityDepositId!),
  );
  return transactions.filter(
    (t) =>
      t.type === 'Deposit' &&
      t.isSecurityDeposit &&
      t.status === 'Completed' &&
      !refundedIds.has(t.securityDepositId ?? ''),
  );
}

export default function SecurityDepositsSection({
  activeDeposits,
}: SecurityDepositsSectionProps) {
  const dateFnsLocale = useDateFnsLocale();

  if (activeDeposits.length === 0) {
    return null;
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl shadow-xl border border-white/10 overflow-hidden">
      <div className="px-6 py-5 border-b border-white/5 bg-white/5 flex items-center gap-3">
        <Shield className="text-emerald-400" size={20} strokeWidth={2.5} />
        <h2 className="text-lg font-bold text-white tracking-tight">
          Active Security Deposits
        </h2>
      </div>
      <div className="divide-y divide-white/5">
        {activeDeposits.map((d) => {
          const amountDisplay =
            d.amountUsd != null && d.currency !== 'USD'
              ? `${formatCurrency(d.amountUsd, 'USD')} (${d.amount} ${d.currency})`
              : formatCurrency(d.amount, d.currency);
          return (
            <div
              key={d.id}
              className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-white/5 transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-emerald-400 border border-white/5 group-hover:scale-110 transition-transform">
                  <Wallet size={22} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {d.propertyName}
                  </p>
                  <p className="text-xs text-blue-300/40 font-bold uppercase tracking-widest mt-1">
                    Received{' '}
                    {format(new Date(d.date), 'MMM d, yyyy', {
                      locale: dateFnsLocale,
                    })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-white text-lg">{amountDisplay}</p>
                <p className="text-[10px] text-blue-300/40 font-bold uppercase tracking-widest mt-0.5">
                  Held in escrow
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
