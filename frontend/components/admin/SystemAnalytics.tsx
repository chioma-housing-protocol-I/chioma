'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  CalendarDays,
  Download,
  Home,
  TrendingUp,
  UserPlus,
  Wallet,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAdminUsers } from '@/lib/query/hooks/use-admin-users';
import { useProperties } from '@/lib/query/hooks/use-properties';
import { useTransactions } from '@/lib/query/hooks/use-transactions';
import type { Property, Transaction, User } from '@/types';

type DatePreset = '30d' | '90d' | '365d' | 'custom';

const PRESET_DAYS: Record<Exclude<DatePreset, 'custom'>, number> = {
  '30d': 30,
  '90d': 90,
  '365d': 365,
};

type MetricComparison = {
  current: number;
  mom: number | null;
  yoy: number | null;
};

type GrowthPoint = {
  label: string;
  users: number;
  properties: number;
  transactions: number;
};

type HealthStatus = 'healthy' | 'warning' | 'critical';

type HealthIndicator = {
  name: string;
  value: number;
  status: HealthStatus;
};

export function SystemAnalytics() {
  const [datePreset, setDatePreset] = useState<DatePreset>('90d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const { startDate, endDate } = useMemo(
    () => resolveDateRange(datePreset, customStart, customEnd),
    [datePreset, customStart, customEnd],
  );

  const usersQuery = useAdminUsers({ page: 1, limit: 1000 });
  const propertiesQuery = useProperties({ page: 1, limit: 1000 });
  const transactionsQuery = useTransactions({ page: 1, limit: 1000 });

  const allUsers = useMemo(
    () => usersQuery.data?.data ?? [],
    [usersQuery.data?.data],
  );
  const allProperties = useMemo(
    () => propertiesQuery.data?.data ?? [],
    [propertiesQuery.data?.data],
  );
  const allTransactions = useMemo(
    () => transactionsQuery.data?.data ?? [],
    [transactionsQuery.data?.data],
  );

  const isLoading =
    usersQuery.isLoading ||
    propertiesQuery.isLoading ||
    transactionsQuery.isLoading;

  const hasError =
    usersQuery.isError || propertiesQuery.isError || transactionsQuery.isError;

  const filteredUsers = useMemo(
    () =>
      filterByRange(allUsers, (entry) => entry.createdAt, startDate, endDate),
    [allUsers, startDate, endDate],
  );
  const filteredProperties = useMemo(
    () =>
      filterByRange(
        allProperties,
        (entry) => entry.createdAt,
        startDate,
        endDate,
      ),
    [allProperties, startDate, endDate],
  );
  const filteredTransactions = useMemo(
    () =>
      filterByRange(
        allTransactions,
        (entry) => entry.createdAt,
        startDate,
        endDate,
      ),
    [allTransactions, startDate, endDate],
  );

  const previousRange = useMemo(
    () => getPreviousRange(startDate, endDate),
    [startDate, endDate],
  );
  const lastYearRange = useMemo(
    () => getLastYearRange(startDate, endDate),
    [startDate, endDate],
  );

  const previousUsers = useMemo(
    () =>
      filterByRange(
        allUsers,
        (entry) => entry.createdAt,
        previousRange.start,
        previousRange.end,
      ),
    [allUsers, previousRange],
  );
  const previousProperties = useMemo(
    () =>
      filterByRange(
        allProperties,
        (entry) => entry.createdAt,
        previousRange.start,
        previousRange.end,
      ),
    [allProperties, previousRange],
  );
  const previousTransactions = useMemo(
    () =>
      filterByRange(
        allTransactions,
        (entry) => entry.createdAt,
        previousRange.start,
        previousRange.end,
      ),
    [allTransactions, previousRange],
  );

  const lastYearUsers = useMemo(
    () =>
      filterByRange(
        allUsers,
        (entry) => entry.createdAt,
        lastYearRange.start,
        lastYearRange.end,
      ),
    [allUsers, lastYearRange],
  );
  const lastYearProperties = useMemo(
    () =>
      filterByRange(
        allProperties,
        (entry) => entry.createdAt,
        lastYearRange.start,
        lastYearRange.end,
      ),
    [allProperties, lastYearRange],
  );
  const lastYearTransactions = useMemo(
    () =>
      filterByRange(
        allTransactions,
        (entry) => entry.createdAt,
        lastYearRange.start,
        lastYearRange.end,
      ),
    [allTransactions, lastYearRange],
  );

  const totalVolume = sumTransactionAmount(filteredTransactions);
  const previousVolume = sumTransactionAmount(previousTransactions);
  const lastYearVolume = sumTransactionAmount(lastYearTransactions);

  const metrics = useMemo(
    () => ({
      users: buildMetric(
        filteredUsers.length,
        previousUsers.length,
        lastYearUsers.length,
      ),
      properties: buildMetric(
        filteredProperties.length,
        previousProperties.length,
        lastYearProperties.length,
      ),
      transactions: buildMetric(
        filteredTransactions.length,
        previousTransactions.length,
        lastYearTransactions.length,
      ),
      volume: buildMetric(totalVolume, previousVolume, lastYearVolume),
    }),
    [
      filteredUsers.length,
      filteredProperties.length,
      filteredTransactions.length,
      previousUsers.length,
      previousProperties.length,
      previousTransactions.length,
      lastYearUsers.length,
      lastYearProperties.length,
      lastYearTransactions.length,
      totalVolume,
      previousVolume,
      lastYearVolume,
    ],
  );

  const growthSeries = useMemo(
    () =>
      buildGrowthSeries(
        filteredUsers,
        filteredProperties,
        filteredTransactions,
      ),
    [filteredUsers, filteredProperties, filteredTransactions],
  );

  const healthIndicators = useMemo<HealthIndicator[]>(() => {
    const successfulTx = filteredTransactions.filter(
      (tx) => tx.status === 'completed',
    ).length;
    const failedTx = filteredTransactions.filter(
      (tx) => tx.status === 'failed',
    ).length;
    const verifiedUsers = filteredUsers.filter(
      (user) => user.isVerified,
    ).length;
    const activeListings = filteredProperties.filter(
      (property) =>
        property.status === 'available' || property.status === 'rented',
    ).length;

    const successRate = percentage(successfulTx, filteredTransactions.length);
    const failureRate = percentage(failedTx, filteredTransactions.length);
    const verificationRate = percentage(verifiedUsers, filteredUsers.length);
    const activeListingRate = percentage(
      activeListings,
      filteredProperties.length,
    );

    return [
      {
        name: 'Transaction Success',
        value: successRate,
        status: rateStatus(successRate, 94, 85),
      },
      {
        name: 'Verification Coverage',
        value: verificationRate,
        status: rateStatus(verificationRate, 80, 60),
      },
      {
        name: 'Active Listing Ratio',
        value: activeListingRate,
        status: rateStatus(activeListingRate, 75, 55),
      },
      {
        name: 'Failed Transaction Ratio',
        value: failureRate,
        status: inverseRateStatus(failureRate, 6, 15),
      },
    ];
  }, [filteredProperties, filteredTransactions, filteredUsers]);

  const dateRangeLabel = `${formatDate(startDate)} - ${formatDate(endDate)}`;

  const handleExport = () => {
    const rows = [
      ['Date range', dateRangeLabel],
      [],
      ['Metric', 'Current', 'MoM %', 'YoY %'],
      [
        'Users',
        String(metrics.users.current),
        formatPercent(metrics.users.mom),
        formatPercent(metrics.users.yoy),
      ],
      [
        'Properties',
        String(metrics.properties.current),
        formatPercent(metrics.properties.mom),
        formatPercent(metrics.properties.yoy),
      ],
      [
        'Transactions',
        String(metrics.transactions.current),
        formatPercent(metrics.transactions.mom),
        formatPercent(metrics.transactions.yoy),
      ],
      [
        'Transaction Volume',
        String(metrics.volume.current),
        formatPercent(metrics.volume.mom),
        formatPercent(metrics.volume.yoy),
      ],
      [],
      ['Month', 'Users', 'Properties', 'Transactions'],
      ...growthSeries.map((point) => [
        point.label,
        String(point.users),
        String(point.properties),
        String(point.transactions),
      ]),
      [],
      ['Health Indicator', 'Value %', 'Status'],
      ...healthIndicators.map((item) => [
        item.name,
        item.value.toFixed(1),
        item.status.toUpperCase(),
      ]),
    ];

    const csv = rows.map((line) => line.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `system-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            System Analytics
          </h1>
          <p className="mt-1 text-blue-200/65">
            Track platform growth, transaction behavior, and system health
            trends.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <DateRangeSelector
            datePreset={datePreset}
            setDatePreset={setDatePreset}
            customStart={customStart}
            customEnd={customEnd}
            setCustomStart={setCustomStart}
            setCustomEnd={setCustomEnd}
          />
          <button
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <MetricCard
          title="Users Growth"
          metric={metrics.users}
          icon={<UserPlus size={20} />}
        />
        <MetricCard
          title="Property Listings"
          metric={metrics.properties}
          icon={<Home size={20} />}
        />
        <MetricCard
          title="Transaction Count"
          metric={metrics.transactions}
          icon={<Activity size={20} />}
        />
        <MetricCard
          title="Transaction Volume"
          metric={metrics.volume}
          icon={<Wallet size={20} />}
          formatValue={(value) => currency(value)}
        />
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <h2 className="text-lg font-semibold text-white">Growth Trends</h2>
          <span className="inline-flex items-center gap-1 text-xs text-blue-200/70">
            <CalendarDays size={14} />
            {dateRangeLabel}
          </span>
        </div>
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={growthSeries}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.08)"
              />
              <XAxis dataKey="label" stroke="rgba(191,219,254,0.75)" />
              <YAxis stroke="rgba(191,219,254,0.75)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15,23,42,0.95)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="users"
                stroke="#60a5fa"
                strokeWidth={2.5}
                dot={false}
                name="Users"
              />
              <Line
                type="monotone"
                dataKey="properties"
                stroke="#34d399"
                strokeWidth={2.5}
                dot={false}
                name="Properties"
              />
              <Line
                type="monotone"
                dataKey="transactions"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={false}
                name="Transactions"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Platform Health
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {healthIndicators.map((indicator) => (
            <div
              key={indicator.name}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <p className="text-sm text-blue-200/75">{indicator.name}</p>
              <p className="mt-2 text-2xl font-bold text-white">
                {indicator.value.toFixed(1)}%
              </p>
              <span
                className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(indicator.status)}`}
              >
                {indicator.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {(isLoading || hasError) && (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          {isLoading ? (
            <p className="text-blue-200/75">Loading analytics data...</p>
          ) : (
            <p className="text-rose-200">
              Some analytics metrics failed to load. Please refresh and try
              again.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function DateRangeSelector({
  datePreset,
  setDatePreset,
  customStart,
  customEnd,
  setCustomStart,
  setCustomEnd,
}: {
  datePreset: DatePreset;
  setDatePreset: (value: DatePreset) => void;
  customStart: string;
  customEnd: string;
  setCustomStart: (value: string) => void;
  setCustomEnd: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <select
        value={datePreset}
        onChange={(event) => setDatePreset(event.target.value as DatePreset)}
        className="rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-400"
      >
        <option value="30d" className="bg-slate-900">
          Last 30 days
        </option>
        <option value="90d" className="bg-slate-900">
          Last 90 days
        </option>
        <option value="365d" className="bg-slate-900">
          Last 12 months
        </option>
        <option value="custom" className="bg-slate-900">
          Custom range
        </option>
      </select>
      {datePreset === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(event) => setCustomStart(event.target.value)}
            className="rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-400 [color-scheme:dark]"
          />
          <span className="text-blue-200/75 text-sm">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(event) => setCustomEnd(event.target.value)}
            className="rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-400 [color-scheme:dark]"
          />
        </div>
      )}
    </div>
  );
}

function MetricCard({
  title,
  metric,
  icon,
  formatValue = (value) => number(value),
}: {
  title: string;
  metric: MetricComparison;
  icon: ReactNode;
  formatValue?: (value: number) => string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-blue-200/80">{title}</p>
        <span className="text-blue-300">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold text-white">
        {formatValue(metric.current)}
      </p>
      <div className="mt-3 space-y-1">
        <ComparisonRow label="MoM" value={metric.mom} />
        <ComparisonRow label="YoY" value={metric.yoy} />
      </div>
    </div>
  );
}

function ComparisonRow({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  const positive = typeof value === 'number' && value >= 0;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-blue-200/70">{label}</span>
      <span
        className={`inline-flex items-center gap-1 font-semibold ${
          value === null
            ? 'text-blue-200/60'
            : positive
              ? 'text-emerald-300'
              : 'text-rose-300'
        }`}
      >
        {value !== null && (
          <TrendingUp size={12} className={positive ? '' : 'rotate-180'} />
        )}
        {formatPercent(value)}
      </span>
    </div>
  );
}

function resolveDateRange(
  preset: DatePreset,
  customStart: string,
  customEnd: string,
) {
  const now = new Date();

  if (preset === 'custom' && customStart && customEnd) {
    return {
      startDate: new Date(`${customStart}T00:00:00.000Z`),
      endDate: new Date(`${customEnd}T23:59:59.999Z`),
    };
  }

  const days = PRESET_DAYS[preset === 'custom' ? '90d' : preset];
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  return { startDate, endDate: now };
}

function getPreviousRange(startDate: Date, endDate: Date) {
  const duration = endDate.getTime() - startDate.getTime();
  const previousEnd = new Date(startDate.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration);
  return { start: previousStart, end: previousEnd };
}

function getLastYearRange(startDate: Date, endDate: Date) {
  return {
    start: new Date(
      startDate.getFullYear() - 1,
      startDate.getMonth(),
      startDate.getDate(),
      startDate.getHours(),
      startDate.getMinutes(),
      startDate.getSeconds(),
      startDate.getMilliseconds(),
    ),
    end: new Date(
      endDate.getFullYear() - 1,
      endDate.getMonth(),
      endDate.getDate(),
      endDate.getHours(),
      endDate.getMinutes(),
      endDate.getSeconds(),
      endDate.getMilliseconds(),
    ),
  };
}

function filterByRange<T>(
  list: T[],
  dateGetter: (entry: T) => string,
  startDate: Date,
  endDate: Date,
): T[] {
  return list.filter((entry) => {
    const createdAt = new Date(dateGetter(entry));
    return createdAt >= startDate && createdAt <= endDate;
  });
}

function buildMetric(
  current: number,
  previous: number,
  lastYear: number,
): MetricComparison {
  return {
    current,
    mom: growthPercent(current, previous),
    yoy: growthPercent(current, lastYear),
  };
}

function growthPercent(current: number, baseline: number): number | null {
  if (baseline === 0) return null;
  return ((current - baseline) / baseline) * 100;
}

function buildGrowthSeries(
  users: User[],
  properties: Property[],
  transactions: Transaction[],
): GrowthPoint[] {
  const months = new Map<string, GrowthPoint>();

  const ensureMonth = (dateIso: string) => {
    const date = new Date(dateIso);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!months.has(key)) {
      months.set(key, {
        label: date.toLocaleString('en-US', {
          month: 'short',
          year: '2-digit',
        }),
        users: 0,
        properties: 0,
        transactions: 0,
      });
    }
    return key;
  };

  users.forEach((user) => {
    const key = ensureMonth(user.createdAt);
    months.get(key)!.users += 1;
  });
  properties.forEach((property) => {
    const key = ensureMonth(property.createdAt);
    months.get(key)!.properties += 1;
  });
  transactions.forEach((transaction) => {
    const key = ensureMonth(transaction.createdAt);
    months.get(key)!.transactions += 1;
  });

  return [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, point]) => point);
}

function sumTransactionAmount(transactions: Transaction[]) {
  return transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
}

function percentage(value: number, total: number) {
  if (total === 0) return 0;
  return (value / total) * 100;
}

function rateStatus(
  value: number,
  healthyThreshold: number,
  warningThreshold: number,
): HealthStatus {
  if (value >= healthyThreshold) return 'healthy';
  if (value >= warningThreshold) return 'warning';
  return 'critical';
}

function inverseRateStatus(
  value: number,
  healthyThreshold: number,
  warningThreshold: number,
): HealthStatus {
  if (value <= healthyThreshold) return 'healthy';
  if (value <= warningThreshold) return 'warning';
  return 'critical';
}

function statusClass(status: HealthStatus) {
  if (status === 'healthy') return 'bg-emerald-500/15 text-emerald-300';
  if (status === 'warning') return 'bg-amber-500/15 text-amber-300';
  return 'bg-rose-500/15 text-rose-300';
}

function formatPercent(value: number | null) {
  if (value === null) return 'N/A';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function formatDate(value: Date) {
  return value.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function currency(value: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);
}

function number(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}
