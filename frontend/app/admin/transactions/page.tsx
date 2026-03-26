'use client';

import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Download,
  Search,
  Filter,
  Calendar,
  X,
  RotateCcw,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { useTransactions } from '@/lib/query/hooks/use-transactions';
import { TransactionHistory } from '@/components/admin/TransactionHistory';
import toast from 'react-hot-toast';
import type { Transaction } from '@/types';

interface TransactionFilters {
  page: number;
  limit: number;
  search: string;
  type: Transaction['type'] | '';
  status: Transaction['status'] | '';
  startDate: string;
  endDate: string;
}

const DEFAULT_FILTERS: TransactionFilters = {
  page: 1,
  limit: 20,
  search: '',
  type: '',
  status: '',
  startDate: '',
  endDate: '',
};

export default function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS);

  const {
    data: transactions,
    isLoading,
    refetch,
  } = useTransactions({
    ...filters,
    type: filters.type || undefined,
    status: filters.status || undefined,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value, page: 1 }));
  };

  const handleClearFilters = () => setFilters(DEFAULT_FILTERS);

  const hasFilters = Object.entries(filters).some(
    ([key, v]) => key !== 'page' && key !== 'limit' && v !== '',
  );

  const handleExportCSV = () => {
    if (!transactions?.data || transactions.data.length === 0) {
      toast.error('No transactions available to export');
      return;
    }

    const headers = [
      'ID',
      'Type',
      'Description',
      'Amount',
      'Currency',
      'Status',
      'Blockchain Tx',
      'Date',
    ];
    const csvContent = [
      headers.join(','),
      ...transactions.data.map((tx: Transaction) =>
        [
          tx.id,
          tx.type,
          `"${tx.description.replace(/"/g, '""')}"`,
          tx.amount,
          tx.currency,
          tx.status,
          tx.blockchainTxHash ?? '',
          tx.createdAt,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `transactions-${new Date().toISOString().split('T')[0]}.csv`,
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Transactions exported successfully');
  };

  const completed =
    transactions?.data?.filter((t: Transaction) => t.status === 'completed')
      .length ?? 0;
  const failed =
    transactions?.data?.filter((t: Transaction) => t.status === 'failed')
      .length ?? 0;
  const pending =
    transactions?.data?.filter((t: Transaction) => t.status === 'pending')
      .length ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/5 text-blue-400 rounded-3xl flex items-center justify-center border border-white/10 shadow-lg">
            <ArrowLeftRight size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Transaction History
            </h1>
            <p className="text-blue-200/60 mt-1">
              View all user payments, refunds, and blockchain transactions.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all group"
            title="Refresh"
          >
            <RotateCcw
              size={20}
              className="group-hover:rotate-180 transition-transform duration-500"
            />
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 transition-all shadow-lg"
          >
            <Download size={20} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Transactions"
          value={transactions?.total ?? 0}
          icon={<TrendingUp size={24} />}
          color="blue"
          badge="All time"
        />
        <StatCard
          title="Completed"
          value={completed}
          icon={<CheckCircle size={24} />}
          color="emerald"
          badge="Success"
        />
        <StatCard
          title="Pending"
          value={pending}
          icon={<Clock size={24} />}
          color="amber"
          badge="In progress"
        />
        <StatCard
          title="Failed"
          value={failed}
          icon={<XCircle size={24} />}
          color="rose"
          badge="Errors"
        />
      </div>

      {/* Filters */}
      <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Filter size={20} className="text-blue-400" />
            Filters
          </h3>
          {hasFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              <X size={14} />
              Clear All
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/40 group-focus-within:text-blue-400 transition-colors"
              size={18}
            />
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleChange}
              placeholder="Search transactions..."
              className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all"
            />
          </div>
          <select
            name="type"
            value={filters.type}
            onChange={handleChange}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 appearance-none transition-all"
          >
            <option value="" className="bg-slate-900">
              All Types
            </option>
            <option value="payment" className="bg-slate-900">
              Payment
            </option>
            <option value="refund" className="bg-slate-900">
              Refund
            </option>
            <option value="deposit" className="bg-slate-900">
              Deposit
            </option>
            <option value="withdrawal" className="bg-slate-900">
              Withdrawal
            </option>
          </select>
          <select
            name="status"
            value={filters.status}
            onChange={handleChange}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 appearance-none transition-all"
          >
            <option value="" className="bg-slate-900">
              All Statuses
            </option>
            <option value="completed" className="bg-slate-900">
              Completed
            </option>
            <option value="pending" className="bg-slate-900">
              Pending
            </option>
            <option value="failed" className="bg-slate-900">
              Failed
            </option>
          </select>
          <div className="relative group">
            <Calendar
              className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/40 group-focus-within:text-blue-400 transition-colors"
              size={18}
            />
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleChange}
              className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all [color-scheme:dark]"
            />
          </div>
          <div className="relative group">
            <Calendar
              className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/40 group-focus-within:text-blue-400 transition-colors"
              size={18}
            />
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleChange}
              className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <TransactionHistory
        transactions={transactions}
        isLoading={isLoading}
        page={filters.page}
        setPage={(page) => setFilters((prev) => ({ ...prev, page }))}
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
  badge,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  badge: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 flex flex-col justify-between group hover:border-white/20 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-110 ${colorMap[color]}`}
        >
          {icon}
        </div>
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${colorMap[color]}`}
        >
          {badge}
        </span>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-blue-200/60 uppercase tracking-wider">
          {title}
        </p>
        <h3 className="text-3xl font-bold tracking-tight text-white mt-1">
          {value}
        </h3>
      </div>
    </div>
  );
}
