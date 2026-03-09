'use client';

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Download,
  FileText,
  DollarSign,
  Eye,
  MessageSquare,
  FileCheck,
  Calendar,
  ChevronDown,
} from 'lucide-react';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const monthlyEarnings = [
  { month: 'Jan', commission: 2800, target: 3000 },
  { month: 'Feb', commission: 3200, target: 3000 },
  { month: 'Mar', commission: 2600, target: 3000 },
  { month: 'Apr', commission: 4100, target: 3500 },
  { month: 'May', commission: 3750, target: 3500 },
  { month: 'Jun', commission: 5200, target: 4000 },
  { month: 'Jul', commission: 4800, target: 4000 },
  { month: 'Aug', commission: 6100, target: 4500 },
  { month: 'Sep', commission: 5500, target: 4500 },
  { month: 'Oct', commission: 7200, target: 5000 },
  { month: 'Nov', commission: 6800, target: 5000 },
  { month: 'Dec', commission: 8400, target: 5500 },
];

const conversionData = [
  { name: 'Profile Views', value: 1240, fill: '#3b82f6' },
  { name: 'Inquiries', value: 430, fill: '#8b5cf6' },
  { name: 'Site Visits', value: 182, fill: '#f59e0b' },
  { name: 'Closed Contracts', value: 34, fill: '#10b981' },
];

const listingPerformance = [
  { name: '12 Palm Ave', views: 320, inquiries: 45, contracts: 3 },
  { name: '7 Sunset Blvd', views: 210, inquiries: 30, contracts: 2 },
  { name: '88 Maple St', views: 180, inquiries: 22, contracts: 1 },
  { name: '3 River Rd', views: 150, inquiries: 18, contracts: 2 },
  { name: '55 Oak Lane', views: 130, inquiries: 12, contracts: 1 },
];

const kpiSummary = [
  {
    label: 'Total Commissions',
    value: '$56,450',
    change: '+18.4%',
    positive: true,
    icon: DollarSign,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    label: 'Profile Views',
    value: '1,240',
    change: '+9.2%',
    positive: true,
    icon: Eye,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    label: 'Inquiries',
    value: '430',
    change: '-3.1%',
    positive: false,
    icon: MessageSquare,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
  {
    label: 'Closed Contracts',
    value: '34',
    change: '+21.4%',
    positive: true,
    icon: FileCheck,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomEarningsTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-neutral-100 rounded-xl shadow-xl p-4 min-w-[160px]">
        <p className="text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
          {label}
        </p>
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="text-xs text-neutral-500 capitalize">
              {entry.name === 'commission' ? 'Earned' : 'Target'}
            </span>
            <span
              className={`text-sm font-bold ${entry.name === 'commission' ? 'text-blue-600' : 'text-neutral-400'}`}
            >
              ${entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Export Modal ─────────────────────────────────────────────────────────────

const ExportModal = ({
  onClose,
  onExport,
}: {
  onClose: () => void;
  onExport: (format: string, period: string) => void;
}) => {
  const [format, setFormat] = useState('csv');
  const [period, setPeriod] = useState('this-year');

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              Export Report
            </h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Download your analytics data
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              File Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['csv', 'pdf', 'xlsx'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                    format === f
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Time Period
            </label>
            <div className="relative">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full appearance-none bg-white border border-neutral-200 rounded-lg px-4 py-2.5 text-sm text-neutral-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all pr-10"
              >
                <option value="this-month">This Month</option>
                <option value="last-quarter">Last Quarter</option>
                <option value="this-year">This Year (2024)</option>
                <option value="last-year">Last Year (2023)</option>
                <option value="all-time">All Time</option>
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
              />
            </div>
          </div>

          <div className="bg-neutral-50 rounded-xl p-4 text-sm text-neutral-500 border border-neutral-100">
            <p className="font-medium text-neutral-700 mb-1">
              Report will include:
            </p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Monthly commission earnings</li>
              <li>Conversion funnel breakdown</li>
              <li>Per-listing performance stats</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-neutral-200 rounded-lg text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onExport(format, period)}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Download size={16} />
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgentAnalyticsPage() {
  const [yearFilter, setYearFilter] = useState('2024');
  const [showExportModal, setShowExportModal] = useState(false);

  const handleExport = (format: string, period: string) => {
    // In production this would call an API endpoint
    const filename = `chioma-analytics-${period}.${format}`;
    const csvContent =
      'Month,Commission,Target\n' +
      monthlyEarnings
        .map((r) => `${r.month},${r.commission},${r.target}`)
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const totalCommission = monthlyEarnings.reduce(
    (sum, m) => sum + m.commission,
    0,
  );
  const conversionRate = (
    (conversionData[3].value / conversionData[0].value) *
    100
  ).toFixed(1);

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Analytics</h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              Track your performance and commission earnings
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Year Filter */}
            <div className="relative">
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="appearance-none bg-white border border-neutral-200 rounded-lg pl-4 pr-9 py-2.5 text-sm font-medium text-neutral-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer"
              >
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
              </select>
              <Calendar
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
              />
            </div>

            {/* Export Button */}
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:shadow-sm"
            >
              <Download size={16} />
              Export Report
            </button>
          </div>
        </div>

        {/* ── KPI Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {kpiSummary.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div
                key={i}
                className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      {kpi.label}
                    </p>
                    <p className="text-2xl font-bold text-neutral-900 mt-1.5">
                      {kpi.value}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${kpi.iconBg}`}>
                    <Icon size={18} className={kpi.iconColor} />
                  </div>
                </div>
                <div
                  className={`flex items-center gap-1 mt-3 text-sm font-semibold ${kpi.positive ? 'text-emerald-600' : 'text-red-500'}`}
                >
                  {kpi.positive ? (
                    <TrendingUp size={14} />
                  ) : (
                    <TrendingDown size={14} />
                  )}
                  <span>{kpi.change} vs last year</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Commission Earnings Chart ── */}
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                Monthly Commission Earnings
              </h2>
              <p className="text-sm text-neutral-500 mt-0.5">
                Total for {yearFilter}:{' '}
                <span className="font-semibold text-neutral-700">
                  ${totalCommission.toLocaleString()}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-5 text-xs font-medium text-neutral-500">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                Earned
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-neutral-200 inline-block" />
                Target
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={monthlyEarnings}
              margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomEarningsTooltip />} />
              <Line
                type="monotone"
                dataKey="target"
                stroke="#e2e8f0"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="commission"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ── Conversion Funnel + Listing Performance ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conversion Funnel */}
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
            <div className="mb-5">
              <h2 className="text-base font-bold text-neutral-900">
                Conversion Funnel
              </h2>
              <p className="text-sm text-neutral-500 mt-0.5">
                Overall conversion rate:{' '}
                <span className="font-semibold text-emerald-600">
                  {conversionRate}%
                </span>
              </p>
            </div>

            <div className="space-y-3">
              {conversionData.map((item, i) => {
                const pct = Math.round(
                  (item.value / conversionData[0].value) * 100,
                );
                const prevValue =
                  i > 0 ? conversionData[i - 1].value : item.value;
                const dropOff =
                  i > 0
                    ? Math.round(((prevValue - item.value) / prevValue) * 100)
                    : null;

                return (
                  <div key={item.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-neutral-700">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-3">
                        {dropOff !== null && (
                          <span className="text-xs text-red-400 font-medium">
                            −{dropOff}%
                          </span>
                        )}
                        <span className="text-sm font-bold text-neutral-900 tabular-nums w-12 text-right">
                          {item.value.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: item.fill,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Listing Performance */}
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
            <div className="mb-5">
              <h2 className="text-base font-bold text-neutral-900">
                Listing Performance
              </h2>
              <p className="text-sm text-neutral-500 mt-0.5">
                Views, inquiries and contracts per listing
              </p>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={listingPerformance}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                barSize={10}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #f1f5f9',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                />
                <Bar dataKey="views" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="inquiries" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="contracts" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Export CTA Banner ── */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <FileText size={22} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-base">
                Need your earnings for tax season?
              </p>
              <p className="text-blue-100 text-sm mt-0.5">
                Export a full report — CSV, PDF, or Excel — in one click.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowExportModal(true)}
            className="shrink-0 bg-white text-blue-700 hover:bg-blue-50 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-lg"
          >
            <Download size={16} />
            Export Now
          </button>
        </div>
      </div>

      {/* ── Export Modal ── */}
      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
        />
      )}
    </>
  );
}
