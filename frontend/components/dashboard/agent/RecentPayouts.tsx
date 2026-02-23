'use client';

import React from 'react';
import { DollarSign } from 'lucide-react';

const RecentPayouts = () => {
  const payouts = [
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

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
      <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">
        Recent Payouts
      </h3>

      <div className="space-y-4">
        {payouts.map((payout) => (
          <div key={payout.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${payout.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}
              >
                {payout.isPositive ? (
                  <DollarSign size={18} />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center">
                    <div className="w-full h-0.5 bg-current"></div>
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-neutral-900 leading-tight">
                  {payout.title}
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">{payout.time}</p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div
                className={`text-sm font-bold ${payout.isPositive ? 'text-emerald-600' : 'text-red-500'}`}
              >
                {payout.amount}
              </div>
              <div
                className={`text-[10px] font-bold ${payout.isPositive ? 'text-emerald-600' : 'text-red-500'}`}
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
