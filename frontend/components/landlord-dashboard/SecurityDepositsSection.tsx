'use client';

import React from 'react';
import { Shield, Wallet } from 'lucide-react';
import type { Transaction } from '@/lib/transactions-data';
import { format } from 'date-fns';

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
  if (activeDeposits.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-100 bg-emerald-50/50 flex items-center gap-2">
        <Shield className="text-emerald-600" size={20} />
        <h2 className="text-lg font-semibold text-neutral-900">
          Active Security Deposits
        </h2>
      </div>
      <div className="divide-y divide-neutral-100">
        {activeDeposits.map((d) => {
          const amountDisplay =
            d.amountUsd != null && d.currency !== 'USD'
              ? `$${d.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${d.amount} ${d.currency})`
              : `${d.currency} ${d.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
          return (
            <div
              key={d.id}
              className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-neutral-50/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Wallet size={20} />
                </div>
                <div>
                  <p className="font-medium text-neutral-900">
                    {d.propertyName}
                  </p>
                  <p className="text-sm text-neutral-500">
                    Received {format(new Date(d.date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-neutral-900">
                  {amountDisplay}
                </p>
                <p className="text-xs text-neutral-500">Held in escrow</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
