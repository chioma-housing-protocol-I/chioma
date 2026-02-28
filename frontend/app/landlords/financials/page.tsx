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
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-lg">
      <p className="text-sm font-bold text-blue-900 mb-1">{label}</p>
      <p className="text-base font-bold text-emerald-500">
        {fmt(payload[0].value)}
      </p>
      <p className="text-xs text-slate-400 mt-0.5">Revenue</p>
    </div>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

const statusStyles: Record<string, string> = {
  Confirmed: 'bg-emerald-100 text-emerald-800',
  Processed: 'bg-blue-100 text-blue-800',
  Deducted: 'bg-red-100 text-red-800',
  Held: 'bg-amber-100 text-amber-800',
};

const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${statusStyles[status] ?? 'bg-slate-100 text-slate-600'}`}
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

const MetricCard = ({
  title,
  value,
  sub,
  borderColor,
  iconBg,
  icon,
}: MetricCardProps) => (
  <div
    className={`bg-white rounded-2xl p-6 shadow-sm flex-1 min-w-[200px] border-t-4 ${borderColor}`}
  >
    <div className="flex items-center gap-3 mb-4">
      <div
        className={`${iconBg} rounded-xl w-10 h-10 flex items-center justify-center text-lg`}
      >
        {icon}
      </div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {title}
      </p>
    </div>
    <p className="text-3xl font-extrabold text-slate-900 leading-none">
      {value}
    </p>
    {sub && <p className="text-xs text-slate-400 mt-2">{sub}</p>}
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
          <h1 className="text-2xl font-extrabold text-blue-900">
            Financials &amp; Revenue
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Powered by Stellar blockchain · Real-time settlement
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-base">⭐</span>
            <div>
              <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
                Stellar Wallet
              </p>
              <p className="text-sm font-extrabold text-blue-900">45,200 XLM</p>
            </div>
          </div>
          <button className="bg-blue-900 text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-blue-800 transition-colors">
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
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Revenue Analytics
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Monthly revenue over last 12 months
            </p>
          </div>
          <div className="flex gap-2">
            {['6M', '12M', 'YTD'].map((opt) => (
              <button
                key={opt}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${opt === '12M' ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart
            data={revenueData}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(v: number) => fmt(v)}
              width={58}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#1e3a8a"
              strokeWidth={2.5}
              fill="url(#revenueGrad)"
              dot={false}
              activeDot={{ r: 5, fill: '#1e3a8a', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Transaction Ledger ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-3 px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Transaction Ledger
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Blockchain-verified · Soroban RPC
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {TX_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap ${filter === t ? 'bg-blue-900 text-white border-blue-900' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-6 px-6 py-3 bg-slate-50 border-b border-slate-100">
          {['TX HASH', 'DATE', 'PROPERTY', 'TYPE', 'AMOUNT', 'STATUS'].map(
            (col) => (
              <span
                key={col}
                className="text-[10px] font-bold text-slate-400 tracking-widest uppercase"
              >
                {col}
              </span>
            ),
          )}
        </div>

        {filtered.map((tx, i) => (
          <div
            key={i}
            className={`grid grid-cols-6 px-6 py-4 items-center hover:bg-slate-50 transition-colors ${i < filtered.length - 1 ? 'border-b border-slate-50' : ''}`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${tx.inflow ? 'bg-emerald-500' : 'bg-orange-400'}`}
              />
              <span className="font-mono text-xs text-blue-900 font-semibold bg-blue-50 px-2 py-0.5 rounded-md">
                {tx.hash}
              </span>
            </div>
            <span className="text-xs text-slate-500">{tx.date}</span>
            <span className="text-xs text-slate-800 font-medium truncate pr-2">
              {tx.property}
            </span>
            <span className="text-xs text-slate-500">{tx.type}</span>
            <span
              className={`text-sm font-bold ${tx.inflow ? 'text-emerald-600' : 'text-orange-500'}`}
            >
              {tx.inflow ? '+' : '−'} {fmtFull(tx.amount)}
            </span>
            <StatusBadge status={tx.status} />
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            No transactions found.
          </div>
        )}

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 flex-wrap gap-2">
          <span className="text-xs text-slate-400">
            Showing {filtered.length} of {transactions.length} transactions
          </span>
          <button className="text-xs font-semibold text-blue-900 border border-slate-200 bg-white rounded-lg px-4 py-2 hover:bg-slate-50 transition-colors">
            View All on Stellar Explorer →
          </button>
        </div>
      </div>
    </div>
  );
}
