'use client';

import dynamic from 'next/dynamic';
import type { SubletEarningsSummary } from '@/lib/query/hooks/use-sublets';

const BarChartWrapper = dynamic(
  () => import('@/components/charts/BarChartWrapper'),
  {
    ssr: false,
  },
);

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

export interface SubletEarningsChartProps {
  earnings: SubletEarningsSummary;
}

/**
 * Visualizes sublet earnings (#1553) rendered from real data via
 * `useSubletEarnings` — the backend's `/subletting/earnings` endpoint has no
 * time series, so this breaks the aggregate total down into pending vs.
 * paid rather than plotting a fabricated trend.
 */
export function SubletEarningsChart({ earnings }: SubletEarningsChartProps) {
  const data = [
    { label: 'Pending', amount: earnings.pendingEarnings },
    { label: 'Paid', amount: earnings.paidEarnings },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <p className="text-xs uppercase tracking-widest text-blue-200/50 mb-2">
            Total earnings
          </p>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(earnings.totalEarnings)}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <p className="text-xs uppercase tracking-widest text-blue-200/50 mb-2">
            Pending
          </p>
          <p className="text-3xl font-bold text-amber-400">
            {formatCurrency(earnings.pendingEarnings)}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <p className="text-xs uppercase tracking-widest text-blue-200/50 mb-2">
            Paid out
          </p>
          <p className="text-3xl font-bold text-emerald-400">
            {formatCurrency(earnings.paidEarnings)}
          </p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-64">
        <BarChartWrapper
          data={data}
          dataKeyX="label"
          dataKeyY="amount"
          fillColor="#38bdf8"
          name="Earnings"
        />
      </div>
    </div>
  );
}

export default SubletEarningsChart;
