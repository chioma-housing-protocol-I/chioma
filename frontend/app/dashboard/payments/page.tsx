'use client';

import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertCircle,
  RotateCcw,
  Download,
  Calendar,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import toast from 'react-hot-toast';

// Types for payment data
interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: 'completed' | 'failed' | 'pending' | 'refunded';
  createdAt: string;
  description?: string;
  failureReason?: string;
  userId?: string;
  userEmail?: string;
}

interface Refund {
  id: string;
  originalTransactionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestDate: string;
  reason?: string;
  userId?: string;
  userEmail?: string;
}

interface PaymentMetrics {
  totalVolume: number;
  totalPayments: number;
  averageValue: number;
  failedCount: number;
  pendingRefunds: number;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

interface PaymentFilters {
  page: number;
  limit: number;
  startDate: string;
  endDate: string;
}

const DEFAULT_FILTERS: PaymentFilters = {
  page: 1,
  limit: 10,
  startDate: '',
  endDate: '',
};

// Mock data generators
const generateMockMetrics = (dateRange: DateRange): PaymentMetrics => {
  const baseVolume = 125000 + Math.random() * 50000;
  const basePayments = 180 + Math.floor(Math.random() * 50);
  return {
    totalVolume: baseVolume,
    totalPayments: basePayments,
    averageValue: baseVolume / basePayments,
    failedCount: Math.floor(Math.random() * 15) + 3,
    pendingRefunds: Math.floor(Math.random() * 8) + 1,
  };
};

const generateMockFailedPayments = (count: number = 15): Payment[] => {
  const reasons = [
    'Insufficient funds',
    'Card expired',
    'Bank declined',
    'Invalid card number',
    'Transaction timeout',
    'Duplicate transaction',
    'Suspected fraud',
    '3D Secure verification failed',
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `TXN-${String(1000 + i).padStart(6, '0')}`,
    amount: Math.floor(Math.random() * 5000) + 100,
    currency: 'USD',
    status: 'failed' as const,
    createdAt: new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    failureReason: reasons[Math.floor(Math.random() * reasons.length)],
    userId: `USR-${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}`,
    userEmail: `user${Math.floor(Math.random() * 100)}@example.com`,
  }));
};

const generateMockPendingRefunds = (count: number = 8): Refund[] => {
  const statuses: Refund['status'][] = ['pending', 'processing'];

  return Array.from({ length: count }, (_, i) => ({
    id: `REF-${String(2000 + i).padStart(6, '0')}`,
    originalTransactionId: `TXN-${String(1000 + Math.floor(Math.random() * 500)).padStart(6, '0')}`,
    amount: Math.floor(Math.random() * 3000) + 200,
    currency: 'USD',
    status: statuses[Math.floor(Math.random() * statuses.length)],
    requestDate: new Date(
      Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    reason: 'Customer request - order not received',
    userId: `USR-${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}`,
    userEmail: `user${Math.floor(Math.random() * 100)}@example.com`,
  }));
};

const generateDailyVolumeData = () => {
  const data = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      volume: Math.floor(Math.random() * 15000) + 5000,
      count: Math.floor(Math.random() * 50) + 10,
    });
  }
  return data;
};

const generateMonthlyTrendsData = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return months.map((month, i) => ({
    month,
    volume: Math.floor(Math.random() * 100000) + 50000,
    count: Math.floor(Math.random() * 300) + 100,
    successRate: Math.floor(Math.random() * 10) + 88,
  }));
};

// Metric Card Component
function MetricCard({
  title,
  value,
  icon: Icon,
  isLoading,
  trend,
  trendValue,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  isLoading?: boolean;
  trend?: 'up' | 'down';
  trendValue?: string;
}) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-blue-200/60 text-sm font-medium mb-2">{title}</p>
          {isLoading ? (
            <div className="h-10 w-32 bg-white/10 rounded-lg animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-white tracking-tight">
              {value}
            </p>
          )}
          {trend && trendValue && (
            <div
              className={`flex items-center mt-2 text-sm ${
                trend === 'up' ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              <TrendingUp
                size={14}
                className={`mr-1 ${trend === 'down' ? 'rotate-180' : ''}`}
              />
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20">
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

// Failed Payments Table Component
function FailedPaymentsTable({
  payments,
  isLoading,
  page,
  totalPages,
  onPageChange,
}: {
  payments: Payment[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center border border-red-500/20">
            <AlertCircle size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Failed Payments
            </h3>
            <p className="text-blue-200/60 text-sm">
              Recently failed transactions requiring attention
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-blue-200/60 uppercase tracking-wider">
                Transaction ID
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-blue-200/60 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-blue-200/60 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-blue-200/60 uppercase tracking-wider">
                Failure Reason
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4">
                    <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : payments.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-12 text-center text-blue-200/60"
                >
                  No failed payments found
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-white font-medium">{payment.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white font-semibold">
                      ${payment.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-blue-200/60">
                      {new Date(payment.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-red-300 text-sm">
                      {payment.failureReason}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-blue-200/60 text-sm">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Pending Refunds Component
function PendingRefundsSection({
  refunds,
  isLoading,
}: {
  refunds: Refund[];
  isLoading: boolean;
}) {
  const getStatusColor = (status: Refund['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'processing':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'completed':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'rejected':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500/20 text-yellow-400 rounded-xl flex items-center justify-center border border-yellow-500/20">
            <RotateCcw size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Pending Refunds
            </h3>
            <p className="text-blue-200/60 text-sm">
              Refund requests awaiting processing
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-blue-200/60 uppercase tracking-wider">
                Refund ID
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-blue-200/60 uppercase tracking-wider">
                Original Transaction
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-blue-200/60 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-blue-200/60 uppercase tracking-wider">
                Request Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-blue-200/60 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4">
                    <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : refunds.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-blue-200/60"
                >
                  No pending refunds
                </td>
              </tr>
            ) : (
              refunds.map((refund) => (
                <tr
                  key={refund.id}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-white font-medium">{refund.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-blue-200/60 text-sm">
                      {refund.originalTransactionId}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white font-semibold">
                      ${refund.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-blue-200/60">
                      {new Date(refund.requestDate).toLocaleDateString(
                        'en-US',
                        {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        },
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        refund.status,
                      )}`}
                    >
                      {refund.status.charAt(0).toUpperCase() +
                        refund.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Chart Components
function DailyVolumeChart({
  data,
}: {
  data: { date: string; volume: number }[];
}) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        Daily Payment Volume
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.1)"
            />
            <XAxis
              dataKey="date"
              stroke="rgba(255,255,255,0.5)"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
            <YAxis
              stroke="rgba(255,255,255,0.5)"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#fff',
              }}
              formatter={(value, name) => [
                value !== undefined
                  ? `${Number(value).toLocaleString()}`
                  : 'N/A',
                name === 'volume' ? 'Volume' : (name ?? 'Value'),
              ]}
              labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
            />
            <Bar dataKey="volume" fill="url(#gradient)" radius={[6, 6, 0, 0]} />
            <defs>
              <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MonthlyTrendsChart({
  data,
}: {
  data: { month: string; volume: number; count: number }[];
}) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        Monthly Payment Trends
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.1)"
            />
            <XAxis
              dataKey="month"
              stroke="rgba(255,255,255,0.5)"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
            />
            <YAxis
              stroke="rgba(255,255,255,0.5)"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#fff',
              }}
              formatter={(value, name) => [
                value !== undefined
                  ? `${Number(value).toLocaleString()}`
                  : 'N/A',
                name === 'volume' ? 'Volume' : (name ?? 'Value'),
              ]}
              labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
            />
            <Line
              type="monotone"
              dataKey="volume"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#6366f1' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Main Component
export default function PaymentMonitoring() {
  const [filters, setFilters] = useState<PaymentFilters>(DEFAULT_FILTERS);
  const [isExporting, setIsExporting] = useState(false);

  // Generate mock data based on filters
  const dateRange: DateRange = {
    startDate: filters.startDate,
    endDate: filters.endDate,
  };

  const metrics = useMemo(() => generateMockMetrics(dateRange), [dateRange]);
  const allFailedPayments = useMemo(() => generateMockFailedPayments(20), []);
  const pendingRefunds = useMemo(() => generateMockPendingRefunds(), []);
  const dailyVolumeData = useMemo(() => generateDailyVolumeData(), []);
  const monthlyTrendsData = useMemo(() => generateMonthlyTrendsData(), []);

  // Paginate failed payments
  const paginatedFailedPayments = useMemo(() => {
    const start = (filters.page - 1) * filters.limit;
    return allFailedPayments.slice(start, start + filters.limit);
  }, [allFailedPayments, filters.page, filters.limit]);

  const totalPages = Math.ceil(allFailedPayments.length / filters.limit);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value, page: 1 }));
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const hasFilters = filters.startDate !== '' || filters.endDate !== '';

  const handleExport = (format: 'csv' | 'json') => {
    setIsExporting(true);

    const exportData = {
      metrics,
      failedPayments: allFailedPayments,
      pendingRefunds,
      dailyVolume: dailyVolumeData,
      monthlyTrends: monthlyTrendsData,
      filters: dateRange,
      exportedAt: new Date().toISOString(),
    };

    try {
      if (format === 'csv') {
        const csvRows = [
          ['Metric', 'Value'],
          ['Total Volume', metrics.totalVolume.toString()],
          ['Total Payments', metrics.totalPayments.toString()],
          ['Average Value', metrics.averageValue.toString()],
          ['Failed Count', metrics.failedCount.toString()],
          ['Pending Refunds', metrics.pendingRefunds.toString()],
        ];

        // Add failed payments
        csvRows.push([], ['Failed Payments']);
        csvRows.push(['ID', 'Amount', 'Date', 'Reason']);
        allFailedPayments.forEach((payment) => {
          csvRows.push([
            payment.id,
            payment.amount.toString(),
            payment.createdAt,
            payment.failureReason || '',
          ]);
        });

        // Add pending refunds
        csvRows.push([], ['Pending Refunds']);
        csvRows.push(['ID', 'Amount', 'Request Date', 'Status']);
        pendingRefunds.forEach((refund) => {
          csvRows.push([
            refund.id,
            refund.amount.toString(),
            refund.requestDate,
            refund.status,
          ]);
        });

        const csvContent = csvRows.map((row) => row.join(',')).join('\n');
        const blob = new Blob([csvContent], {
          type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute(
          'download',
          `payments-export-${new Date().toISOString().split('T')[0]}.csv`,
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const jsonContent = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute(
          'download',
          `payments-export-${new Date().toISOString().split('T')[0]}.json`,
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast.success(`Payments exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/5 text-blue-400 rounded-3xl flex items-center justify-center border border-white/10 shadow-lg">
            <CreditCard size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Payment Monitoring
            </h1>
            <p className="text-blue-200/60 mt-1">
              Monitor transaction activity, detect failures, and analyze payment
              trends.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Export Dropdown */}
          <div className="relative group">
            <button
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              <Download size={18} />
              <span>Export</span>
            </button>
            <div className="absolute right-0 mt-2 w-40 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-3 text-left text-white hover:bg-white/10 rounded-t-2xl transition-colors text-sm"
              >
                Export as CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full px-4 py-3 text-left text-white hover:bg-white/10 rounded-b-2xl transition-colors text-sm"
              >
                Export as JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Filter size={18} className="text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Filters</h3>
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm text-blue-200/60 mb-2">
              Start Date
            </label>
            <div className="relative">
              <Calendar
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"
              />
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleDateChange}
                className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-blue-200/60 mb-2">
              End Date
            </label>
            <div className="relative">
              <Calendar
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"
              />
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleDateChange}
                className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>
          </div>
          {hasFilters && (
            <div className="flex items-end">
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 text-white rounded-xl border border-white/10 hover:bg-white/10 transition-all"
              >
                <X size={16} />
                <span>Clear</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Total Transaction Volume"
          value={`$${metrics.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={DollarSign}
          trend="up"
          trendValue="+12.5% from last month"
        />
        <MetricCard
          title="Total Payments"
          value={metrics.totalPayments.toLocaleString()}
          icon={CreditCard}
          trend="up"
          trendValue="+8.3% from last month"
        />
        <MetricCard
          title="Average Transaction Value"
          value={`$${metrics.averageValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          icon={TrendingUp}
          trend="down"
          trendValue="-2.1% from last month"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailyVolumeChart data={dailyVolumeData} />
        <MonthlyTrendsChart data={monthlyTrendsData} />
      </div>

      {/* Failed Payments and Pending Refunds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FailedPaymentsTable
          payments={paginatedFailedPayments}
          isLoading={false}
          page={filters.page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
        <PendingRefundsSection refunds={pendingRefunds} isLoading={false} />
      </div>
    </div>
  );
}
