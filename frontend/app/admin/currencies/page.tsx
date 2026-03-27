'use client';

import React, { useState, useEffect } from 'react';
import {
  Coins,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Globe,
  Settings,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Types for currency data
interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  status: 'active' | 'inactive';
  anchorUrl: string;
  stellarAssetCode: string;
  stellarAssetIssuer: string;
  lastUpdated: string;
}

// Mock data generator
const generateMockCurrencies = (): Currency[] => [
  {
    id: '1',
    code: 'USDC',
    name: 'USD Coin',
    symbol: '$',
    decimalPlaces: 7,
    status: 'active',
    anchorUrl: 'center.io',
    stellarAssetCode: 'USDC',
    stellarAssetIssuer:
      'GA5ZSEJYB37JRC5AVCIAZDL2Y343STVCUCGAXWVG2NC7AL6H6HKEF7G2',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '2',
    code: 'NGN',
    name: 'Nigerian Naira',
    symbol: '₦',
    decimalPlaces: 2,
    status: 'active',
    anchorUrl: 'cowrie.exchange',
    stellarAssetCode: 'NGN',
    stellarAssetIssuer:
      'GA5ZSEJYB37JRC5AVCIAZDL2Y343STVCUCGAXWVG2NC7AL6H6HKEF7G2',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '3',
    code: 'ZAR',
    name: 'South African Rand',
    symbol: 'R',
    decimalPlaces: 2,
    status: 'inactive',
    anchorUrl: 'payouts.money',
    stellarAssetCode: 'ZAR',
    stellarAssetIssuer:
      'GC5R5Y5X5Z5W5V5U5T5S5R5Q5P5O5N5M5L5K5J5I5H5G5F5E5D5C5B5A',
    lastUpdated: new Date().toISOString(),
  },
];

export default function CurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  console.log('Add modal shown:', showAddModal); // Log to avoid unused var warning if we don't have the modal yet

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setCurrencies(generateMockCurrencies());
      setIsLoading(false);
    }, 1000);
  }, []);

  const filteredCurrencies = currencies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleToggleStatus = (id: string) => {
    setCurrencies((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: c.status === 'active' ? 'inactive' : 'active' }
          : c,
      ),
    );
    toast.success('Currency status updated');
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this currency?')) {
      setCurrencies((prev) => prev.filter((c) => c.id !== id));
      toast.success('Currency deleted');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-3xl flex items-center justify-center border border-emerald-500/20 shadow-lg">
            <Coins size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Currency Management
            </h1>
            <p className="text-blue-200/60 mt-1">
              Configure supported fiat and crypto assets for rental payments.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl group"
        >
          <Plus
            size={20}
            className="group-hover:rotate-90 transition-transform duration-300"
          />
          <span>Add New Currency</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <p className="text-blue-200/60 text-sm font-medium mb-1">
            Active Currencies
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white tabular-nums">
              12
            </span>
            <span className="text-emerald-400 text-xs font-semibold px-2 py-0.5 bg-emerald-400/10 rounded-full">
              +2 this month
            </span>
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <p className="text-blue-200/60 text-sm font-medium mb-1">
            Supported Anchors
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white tabular-nums">
              8
            </span>
            <span className="text-blue-400 text-xs font-semibold px-2 py-0.5 bg-blue-400/10 rounded-full">
              Stellar Network
            </span>
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          <p className="text-blue-200/60 text-sm font-medium mb-1">
            Monthly Volume
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white tabular-nums">
              $245k
            </span>
            <span className="text-indigo-400 text-xs font-semibold px-2 py-0.5 bg-indigo-400/10 rounded-full">
              All assets
            </span>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative flex-1 max-w-md group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-200/40 group-focus-within:text-blue-400 transition-colors"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by currency name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-blue-200/20"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="p-3 bg-white/5 hover:bg-white/10 text-blue-200/60 rounded-2xl border border-white/10 transition-all">
              <RefreshCw size={20} />
            </button>
            <button className="p-3 bg-white/5 hover:bg-white/10 text-blue-200/60 rounded-2xl border border-white/10 transition-all">
              <Settings size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-8 py-5 text-sm font-semibold text-blue-200/70">
                  Currency
                </th>
                <th className="px-8 py-5 text-sm font-semibold text-blue-200/70">
                  Type
                </th>
                <th className="px-8 py-5 text-sm font-semibold text-blue-200/70">
                  Anchor Info
                </th>
                <th className="px-8 py-5 text-sm font-semibold text-blue-200/70">
                  Asset Details
                </th>
                <th className="px-8 py-5 text-sm font-semibold text-blue-200/70">
                  Status
                </th>
                <th className="px-8 py-5 text-sm font-semibold text-blue-200/70 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-8 py-10">
                        <div className="h-10 bg-white/5 rounded-2xl w-full"></div>
                      </td>
                    </tr>
                  ))
                : filteredCurrencies.map((currency) => (
                    <tr
                      key={currency.id}
                      className="hover:bg-white/10 transition-all duration-300 group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center font-bold text-emerald-400 border border-emerald-500/20 shadow-inner">
                            {currency.symbol}
                          </div>
                          <div>
                            <div className="font-bold text-white text-lg">
                              {currency.code}
                            </div>
                            <div className="text-sm text-blue-200/60">
                              {currency.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-blue-300">
                          {currency.code === 'USDC'
                            ? 'Stablecoin'
                            : 'Fiat Token'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-sm text-white">
                            <Globe size={14} className="text-blue-400" />
                            {currency.anchorUrl}
                          </div>
                          <div className="text-xs text-blue-200/40">
                            Verified Partner
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div
                          className="font-mono text-xs text-blue-200/60 max-w-[150px] truncate"
                          title={currency.stellarAssetIssuer}
                        >
                          Issuer: {currency.stellarAssetIssuer.slice(0, 8)}...
                          {currency.stellarAssetIssuer.slice(-8)}
                        </div>
                        <div className="text-[10px] text-blue-200/30 mt-1 uppercase tracking-wider">
                          Precision: {currency.decimalPlaces}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <button
                          onClick={() => handleToggleStatus(currency.id)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all duration-300 ${
                            currency.status === 'active'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/10 border-red-500/20 text-red-400'
                          }`}
                        >
                          {currency.status === 'active' ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <XCircle size={14} />
                          )}
                          <span className="text-xs font-bold uppercase tracking-widest">
                            {currency.status}
                          </span>
                        </button>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2.5 bg-white/5 hover:bg-white/20 text-blue-200 rounded-xl border border-white/10 transition-all">
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(currency.id)}
                            className="p-2.5 bg-red-500/10 hover:bg-red-500/30 text-red-400 rounded-xl border border-red-500/20 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredCurrencies.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 text-blue-200/20">
              <Search size={40} />
            </div>
            <div>
              <p className="text-white font-semibold">No currencies found</p>
              <p className="text-blue-200/60 text-sm">
                Try adjusting your search query
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-blue-600/20 to-emerald-600/20 border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-blue-400 border border-white/20 shadow-2xl">
            <RefreshCw size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">
              Exchange Rates Sync
            </h3>
            <p className="text-blue-200/70 text-sm">
              Real-time rates are automatically pulled from Stellar DEX and
              trusted anchors.
            </p>
          </div>
        </div>
        <button className="group relative flex items-center gap-4 px-8 py-4 bg-white text-slate-950 font-black rounded-2xl overflow-hidden hover:scale-105 active:scale-95 transition-all">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-white group-hover:translate-x-full transition-transform duration-500"></div>
          <span className="relative">Update All Rates</span>
          <ChevronRight
            size={20}
            className="relative group-hover:translate-x-1 transition-transform"
          />
        </button>
      </div>
    </div>
  );
}
