'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Download,
  Plus,
  Activity,
  AlertCircle,
  Users,
  TrendingUp,
  RotateCcw,
} from 'lucide-react';
import { useAuditLogs, useAuditStats } from '@/lib/query/hooks/use-audit-logs';
import {
  AuditLogFilters,
  type AuditLogFilterState,
} from '@/components/admin/AuditLogFilters';
import { AuditLogList } from '@/components/admin/AuditLogList';
import { AuditLogDetailModal } from '@/components/admin/AuditLogDetailModal';
import type { AuditLog } from '@/types';
import toast from 'react-hot-toast';

export default function AuditLogsPage() {
  const [filters, setFilters] = useState<AuditLogFilterState>({
    page: 1,
    limit: 10,
    search: '',
    action: '',
    startDate: '',
    performedBy: '',
  });

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data: logs, isLoading, refetch } = useAuditLogs(filters);
  const { data: stats } = useAuditStats();

  const handleClearFilters = () => {
    setFilters({
      page: 1,
      limit: 10,
      search: '',
      action: '',
      startDate: '',
      performedBy: '',
    });
  };

  const handleExportCSV = () => {
    if (!logs?.data || logs.data.length === 0) {
      toast.error('No logs available to export');
      return;
    }

    const headers = [
      'Action',
      'Entity',
      'Entity ID',
      'User ID',
      'IP Address',
      'Date',
    ];
    const csvContent = [
      headers.join(','),
      ...logs.data.map((log) =>
        [
          log.action,
          log.entity,
          log.entityId,
          log.userId,
          log.ipAddress || 'Internal',
          log.createdAt,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `audit-logs-${new Date().toISOString().split('T')[0]}.csv`,
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Audit logs exported successfully');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/5 text-blue-400 rounded-3xl flex items-center justify-center border border-white/10 shadow-lg">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              System Audit Logs
            </h1>
            <p className="text-blue-200/60 mt-1">
              Track all system activities and security events across the
              protocol.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all group"
            title="Refresh Logs"
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Events"
          value={String(stats?.totalLogs ?? '1,284')}
          trend="+12%"
          icon={<Activity size={24} />}
          color="blue"
        />
        <StatCard
          title="Alerts (24h)"
          value={String(stats?.errorLogs ?? '3')}
          trend="Critical"
          icon={<AlertCircle size={24} />}
          color="rose"
        />
        <StatCard
          title="Active Admins"
          value="5"
          trend="Online"
          icon={<Users size={24} />}
          color="emerald"
        />
        <StatCard
          title="Daily Activity"
          value={String(stats?.dailyAverage ?? '156')}
          trend="Stable"
          icon={<TrendingUp size={24} />}
          color="purple"
        />
      </div>

      {/* Filters */}
      <AuditLogFilters
        filters={filters}
        setFilters={setFilters}
        onClear={handleClearFilters}
      />

      {/* Table */}
      <AuditLogList
        logs={logs}
        isLoading={isLoading}
        onViewDetails={setSelectedLog}
        page={filters.page}
        setPage={(page) => setFilters({ ...filters, page })}
      />

      {/* Detail Modal */}
      <AuditLogDetailModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  trend,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  trend: string;
  icon: React.ReactNode;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
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
          {trend}
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
