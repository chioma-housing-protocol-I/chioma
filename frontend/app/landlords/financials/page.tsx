'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RevenueDataPoint {
  month: string;
  revenue: number;
}

interface Transaction {
  hash: string;
  date: string;
  type: string;
  property: string;
  amount: number;
  status: string;
  inflow: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const revenueData: RevenueDataPoint[] = [
  { month: 'Jul', revenue: 3200000 },
  { month: 'Aug', revenue: 3800000 },
  { month: 'Sep', revenue: 3500000 },
  { month: 'Oct', revenue: 4100000 },
  { month: 'Nov', revenue: 3900000 },
  { month: 'Dec', revenue: 5200000 },
  { month: 'Jan', revenue: 4600000 },
  { month: 'Feb', revenue: 4800000 },
  { month: 'Mar', revenue: 5100000 },
  { month: 'Apr', revenue: 5500000 },
  { month: 'May', revenue: 6200000 },
  { month: 'Jun', revenue: 7100000 },
];

const transactions: Transaction[] = [
  {
    hash: 'GABC3F9K…7X1A',
    date: 'Jun 15, 2025',
    type: 'Rent Collected',
    property: '101 Adeola Odeku St',
    amount: 2500000,
    status: 'Confirmed',
    inflow: true,
  },
  {
    hash: 'GDFE2L8M…3Q9Z',
    date: 'Jun 12, 2025',
    type: 'Rent Collected',
    property: 'Block 4, Admiralty Way',
    amount: 3800000,
    status: 'Confirmed',
    inflow: true,
  },
  {
    hash: 'GHJK9P1N…4W2B',
    date: 'Jun 10, 2025',
    type: 'Platform Fee',
    property: 'Platform',
    amount: 38000,
    status: 'Deducted',
    inflow: false,
  },
  {
    hash: 'GLMN5R7T…8C4D',
    date: 'Jun 05, 2025',
    type: 'Deposit Refund',
    property: 'Glover Road, Ikoyi',
    amount: 500000,
    status: 'Processed',
    inflow: false,
  },
  {
    hash: 'GPQR2S6V…1E5F',
    date: 'May 30, 2025',
    type: 'Rent Collected',
    property: 'Glover Road, Ikoyi',
    amount: 1800000,
    status: 'Confirmed',
    inflow: true,
  },
  {
    hash: 'GSTU8X3Y…6G7H',
    date: 'May 22, 2025',
    type: 'Smart Contract Payout',
    property: '101 Adeola Odeku St',
    amount: 2500000,
    status: 'Confirmed',
    inflow: true,
  },
  {
    hash: 'GUVW4Z0A…9I2J',
    date: 'May 15, 2025',
    type: 'Platform Fee',
    property: 'Platform',
    amount: 25000,
    status: 'Deducted',
    inflow: false,
  },
  {
    hash: 'GXYZ1B5C…2K3L',
    date: 'May 10, 2025',
    type: 'Rent Collected',
    property: 'Block 4, Admiralty Way',
    amount: 3800000,
    status: 'Confirmed',
    inflow: true,
  },
  {
    hash: 'GABD6E9F…4M5N',
    date: 'Apr 28, 2025',
    type: 'Security Deposit',
    property: '101 Adeola Odeku St',
    amount: 2500000,
    status: 'Held',
    inflow: true,
  },
  {
    hash: 'GCDF2G7H…6O8P',
    date: 'Apr 15, 2025',
    type: 'Rent Collected',
    property: 'Glover Road, Ikoyi',
    amount: 1800000,
    status: 'Confirmed',
    inflow: true,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number): string =>
  n >= 1_000_000
    ? `₦${(n / 1_000_000).toFixed(1)}M`
    : `₦${(n / 1_000).toFixed(0)}K`;

const fmtFull = (n: number): string => `₦${n.toLocaleString()}`;

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-4 shadow-2xl">
      <p className="text-[10px] font-bold text-blue-300/40 uppercase tracking-widest mb-1.5">
        {label}
      </p>
      <p className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
        {fmt(payload[0].value)}
      </p>
      <p className="text-[10px] font-bold text-blue-200/40 mt-1 uppercase tracking-widest">
        Monthly Revenue
      </p>
    </div>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

const statusStyles: Record<string, string> = {
  Confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Processed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Deducted: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  Held: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${statusStyles[status] ?? 'bg-white/5 text-blue-200/40 border-white/5'}`}
  >
    {status}
  </span>
);

// ─── Metric Card ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  title: string;
  value: string;
  sub: string;
  borderColor: string;
  iconBg: string;
  icon: string;
}

const MetricCard = ({ title, value, sub, iconBg, icon }: MetricCardProps) => (
  <div
    className={`bg-white/5 backdrop-blur-sm rounded-3xl p-6 shadow-xl flex-1 min-w-[240px] border border-white/10 overflow-hidden group relative`}
  >
    {/* Decorative Orb */}
    <div
      className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity ${iconBg}`}
    />

    <div className="flex items-center gap-4 mb-5 relative z-10">
      <div
        className={`${iconBg} bg-opacity-20 rounded-2xl w-12 h-12 flex items-center justify-center text-xl shadow-inner border border-white/5`}
      >
        {icon}
      </div>
      <p className="text-[10px] font-bold text-blue-300/40 uppercase tracking-widest">
        {title}
      </p>
    </div>
    <p className="text-3xl font-bold text-white leading-none relative z-10">
      {value}
    </p>
    {sub && (
      <p className="text-xs text-blue-200/40 font-medium mt-3 relative z-10 italic">
        {sub}
      </p>
    )}
  </div>
);

const TX_TYPES = [
  'All',
  'Rent Collected',
  'Platform Fee',
  'Deposit Refund',
  'Smart Contract Payout',
  'Security Deposit',
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FinancialsPage() {
  const [filter, setFilter] = useState('All');

  const filtered =
    filter === 'All'
      ? transactions
      : transactions.filter((t) => t.type === filter);

  const totalRevenue =
    transactions.filter((t) => t.inflow).reduce((s, t) => s + t.amount, 0) +
    37900000;
  const feesRemitted =
    transactions
      .filter((t) => t.type === 'Platform Fee')
      .reduce((s, t) => s + t.amount, 0) + 450000;
  const pendingPayout = 3800000;

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">
            Financials &amp; Revenue
          </h1>
          <p className="text-sm text-blue-200/60 font-medium mt-1">
            Powered by Stellar blockchain · Real-time settlement
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-3 shadow-xl">
            <span className="text-xl">⭐</span>
            <div>
              <p className="text-[10px] text-blue-300/40 font-bold tracking-widest uppercase">
                Stellar Wallet
              </p>
              <p className="text-sm font-bold text-white">45,200 XLM</p>
            </div>
          </div>
          <button className="bg-blue-600/50 border border-blue-500/30 text-white rounded-2xl px-6 py-3 text-xs font-bold hover:bg-blue-600 hover:border-blue-400 transition-all shadow-xl uppercase tracking-widest">
            ↓ Export Report
          </button>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="flex gap-4 flex-wrap">
        <MetricCard
          title="Total Revenue (YTD)"
          value={fmt(totalRevenue)}
          sub="+12% vs last month"
          borderColor="border-blue-900"
          iconBg="bg-blue-50"
          icon="📈"
        />
        <MetricCard
          title="Pending Payouts"
          value={fmt(pendingPayout)}
          sub="Block 4, Admiralty Way (Vacant)"
          borderColor="border-orange-500"
          iconBg="bg-orange-50"
          icon="⏳"
        />
        <MetricCard
          title="Platform Fees Remitted"
          value={fmt(feesRemitted)}
          sub="YTD · Settled via Stellar"
          borderColor="border-emerald-500"
          iconBg="bg-emerald-50"
          icon="🔁"
        />
      </div>

      {/* ── Area Chart ── */}
      <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/10">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Revenue Analytics
            </h2>
            <p className="text-xs text-blue-200/40 font-medium mt-1">
              Monthly revenue over last 12 months
            </p>
          </div>
          <div className="flex gap-2">
            {['6M', '12M', 'YTD'].map((opt) => (
              <button
                key={opt}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${opt === '12M' ? 'bg-blue-600/20 text-blue-400 border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.1)]' : 'bg-white/5 text-blue-200/40 border-white/5 hover:border-white/10 hover:bg-white/10'}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            data={revenueData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: 'rgba(147, 197, 253, 0.4)',
                fontSize: 10,
                fontWeight: 700,
              }}
              dy={15}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{
                fill: 'rgba(147, 197, 253, 0.4)',
                fontSize: 10,
                fontWeight: 700,
              }}
              tickFormatter={(v: number) => fmt(v)}
              width={50}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: 'rgba(59, 130, 246, 0.2)', strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#60a5fa"
              strokeWidth={3}
              fill="url(#revenueGrad)"
              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#1e293b' }}
              activeDot={{ r: 6, fill: '#60a5fa', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Transaction Ledger ── */}
      <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-4 px-6 py-6 border-b border-white/5">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Transaction Ledger
            </h2>
            <p className="text-xs text-blue-200/40 font-medium mt-1">
              Blockchain-verified · Soroban RPC
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {TX_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all whitespace-nowrap ${filter === t ? 'bg-blue-600/20 text-blue-400 border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.1)]' : 'bg-white/5 text-blue-200/40 border-white/5 hover:border-white/10 hover:bg-white/10'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-6 px-6 py-4 bg-white/5 border-b border-white/5">
          {['TX HASH', 'DATE', 'PROPERTY', 'TYPE', 'AMOUNT', 'STATUS'].map(
            (col) => (
              <span
                key={col}
                className="text-[10px] font-bold text-blue-300/40 tracking-widest uppercase"
              >
                {col}
              </span>
            ),
          )}
        </div>

        <div className="divide-y divide-white/5">
          {filtered.map((tx, i) => (
            <div
              key={i}
              className={`grid grid-cols-6 px-6 py-5 items-center hover:bg-white/5 transition-all group`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full shadow-[0_0_8px] flex-shrink-0 ${tx.inflow ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-rose-500 shadow-rose-500/50'}`}
                />
                <span className="font-mono text-[10px] font-bold text-blue-400 bg-blue-600/10 border border-blue-500/20 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                  {tx.hash}
                </span>
              </div>
              <span className="text-sm text-blue-200/60 font-medium">
                {tx.date}
              </span>
              <span className="text-sm text-white font-bold truncate pr-4 group-hover:text-blue-400 transition-colors">
                {tx.property}
              </span>
              <span className="text-sm text-blue-200/40 font-medium">
                {tx.type}
              </span>
              <span
                className={`text-sm font-bold ${tx.inflow ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gradient-to-r from-rose-400 to-orange-400'} bg-clip-text text-transparent`}
              >
                {tx.inflow ? '+' : '−'} {fmtFull(tx.amount)}
              </span>
              <div className="flex justify-start">
                <StatusBadge status={tx.status} />
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-blue-300/40 font-bold uppercase tracking-widest text-sm">
              No transactions found
            </p>
          </div>
        )}

        <div className="flex items-center justify-between px-6 py-5 border-t border-white/5 bg-white/5 flex-wrap gap-4">
          <span className="text-[10px] font-bold text-blue-300/40 uppercase tracking-widest">
            Showing <span className="text-white">{filtered.length}</span> of{' '}
            <span className="text-white">{transactions.length}</span>{' '}
            transactions
          </span>
          <button className="flex items-center gap-2 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest border border-blue-500/30 bg-blue-600/20 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-lg">
            View All on Stellar Explorer →
          </button>
        </div>
      </div>
    </div>
  );
}
