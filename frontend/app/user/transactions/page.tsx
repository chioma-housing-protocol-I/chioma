'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import {
  ArrowUpRight,
  Search,
  Filter,
  Download,
  ChevronRight,
  ChevronLeft,
  Wallet,
  CheckCircle2,
  Clock,
  Briefcase,
  Layers,
  Activity,
} from 'lucide-react';

interface StellarTransaction {
  id: string;
  hash: string;
  type: 'payment' | 'create_account' | 'change_trust' | 'manage_offer';
  amount?: string;
  assetCode?: string;
  from: string;
  to?: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt: string;
  memo?: string;
  fee: string;
}

const generateMockTransactions = (count = 10): StellarTransaction[] => {
  const assets = ['USDC', 'USDC', 'XLM', 'EURC'];
  const types: StellarTransaction['type'][] = [
    'payment',
    'create_account',
    'change_trust',
    'manage_offer',
  ];
  return Array.from({ length: count }, () => ({
    id: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    hash: '0x' + Math.random().toString(16).substr(2, 64),
    type: types[Math.floor(Math.random() * types.length)],
    amount: (Math.random() * 1000).toFixed(2),
    assetCode: assets[Math.floor(Math.random() * assets.length)],
    from: 'GC' + Math.random().toString(36).substr(2, 54).toUpperCase(),
    to: 'GA' + Math.random().toString(36).substr(2, 54).toUpperCase(),
    status:
      Math.random() > 0.1
        ? 'completed'
        : Math.random() > 0.5
          ? 'pending'
          : 'failed',
    createdAt: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
    fee: '0.00001 XLM',
    memo: Math.random() > 0.5 ? 'Rental Payment' : undefined,
  }));
};

export default function TenantTransactionsPage() {
  const { formatDate } = useTranslation();
  const [transactions, setTransactions] = useState<StellarTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    setTimeout(() => {
      setTransactions(generateMockTransactions(25));
      setIsLoading(false);
    }, 1200);
  }, []);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.to?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || tx.type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = useMemo(
    () => ({
      total: transactions.length,
      success: transactions.filter((t) => t.status === 'completed').length,
      pending: transactions.filter((t) => t.status === 'pending').length,
      failed: transactions.filter((t) => t.status === 'failed').length,
    }),
    [transactions],
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
        <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
          <div className="flex items-center gap-6 z-10">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
              <Activity size={32} className="text-blue-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white mb-1">
                Stellar Ledger
              </h1>
              <p className="text-blue-200/50 font-medium">
                Immutable transaction history powered by Stellar Network.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 z-10">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold border border-white/10 transition-all text-sm">
              <Download size={16} />
              Export CSV
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg transition-all text-sm">
              <Layers size={16} />
              Network Status
            </button>
          </div>
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl"></div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatItem
          title="Total Volume"
          value="$128,450"
          icon={Wallet}
          color="blue"
        />
        <StatItem
          title="Success Rate"
          value={`${stats.total ? ((stats.success / stats.total) * 100).toFixed(1) : 0}%`}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatItem
          title="Pending"
          value={stats.pending}
          icon={Clock}
          color="amber"
        />
        <StatItem
          title="Avg. Fee"
          value="0.0001"
          icon={Briefcase}
          color="purple"
          unit="XLM"
        />
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/40"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by hash or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 text-white rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition-all placeholder:text-blue-300/30"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white/5 border border-white/10 text-white rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-semibold appearance-none cursor-pointer hover:bg-white/10"
          >
            <option value="all" className="bg-slate-900">
              All Operations
            </option>
            <option value="payment" className="bg-slate-900">
              Payments
            </option>
            <option value="create_account" className="bg-slate-900">
              Account Creation
            </option>
            <option value="change_trust" className="bg-slate-900">
              Trust Lines
            </option>
          </select>
          <button className="bg-white/5 border border-white/10 text-white rounded-2xl px-4 py-3.5 flex items-center gap-2 hover:bg-white/10 transition-all">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="px-6 py-5 text-xs font-black text-blue-300/40 uppercase tracking-widest">
                  Transaction
                </th>
                <th className="px-6 py-5 text-xs font-black text-blue-300/40 uppercase tracking-widest">
                  Asset / Amount
                </th>
                <th className="px-6 py-5 text-xs font-black text-blue-300/40 uppercase tracking-widest">
                  From / To
                </th>
                <th className="px-6 py-5 text-xs font-black text-blue-300/40 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-5 text-xs font-black text-blue-300/40 uppercase tracking-widest text-right">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-6">
                        <div className="h-10 bg-white/5 rounded-xl"></div>
                      </td>
                    </tr>
                  ))
                : filteredTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="group hover:bg-white/5 transition-all duration-200"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110 duration-300 ${
                              tx.type === 'payment'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : tx.type === 'create_account'
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                  : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            }`}
                          >
                            {tx.type === 'payment' ? (
                              <ArrowUpRight size={20} />
                            ) : (
                              <Layers size={20} />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm uppercase tracking-wide group-hover:text-blue-400 transition-colors">
                              {tx.type.replace('_', ' ')}
                            </div>
                            <div className="text-xs font-mono text-blue-300/30 mt-0.5">
                              {tx.hash.slice(0, 8)}...{tx.hash.slice(-8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {tx.amount ? (
                          <>
                            <div className="text-lg font-black text-white">
                              {tx.amount}{' '}
                              <span className="text-blue-400 text-xs font-bold tracking-widest">
                                {tx.assetCode}
                              </span>
                            </div>
                            <div className="text-xs text-blue-300/30 font-medium mt-0.5">
                              Fee: {tx.fee}
                            </div>
                          </>
                        ) : (
                          <span className="text-blue-300/30 font-bold text-xs uppercase">
                            N/A
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black bg-white/5 text-blue-300/50 px-1.5 py-0.5 rounded">
                              FR
                            </span>
                            <span className="text-xs font-mono text-blue-200/50">
                              {tx.from.slice(0, 6)}...{tx.from.slice(-6)}
                            </span>
                          </div>
                          {tx.to && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black bg-white/5 text-emerald-400/50 px-1.5 py-0.5 rounded">
                                TO
                              </span>
                              <span className="text-xs font-mono text-blue-200/50">
                                {tx.to.slice(0, 6)}...{tx.to.slice(-6)}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            tx.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : tx.status === 'pending'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              tx.status === 'completed'
                                ? 'bg-emerald-400'
                                : tx.status === 'pending'
                                  ? 'bg-amber-400 animate-pulse'
                                  : 'bg-red-400'
                            }`}
                          ></div>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="text-white font-bold text-sm">
                          {formatDate(tx.createdAt, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-blue-300/30 text-xs mt-0.5">
                          {formatDate(tx.createdAt, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-blue-300/40 font-semibold text-sm">
          Showing 1–25 of 1,240 results
        </p>
        <div className="flex gap-2">
          <button className="p-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all">
            <ChevronLeft size={18} />
          </button>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${n === 1 ? 'bg-blue-600 text-white' : 'text-blue-300/40 hover:text-white'}`}
            >
              {n}
            </button>
          ))}
          <button className="p-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

interface StatItemProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: 'blue' | 'emerald' | 'amber' | 'purple';
  unit?: string;
}

function StatItem({ title, value, icon: Icon, color, unit }: StatItemProps) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group">
      <div
        className={`w-10 h-10 ${colors[color]} rounded-xl flex items-center justify-center border mb-4`}
      >
        <Icon size={20} />
      </div>
      <p className="text-blue-300/40 font-bold text-xs uppercase tracking-widest mb-1">
        {title}
      </p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black text-white">{value}</span>
        {unit && (
          <span className="text-xs font-black text-blue-400 uppercase">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
