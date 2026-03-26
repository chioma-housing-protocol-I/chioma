'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  X,
  RotateCcw,
  UserCheck,
  UserX,
} from 'lucide-react';
import {
  useAdminUsers,
  useSuspendUser,
  useActivateUser,
} from '@/lib/query/hooks/use-admin-users';
import { BulkUserOperations } from '@/components/admin/BulkUserOperations';
import toast from 'react-hot-toast';
import type { User } from '@/types';

interface UserFilters {
  page: number;
  limit: number;
  search: string;
  role: User['role'] | '';
}

const DEFAULT_FILTERS: UserFilters = {
  page: 1,
  limit: 20,
  search: '',
  role: '',
};

export default function AdminUsersPage() {
  const [filters, setFilters] = useState<UserFilters>(DEFAULT_FILTERS);

  const {
    data: users,
    isLoading,
    refetch,
  } = useAdminUsers({
    ...filters,
    role: filters.role || undefined,
  });
  const suspendUser = useSuspendUser();
  const activateUser = useActivateUser();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value, page: 1 }));
  };

  const handleClearFilters = () => setFilters(DEFAULT_FILTERS);

  const hasFilters = filters.search !== '' || filters.role !== '';

  const handleBulkSuspend = async (ids: string[]) => {
    const results = await Promise.allSettled(
      ids.map((id) => suspendUser.mutateAsync(id)),
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed === 0) {
      toast.success(
        `Suspended ${ids.length} user${ids.length !== 1 ? 's' : ''}`,
      );
    } else {
      toast.error(`${failed} suspension${failed !== 1 ? 's' : ''} failed`);
    }
  };

  const handleBulkActivate = async (ids: string[]) => {
    const results = await Promise.allSettled(
      ids.map((id) => activateUser.mutateAsync(id)),
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed === 0) {
      toast.success(
        `Activated ${ids.length} user${ids.length !== 1 ? 's' : ''}`,
      );
    } else {
      toast.error(`${failed} activation${failed !== 1 ? 's' : ''} failed`);
    }
  };

  const handleBulkExport = (ids: string[]) => {
    if (!users?.data) return;
    const selected = users.data.filter((u: User) => ids.includes(u.id));
    const headers = ['ID', 'Name', 'Email', 'Role', 'Verified', 'Joined'];
    const csvContent = [
      headers.join(','),
      ...selected.map((u: User) =>
        [
          u.id,
          `"${(u.name ?? '').replace(/"/g, '""')}"`,
          u.email,
          u.role,
          u.isVerified,
          u.createdAt,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `users-export-${new Date().toISOString().split('T')[0]}.csv`,
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${ids.length} user${ids.length !== 1 ? 's' : ''}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/5 text-blue-400 rounded-3xl flex items-center justify-center border border-white/10 shadow-lg">
            <Users size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              User Management
            </h1>
            <p className="text-blue-200/60 mt-1">
              Select users and apply bulk actions: suspend, activate, or export.
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

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          title="Total Users"
          value={users?.total ?? 0}
          icon={<Users size={24} />}
          color="blue"
        />
        <StatCard
          title="Verified"
          value={users?.data?.filter((u: User) => u.isVerified).length ?? 0}
          icon={<UserCheck size={24} />}
          color="emerald"
        />
        <StatCard
          title="Pending Verification"
          value={users?.data?.filter((u: User) => !u.isVerified).length ?? 0}
          icon={<UserX size={24} />}
          color="amber"
        />
      </div>

      {/* Filters */}
      <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              placeholder="Search by name or email..."
              className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all"
            />
          </div>
          <select
            name="role"
            value={filters.role}
            onChange={handleChange}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 appearance-none transition-all"
          >
            <option value="" className="bg-slate-900">
              All Roles
            </option>
            <option value="admin" className="bg-slate-900">
              Admin
            </option>
            <option value="landlord" className="bg-slate-900">
              Landlord
            </option>
            <option value="tenant" className="bg-slate-900">
              Tenant
            </option>
            <option value="agent" className="bg-slate-900">
              Agent
            </option>
          </select>
        </div>
      </div>

      {/* Bulk user table */}
      <BulkUserOperations
        users={users}
        isLoading={isLoading}
        page={filters.page}
        setPage={(page) => setFilters((prev) => ({ ...prev, page }))}
        onBulkSuspend={handleBulkSuspend}
        onBulkActivate={handleBulkActivate}
        onBulkExport={handleBulkExport}
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
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 flex items-center gap-5 group hover:border-white/20 transition-all duration-300">
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center border flex-shrink-0 transition-transform group-hover:scale-110 ${colorMap[color]}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-blue-200/60 uppercase tracking-wider">
          {title}
        </p>
        <h3 className="text-3xl font-bold tracking-tight text-white mt-0.5">
          {value}
        </h3>
      </div>
    </div>
  );
}
