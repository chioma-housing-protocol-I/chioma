'use client';

import { DollarSign, TrendingUp, Calendar, ArrowUpRight } from 'lucide-react';
import dynamic from 'next/dynamic';

const BarChartWrapper = dynamic(() => import('@/components/charts/BarChartWrapper'), {
  loading: () => <div className="h-full w-full bg-white/5 animate-pulse rounded-2xl" />,
  ssr: false,
});

const mockMonthly = [
  { month: 'Jan', earnings: 1200 },
  { month: 'Feb', earnings: 1800 },
  { month: 'Mar', earnings: 1500 },
  { month: 'Apr', earnings: 2200 },
  { month: 'May', earnings: 1900 },
  { month: 'Jun', earnings: 2600 },
];

export default function HostEarningsPage() {
  const total = mockMonthly.reduce((s, m) => s + m.earnings, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Earnings</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Total Earned',
            value: `${total.toLocaleString()}`,
            icon: DollarSign,
            color: 'from-emerald-500 to-teal-600',
          },
          {
            label: 'This Month',
            value: `${mockMonthly[mockMonthly.length - 1].earnings.toLocaleString()}`,
            icon: Calendar,
            color: 'from-blue-500 to-indigo-600',
          },
          {
            label: 'Growth',
            value: '+18%',
            icon: TrendingUp,
            color: 'from-purple-500 to-pink-600',
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-5"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center mb-3`}
              >
                <Icon size={20} className="text-white" />
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-sm text-blue-300/60 mt-1">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-6">Monthly Earnings</h2>
        <div className="h-[240px]">
          <BarChartWrapper
            data={mockMonthly}
            dataKeyX="month"
            dataKeyY="earnings"
            fillColor="#6366f1"
            name="Earnings"
          />
        </div>
      </div>

      <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Payouts</h2>
          <button className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors">
            View all <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="space-y-3">
          {mockMonthly
            .slice()
            .reverse()
            .slice(0, 4)
            .map((m) => (
              <div
                key={m.month}
                className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
              >
                <div>
                  <p className="font-medium">{m.month} 2025 payout</p>
                  <p className="text-sm text-blue-300/60">
                    Transferred to bank
                  </p>
                </div>
                <span className="text-emerald-400 font-semibold">
                  +${m.earnings.toLocaleString()}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
