'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { SubletEarningsChart } from '@/components/sublet/SubletEarningsChart';
import { useSubletEarnings } from '@/lib/query/hooks/use-sublets';

export default function SubletEarningsPage() {
  const { data: earnings, isLoading } = useSubletEarnings();

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
          <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-6 mb-6 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-700/50" />
              <div className="space-y-2">
                <div className="h-8 w-32 bg-slate-700/50 rounded" />
                <div className="h-4 w-40 bg-slate-700/50 rounded" />
              </div>
            </div>
          </div>
        ) : earnings ? (
          <>
            <SubletEarningsChart earnings={earnings} />

            {earnings.totalEarnings === 0 && (
              <div className="text-center py-12 text-blue-300/60">
                <p>
                  No earnings yet. Approve a sublet to start earning.
                  <br />
                  <Link
                    href="/sublet/request"
                    className="text-blue-400 hover:underline mt-2 inline-block"
                  >
                    Request subletting →
                  </Link>
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-blue-300/60">
            <p>Unable to load earnings right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}
