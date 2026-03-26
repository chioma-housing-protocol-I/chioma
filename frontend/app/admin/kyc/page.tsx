'use client';

import React, { useState } from 'react';
import { CheckCheck, Filter, RotateCcw, Search, Shield } from 'lucide-react';
import {
  useApproveKycVerification,
  usePendingKycVerifications,
  useRejectKycVerification,
} from '@/lib/query/hooks/use-kyc-verifications';
import { PendingKYCList } from '@/components/admin/PendingKYCList';

interface KycFilters {
  page: number;
  limit: number;
  search: string;
  sortBy: 'createdAt' | 'updatedAt' | 'status';
  sortOrder: 'asc' | 'desc';
}

const DEFAULT_FILTERS: KycFilters = {
  page: 1,
  limit: 10,
  search: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export default function PendingKycPage() {
  const [filters, setFilters] = useState<KycFilters>(DEFAULT_FILTERS);

  const { data, isLoading, refetch } = usePendingKycVerifications(filters);
  const approveMutation = useApproveKycVerification();
  const rejectMutation = useRejectKycVerification();

  const hasFilters =
    filters.search !== '' ||
    filters.sortBy !== 'createdAt' ||
    filters.sortOrder !== 'desc';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/5 text-blue-400 rounded-3xl flex items-center justify-center border border-white/10 shadow-lg">
            <Shield size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Pending KYC Verifications
            </h1>
            <p className="text-blue-200/60 mt-1">
              Review identity submissions and approve or reject quickly.
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all group self-start sm:self-auto"
          title="Refresh"
        >
          <RotateCcw
            size={20}
            className="group-hover:rotate-180 transition-transform duration-500"
          />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          title="Pending Verifications"
          value={data?.total ?? 0}
          icon={<Shield size={22} />}
          color="amber"
        />
        <StatCard
          title="This Page"
          value={data?.data?.length ?? 0}
          icon={<CheckCheck size={22} />}
          color="blue"
        />
        <StatCard
          title="Page"
          value={`${filters.page}/${Math.max(data?.totalPages ?? 1, 1)}`}
          icon={<Filter size={22} />}
          color="emerald"
        />
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Filter size={20} className="text-blue-400" />
            Filters & Sorting
          </h3>
          {hasFilters && (
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative group md:col-span-2">
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
              placeholder="Search by user, email, or ID..."
              className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all"
            />
          </div>
          <select
            value={filters.sortBy}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                page: 1,
                sortBy: e.target.value as KycFilters['sortBy'],
              }))
            }
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 appearance-none transition-all"
          >
            <option value="createdAt" className="bg-slate-900">
              Sort: Created date
            </option>
            <option value="updatedAt" className="bg-slate-900">
              Sort: Updated date
            </option>
            <option value="status" className="bg-slate-900">
              Sort: Status
            </option>
          </select>
          <select
            value={filters.sortOrder}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                page: 1,
                sortOrder: e.target.value as KycFilters['sortOrder'],
              }))
            }
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 appearance-none transition-all"
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

      <PendingKYCList
        data={data}
        isLoading={isLoading}
        page={filters.page}
        setPage={(page) => setFilters((prev) => ({ ...prev, page }))}
        onApprove={async (verificationId) => {
          await approveMutation.mutateAsync({ verificationId });
        }}
        onReject={async (verificationId, reason) => {
          await rejectMutation.mutateAsync({ verificationId, reason });
        }}
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'emerald' | 'amber';
}) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
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
