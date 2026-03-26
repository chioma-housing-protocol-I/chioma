'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRejectedKycVerifications } from '@/lib/query/hooks/use-kyc-verifications';
import { RejectedKYCList } from '@/components/admin/RejectedKYCList';

// ── Filters ─────────────────────────────────────────────────────────────────

interface RejectedKycFilters {
  page: number;
  limit: number;
  search: string;
  sortBy: 'createdAt' | 'updatedAt' | 'status';
  sortOrder: 'asc' | 'desc';
  reason: string; // client-side reason filter
}

const DEFAULT_FILTERS: RejectedKycFilters = {
  page: 1,
  limit: 10,
  search: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  reason: '',
};

// Common rejection reason presets
const REASON_PRESETS = [
  'All reasons',
  'Blurry / unclear image',
  'Expired document',
  'Name mismatch',
  'Missing documents',
  'Other',
] as const;

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RejectedKycPage() {
  const [filters, setFilters] = useState<RejectedKycFilters>(DEFAULT_FILTERS);

  // Pass API-safe params (exclude the client-only `reason` field)
  const { page, limit, search, sortBy, sortOrder } = filters;
  const { data, isLoading, refetch } = useRejectedKycVerifications({
    page,
    limit,
    search,
    sortBy,
    sortOrder,
  });

  const hasFilters =
    filters.search !== '' ||
    filters.sortBy !== 'createdAt' ||
    filters.sortOrder !== 'desc' ||
    filters.reason !== '';

  // Client-side reason filtering
  const filteredData = React.useMemo(() => {
    if (!data) return data;
    if (!filters.reason || filters.reason === 'All reasons') return data;
    const pattern = new RegExp(filters.reason.split(' ')[0], 'i');
    const filtered = data.data.filter((item) =>
      pattern.test(item.reason ?? ''),
    );
    return { ...data, data: filtered, total: filtered.length };
  }, [data, filters.reason]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950/20 to-slate-950 p-4 sm:p-6 lg:p-8 space-y-8">
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-rose-500/10 text-rose-400 rounded-3xl flex items-center justify-center border border-rose-500/20 shadow-lg shadow-rose-500/10">
            <XCircle size={30} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Rejected KYC Verifications
            </h1>
            <p className="text-blue-200/60 mt-1">
              Review rejection reasons and track user resubmissions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Link
            href="/admin/kyc"
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 text-sm font-medium transition-all"
          >
            ← Pending KYC
          </Link>
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
        </div>
      </div>

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          title="Total Rejected"
          value={data?.total ?? 0}
          icon={<XCircle size={22} />}
          color="rose"
        />
        <StatCard
          title="Resubmissions"
          value={
            (data?.data ?? []).filter(
              (v) =>
                new Date(v.updatedAt).getTime() -
                  new Date(v.createdAt).getTime() >
                60_000,
            ).length
          }
          icon={<RefreshCw size={22} />}
          color="emerald"
        />
        <StatCard
          title={`Page ${filters.page} / ${Math.max(data?.totalPages ?? 1, 1)}`}
          value={data?.data?.length ?? 0}
          icon={<Filter size={22} />}
          color="blue"
        />
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Filter size={20} className="text-rose-400" />
            Filters &amp; Sorting
          </h3>
          {hasFilters && (
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative group lg:col-span-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/40 group-focus-within:text-blue-400 transition-colors"
              size={18}
            />
            <input
              type="text"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  page: 1,
                  search: e.target.value,
                }))
              }
              placeholder="Search user, email, ID…"
              className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 focus:border-rose-500 transition-all"
            />
          </div>

          {/* Rejection reason preset */}
          <div className="relative group">
            <AlertCircle
              className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-300/40 pointer-events-none"
              size={16}
            />
            <select
              value={filters.reason}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  page: 1,
                  reason: e.target.value,
                }))
              }
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 focus:border-rose-500 appearance-none transition-all"
            >
              {REASON_PRESETS.map((r) => (
                <option
                  key={r}
                  value={r === 'All reasons' ? '' : r}
                  className="bg-slate-900"
                >
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Sort by */}
          <select
            value={filters.sortBy}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                page: 1,
                sortBy: e.target.value as RejectedKycFilters['sortBy'],
              }))
            }
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 focus:border-rose-500 appearance-none transition-all"
          >
            <option value="createdAt" className="bg-slate-900">
              Sort: Rejected date
            </option>
            <option value="updatedAt" className="bg-slate-900">
              Sort: Updated date
            </option>
            <option value="status" className="bg-slate-900">
              Sort: Status
            </option>
          </select>

          {/* Sort order */}
          <select
            value={filters.sortOrder}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                page: 1,
                sortOrder: e.target.value as RejectedKycFilters['sortOrder'],
              }))
            }
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 focus:border-rose-500 appearance-none transition-all"
          >
            <option value="desc" className="bg-slate-900">
              Order: Newest first
            </option>
            <option value="asc" className="bg-slate-900">
              Order: Oldest first
            </option>
          </select>
        </div>
      </div>

      {/* ── List ──────────────────────────────────────────────────────────── */}
      <RejectedKYCList
        data={filteredData}
        isLoading={isLoading}
        page={filters.page}
        setPage={(p) => setFilters((prev) => ({ ...prev, page: p }))}
      />
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'emerald' | 'rose';
}) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${colorMap[color]}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs text-blue-200/60 uppercase tracking-wider">
          {title}
        </p>
        <h3 className="text-2xl font-bold text-white">{value}</h3>
      </div>
    </div>
  );
}
