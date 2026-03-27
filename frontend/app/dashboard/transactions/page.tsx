'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
// import toast from 'react-hot-toast'; // Not used in this page

// Types for Stellar transaction data
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

// Mock data generator
const generateMockTransactions = (count: number = 10): StellarTransaction[] => {
  const assets = ['USDC', 'NGN', 'XLM', 'EURC'];
  const types: StellarTransaction['type'][] = [
    'payment',
    'create_account',
    'change_trust',
    'manage_offer',
  ];

  return Array.from({ length: count }, (_, i) => ({
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

export default function StellarTransactionsPage() {
  const [transactions, setTransactions] = useState<StellarTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    // Simulate API call
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
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-10 space-y-10">
      {/* Header section with glass effect */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative bg-slate-900 border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
          <div className="flex items-center gap-6 z-10">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30 shadow-2xl">
              <Activity size={40} className="text-blue-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white mb-2">
                Stellar Ledger
              </h1>
              <p className="text-blue-200/50 font-medium">
                Immutable transaction history powered by Stellar Network.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 z-10">
            <button className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold border border-white/10 transition-all">
              <Download size={20} />
              <span>Export CSV</span>
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-900/20 transition-all">
              <Layers size={20} />
              <span>Network Status</span>
            </button>
          </div>
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatItem
          title="Total Volume"
          value="$128,450"
          icon={Wallet}
          color="blue"
        />
        <StatItem
          title="Success Rate"
          value={`${((stats.success / stats.total) * 100).toFixed(1)}%`}
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

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="relative flex-1 group">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
            <Search size={22} />
          </div>
          <input
            type="text"
            placeholder="Search by transaction hash or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/50 border border-white/5 text-white rounded-[24px] pl-14 pr-6 py-5 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all text-lg placeholder:text-slate-600"
          />
        </div>
        <div className="flex gap-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-900/50 border border-white/5 text-white rounded-[24px] px-8 py-5 focus:outline-none focus:ring-4 focus:ring-blue-500/10 border-blue-500/50 transition-all font-bold appearance-none cursor-pointer hover:bg-slate-900"
          >
            <option value="all">All Operations</option>
            <option value="payment">Payments</option>
            <option value="create_account">Account Creation</option>
            <option value="change_trust">Trust Lines</option>
          </select>
          <button className="bg-slate-900/50 border border-white/5 text-white rounded-[24px] px-6 py-5 flex items-center gap-2 hover:bg-slate-900 transition-all">
            <Filter size={20} />
            <span className="font-bold">More</span>
          </button>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-slate-900/30 border border-white/5 rounded-[40px] overflow-hidden backdrop-blur-3xl shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5">
                <th className="px-8 py-6 text-sm font-black text-slate-500 uppercase tracking-[0.2em]">
                  Transaction
                </th>
                <th className="px-8 py-6 text-sm font-black text-slate-500 uppercase tracking-[0.2em]">
                  Asset/Amount
                </th>
                <th className="px-8 py-6 text-sm font-black text-slate-500 uppercase tracking-[0.2em]">
                  From/To
                </th>
                <th className="px-8 py-6 text-sm font-black text-slate-500 uppercase tracking-[0.2em]">
                  Status
                </th>
                <th className="px-8 py-6 text-sm font-black text-slate-500 uppercase tracking-[0.2em] text-right">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-8 py-10">
                        <div className="h-12 bg-white/5 rounded-2xl"></div>
                      </td>
                    </tr>
                  ))
                : filteredTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="group hover:bg-white/5 transition-all duration-300"
                    >
                      <td className="px-8 py-8">
                        <div className="flex items-center gap-5">
                          <div
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner transition-transform group-hover:scale-110 duration-500 ${
                              tx.type === 'payment'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : tx.type === 'create_account'
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                  : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            }`}
                          >
                            {tx.type === 'payment' ? (
                              <ArrowUpRight size={24} />
                            ) : (
                              <Layers size={24} />
                            )}
                          </div>
                          <div className="max-w-[180px]">
                            <div className="font-black text-white text-lg group-hover:text-blue-400 transition-colors uppercase tracking-wider">
                              {tx.type.replace('_', ' ')}
                            </div>
                            <div className="text-sm font-mono text-slate-500 truncate mt-1">
                              {tx.hash.slice(0, 10)}...{tx.hash.slice(-10)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        <div className="flex flex-col gap-1">
                          {tx.amount ? (
                            <>
                              <div className="text-2xl font-black text-white tabular-nums">
                                {tx.amount}{' '}
                                <span className="text-blue-400 text-sm font-bold tracking-widest">
                                  {tx.assetCode}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                                Network Fee: {tx.fee}
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-500 font-bold uppercase tracking-widest">
                              N/A
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 group/addr cursor-pointer">
                            <div className="w-6 h-6 bg-slate-800 rounded-md flex items-center justify-center text-[10px] font-black group-hover/addr:bg-blue-500 transition-colors">
                              FR
                            </div>
                            <span className="text-sm font-mono text-slate-400 group-hover/addr:text-blue-400 transition-colors">
                              {tx.from.slice(0, 8)}...{tx.from.slice(-8)}
                            </span>
                          </div>
                          {tx.to && (
                            <div className="flex items-center gap-2 group/addr cursor-pointer">
                              <div className="w-6 h-6 bg-slate-800 rounded-md flex items-center justify-center text-[10px] font-black group-hover/addr:bg-emerald-500 transition-colors">
                                TO
                              </div>
                              <span className="text-sm font-mono text-slate-400 group-hover/addr:text-emerald-400 transition-colors">
                                {tx.to.slice(0, 8)}...{tx.to.slice(-8)}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        <span
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-[0.1em] border shadow-lg ${
                            tx.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-900/10'
                              : tx.status === 'pending'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-900/10'
                                : 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-900/10'
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              tx.status === 'completed'
                                ? 'bg-emerald-400 anim-pulse'
                                : tx.status === 'pending'
                                  ? 'bg-amber-400 animate-bounce'
                                  : 'bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                            }`}
                          ></div>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-8 py-8 text-right">
                        <div className="text-white font-bold">
                          {new Date(tx.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-slate-500 text-sm mt-1">
                          {new Date(tx.createdAt).toLocaleTimeString([], {
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
      <div className="flex items-center justify-between p-2">
        <p className="text-slate-500 font-bold text-sm uppercase tracking-widest whitespace-nowrap">
          Showing 1 - 25 of 1,240 results
        </p>
        <div className="flex gap-4">
          <button className="p-4 bg-slate-900 border border-white/5 text-white rounded-2xl hover:bg-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            {[1, 2, 3, '...', 12].map((n, i) => (
              <button
                key={i}
                className={`w-12 h-12 rounded-2xl font-black transition-all ${n === 1 ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/20' : 'text-slate-500 hover:text-white'}`}
              >
                {n}
              </button>
            ))}
          </div>
          <button className="p-4 bg-slate-900 border border-white/5 text-white rounded-2xl hover:bg-slate-800 transition-all">
            <ChevronRight size={24} />
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
    <div className="bg-slate-900/50 border border-white/5 rounded-[32px] p-8 hover:bg-slate-900 transition-all group overflow-hidden relative">
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
        <Icon size={120} />
      </div>
      <div className="flex items-start justify-between relative z-10">
        <div
          className={`w-12 h-12 ${colors[color]} rounded-2xl flex items-center justify-center border shadow-lg`}
        >
          <Icon size={24} />
        </div>
        <div className="text-right">
          <p className="text-slate-500 font-black text-xs uppercase tracking-[0.2em] mb-2">
            {title}
          </p>
          <div className="flex items-baseline justify-end gap-1">
            <span className="text-3xl font-black text-white">{value}</span>
            {unit && (
              <span className="text-xs font-black text-slate-500 uppercase">
                {unit}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
