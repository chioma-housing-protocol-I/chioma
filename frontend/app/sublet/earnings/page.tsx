'use client';

import { useQuery } from '@tanstack/react-query';
import { DollarSign, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function SubletEarningsPage() {
  const { data: earnings, isLoading } = useQuery({
    queryKey: ['sublet-earnings'],
    queryFn: async () => {
      const res = await fetch('/api/subletting/earnings');
      if (!res.ok) return { totalEarnings: 0 };
      return await res.json();
    },
  });

  const formattedEarnings = earnings?.totalEarnings
    ? `$${Number(earnings.totalEarnings).toFixed(2)}`
    : '$0.00';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/sublet"
          className="inline-flex items-center gap-2 text-blue-300/60 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={18} /> Back
        </Link>
        <h1 className="text-3xl font-bold mb-8">Sublet Earnings</h1>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <DollarSign size={26} className="text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{formattedEarnings}</p>
                  <p className="text-blue-300/60">Total sublet earnings</p>
                </div>
              </div>
            </div>

            <div className="text-center py-12 text-blue-300/60">
              <p>
                {earnings?.totalEarnings ? (
                  'Great earnings! Keep subletting to increase your income.'
                ) : (
                  <>
                    No earnings yet. Approve a sublet to start earning.
                    <br />
                    <Link
                      href="/sublet/request"
                      className="text-blue-400 hover:underline mt-2 inline-block"
                    >
                      Request subletting →
                    </Link>
                  </>
                )}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
