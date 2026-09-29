'use client';

import React, { useMemo, useState } from 'react';
import {
  CalendarRange,
  Download,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuditLogs } from '@/lib/query/hooks/use-audit-logs';
import { SortableHeader } from '@/components/admin/SortableHeader';
import { FeatureBoundary } from '@/components/error/FeatureBoundary';
import type { AuditLog } from '@/types';

type AuditSortField =
  'performedAt' | 'action' | 'entityType' | 'status' | 'level';

type AuditFilters = {
  page: number;
  limit: number;
  search: string;
  action: string;
  performedBy: string;
  entityType: string;
  status: string;
  level: string;
  startDate: string;
  endDate: string;
  sortBy: AuditSortField;
  sortOrder: 'ASC' | 'DESC';
};

const DEFAULT_FILTERS: AuditFilters = {
  page: 1,
  limit: 15,
  search: '',
  action: '',
  performedBy: '',
  entityType: '',
  status: '',
  level: '',
  startDate: '',
  endDate: '',
  sortBy: 'performedAt',
  sortOrder: 'DESC',
};

const levelStyles: Record<string, string> = {
  INFO: 'border-blue-400/30 bg-blue-500/10 text-blue-100',
  WARN: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
  ERROR: 'border-rose-400/30 bg-rose-500/10 text-rose-100',
  SECURITY: 'border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100',
};

const statusStyles: Record<string, string> = {
  SUCCESS: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
  FAILURE: 'border-rose-400/30 bg-rose-500/10 text-rose-100',
};

export default function AuditLogsPage() {
  const [filters, setFilters] = useState<AuditFilters>(DEFAULT_FILTERS);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const query = useAuditLogs({
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
    action: filters.action,
    performedBy: filters.performedBy,
    entityType: filters.entityType,
    status: filters.status,
    level: filters.level,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

  const handleSort = (key: AuditSortField) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      sortBy: key,
      sortOrder:
        prev.sortBy === key && prev.sortOrder === 'ASC' ? 'DESC' : 'ASC',
    }));
  };

  const rows = useMemo(() => query.data?.data ?? [], [query.data?.data]);
  const metrics = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.total += 1;
        if (row.status === 'FAILURE') acc.failures += 1;
        if (row.level === 'SECURITY') acc.security += 1;
        if (row.performedBy || row.user?.email) acc.withActor += 1;
        return acc;
      },
      { total: 0, failures: 0, security: 0, withActor: 0 },
    );
  }, [rows]);

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (
      key === 'page' ||
      key === 'limit' ||
      key === 'sortBy' ||
      key === 'sortOrder'
    ) {
      return false;
    }
    return value !== '';
  });

  const exportCsv = () => {
    if (rows.length === 0) {
      toast.error('There are no rows to export right now');
      return;
    }

    const header = [
      'id',
      'performed_at',
      'action',
      'entity_type',
      'entity_id',
      'actor',
      'status',
      'level',
      'ip_address',
      'user_agent',
    ];

    const csvRows = rows.map((row) =>
      [
        row.id,
        row.performedAt,
        row.action,
        row.entityType ?? '',
        row.entityId ?? '',
        row.user?.email ?? row.performedBy ?? '',
        row.status ?? '',
        row.level ?? '',
        row.ipAddress ?? '',
        row.userAgent ?? '',
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(','),
    );

    const blob = new Blob([[header.join(','), ...csvRows].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Audit log export started');
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-blue-300">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Audit Logs Viewer
            </h1>
            <p className="text-sm text-blue-200/60">
              Search, filter, inspect, and export audit activity across the
              platform.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-2xl border border-blue-400/25 bg-blue-500/10 px-4 py-3 text-sm font-medium text-blue-100 transition hover:bg-blue-500/20"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard
          label="Rows on page"
          value={metrics.total}
          icon={<Filter className="h-5 w-5" />}
          tone="blue"
        />
        <MetricCard
          label="Failures"
          value={metrics.failures}
          icon={<TriangleAlert className="h-5 w-5" />}
          tone="rose"
        />
        <MetricCard
          label="Security events"
          value={metrics.security}
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="violet"
        />
        <MetricCard
          label="Logs with actor"
          value={metrics.withActor}
          icon={<CalendarRange className="h-5 w-5" />}
          tone="emerald"
        />
      </div>

      <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Filters</h2>
            <p className="text-sm text-blue-200/55">
              Narrow by actor, action, date window, status, and severity.
            </p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="text-sm font-medium text-blue-200 transition hover:text-white"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <label className="relative block lg:col-span-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300/40" />
            <input
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 py-3 pl-11 pr-4 text-sm text-white outline-none"
              placeholder="Search by action, actor, entity ID, or IP address"
              value={filters.search}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  page: 1,
                  search: event.target.value,
                }))
              }
            />
          </label>

          <input
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
            placeholder="Actor email or ID"
            value={filters.performedBy}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                page: 1,
                performedBy: event.target.value,
              }))
            }
          />

          <input
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
            placeholder="Action"
            value={filters.action}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                page: 1,
                action: event.target.value,
              }))
            }
          />

          <input
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
            placeholder="Entity type"
            value={filters.entityType}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                page: 1,
                entityType: event.target.value,
              }))
            }
          />

          <select
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
            value={filters.status}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                page: 1,
                status: event.target.value,
              }))
            }
          >
            <option value="">All statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILURE">Failure</option>
          </select>

          <select
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
            value={filters.level}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                page: 1,
                level: event.target.value,
              }))
            }
          >
            <option value="">All levels</option>
            <option value="INFO">Info</option>
            <option value="WARN">Warn</option>
            <option value="ERROR">Error</option>
            <option value="SECURITY">Security</option>
          </select>

          <input
            type="date"
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
            value={filters.startDate}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                page: 1,
                startDate: event.target.value,
              }))
            }
          />

          <input
            type="date"
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
            value={filters.endDate}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                page: 1,
                endDate: event.target.value,
              }))
            }
          />

          <select
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
            value={String(filters.limit)}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                page: 1,
                limit: Number(event.target.value),
              }))
            }
          >
            <option value="15">15 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
          </select>
        </div>
      </div>

      <FeatureBoundary name="admin:audit-log-table" label="Audit log table">
        <div className="overflow-x-auto rounded-3xl border border-white/10 bg-white/5">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.16em] text-blue-200/60">
              <tr>
                <SortableHeader
                  label="Time"
                  sortKey="performedAt"
                  currentSortBy={filters.sortBy}
                  currentSortOrder={filters.sortOrder}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Action"
                  sortKey="action"
                  currentSortBy={filters.sortBy}
                  currentSortOrder={filters.sortOrder}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Entity"
                  sortKey="entityType"
                  currentSortBy={filters.sortBy}
                  currentSortOrder={filters.sortOrder}
                  onSort={handleSort}
                />
                <th className="px-5 py-4">Actor</th>
                <SortableHeader
                  label="Status"
                  sortKey="status"
                  currentSortBy={filters.sortBy}
                  currentSortOrder={filters.sortOrder}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Level"
                  sortKey="level"
                  currentSortBy={filters.sortBy}
                  currentSortOrder={filters.sortOrder}
                  onSort={handleSort}
                />
                <th className="px-5 py-4">IP address</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-blue-200/65"
                  >
                    Loading audit logs...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-blue-200/65"
                  >
                    No audit logs matched the current filter set.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-white/5 last:border-b-0 hover:bg-white/[0.03]"
                    onClick={() => setSelectedLog(row)}
                  >
                    <td className="px-5 py-4 text-blue-100/85">
                      {new Date(row.performedAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 font-medium text-white">
                      {row.action}
                    </td>
                    <td className="px-5 py-4 text-blue-100/80">
                      {row.entityType ?? 'Unknown'}
                      <span className="mt-1 block text-xs text-blue-300/45">
                        {row.entityId ?? 'No entity ID'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-blue-100/80">
                      {row.user?.email ?? row.performedBy ?? 'System'}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        value={row.status ?? 'UNKNOWN'}
                        styles={statusStyles}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        value={row.level ?? 'UNSPECIFIED'}
                        styles={levelStyles}
                      />
                    </td>
                    <td className="px-5 py-4 text-blue-100/80">
                      {row.ipAddress ?? 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </FeatureBoundary>

      <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-blue-200/65">
          Page {query.data?.page ?? filters.page} of{' '}
          {Math.max(query.data?.totalPages ?? 1, 1)} • {query.data?.total ?? 0}{' '}
          total logs
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={filters.page <= 1}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                page: Math.max(prev.page - 1, 1),
              }))
            }
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={filters.page >= Math.max(query.data?.totalPages ?? 1, 1)}
            onClick={() =>
              setFilters((prev) => ({ ...prev, page: prev.page + 1 }))
            }
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {selectedLog && (
        <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Audit Log Detail
              </h2>
              <p className="mt-1 text-sm text-blue-200/60">
                {selectedLog.action} •{' '}
                {new Date(selectedLog.performedAt).toLocaleString()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedLog(null)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Close
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DetailPanel
              label="Actor"
              value={
                selectedLog.user?.email ?? selectedLog.performedBy ?? 'System'
              }
            />
            <DetailPanel
              label="Entity"
              value={`${selectedLog.entityType ?? 'Unknown'} • ${selectedLog.entityId ?? 'No entity ID'}`}
            />
            <DetailPanel
              label="IP address"
              value={selectedLog.ipAddress ?? 'Not captured'}
            />
            <DetailPanel
              label="User agent"
              value={selectedLog.userAgent ?? 'Not captured'}
              multiline
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <JsonCard label="Previous values" value={selectedLog.oldValues} />
            <JsonCard label="New values" value={selectedLog.newValues} />
            <JsonCard label="Metadata" value={selectedLog.metadata} />
          </div>
        </div>
      )}
    </section>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: 'blue' | 'rose' | 'violet' | 'emerald';
}) {
  const toneMap = {
    blue: 'border-blue-400/20 bg-blue-500/10 text-blue-100',
    rose: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
    violet: 'border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-100',
    emerald: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${toneMap[tone]}`}
      >
        {icon}
      </div>
      <p className="mt-4 text-xs uppercase tracking-[0.16em] text-blue-200/45">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function Badge({
  value,
  styles,
}: {
  value: string;
  styles: Record<string, string>;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
        styles[value] ?? 'border-white/10 bg-white/5 text-blue-100'
      }`}
    >
      {value.replace(/_/g, ' ')}
    </span>
  );
}

function DetailPanel({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-blue-200/45">
        {label}
      </p>
      <p className={`mt-2 text-sm text-white ${multiline ? 'break-all' : ''}`}>
        {value}
      </p>
    </div>
  );
}

function JsonCard({
  label,
  value,
}: {
  label: string;
  value?: Record<string, unknown>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-blue-200/45">
        {label}
      </p>
      <pre className="mt-3 max-h-72 overflow-auto rounded-2xl bg-black/30 p-3 text-xs text-blue-100/90">
        {value ? JSON.stringify(value, null, 2) : 'No data captured'}
      </pre>
    </div>
  );
}
