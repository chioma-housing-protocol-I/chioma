'use client';

import React from 'react';
import { DollarSign } from 'lucide-react';

export interface PayoutTransaction {
  id: string | number;
  title: string;
  time: string;
  amount: string;
  currency: string;
  isPositive: boolean;
}

interface RecentPayoutsProps {
  payouts?: PayoutTransaction[];
}

const defaultPayouts: PayoutTransaction[] = [
  {
    id: 1,
    title: 'Commission - Highland Apt',
    time: '2 mins ago',
    amount: '+$1,200',
    currency: 'USDC',
    isPositive: true,
  },
  {
    id: 2,
    title: 'Listing Fee - Sunset Villa',
    time: '1 day ago',
    amount: '-$50.00',
    currency: 'USDC',
    isPositive: false,
  },
  {
    id: 3,
    title: 'Commission - Lake House',
    time: '3 days ago',
    amount: '+$850',
    currency: 'USDC',
    isPositive: true,
  },
];

const RecentPayouts = ({ payouts = defaultPayouts }: RecentPayoutsProps) => {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/10">
      <h3 className="text-[10px] font-bold text-blue-300/40 uppercase tracking-widest mb-6">
        Recent Payouts
      </h3>

      <div className="space-y-4">
        {payouts.map((payout) => (
          <div key={payout.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5 transition-transform group-hover:scale-110 ${payout.isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}
              >
                {payout.isPositive ? (
                  <DollarSign size={18} />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center">
                    <div className="w-full h-0.5 bg-current outline-none"></div>
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white transition-colors group-hover:text-blue-400 leading-tight">
                  {payout.title}
                </p>
                <p className="text-[10px] font-bold text-blue-300/40 uppercase tracking-widest mt-1">
                  {payout.time}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div
                className={`text-sm font-bold tracking-tight ${payout.isPositive ? 'text-emerald-400' : 'text-red-400'}`}
              >
                {payout.amount}
              </div>
              <div
                className={`text-[10px] font-bold uppercase tracking-widest ${payout.isPositive ? 'text-emerald-400' : 'text-red-400'}`}
              >
                {payout.currency}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentPayouts;
