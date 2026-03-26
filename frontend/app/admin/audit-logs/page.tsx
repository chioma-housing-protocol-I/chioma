'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/store/authStore';

type AuditStatus = 'SUCCESS' | 'FAILURE';
type AuditLevel = 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';

interface AuditRow {
  id: number;
  action: string;
  entity_type?: string;
  entity_id?: string;
  performed_at: string;
  performed_by?: string;
  ip_address?: string;
  user_agent?: string;
  status?: AuditStatus;
  level?: AuditLevel;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  error_message?: string;
  performed_by_user?: {
    email?: string;
  };
}

interface AuditQueryResponse {
  data: AuditRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const defaultFilters = {
  action: '',
  status: '',
  level: '',
  entityType: '',
  search: '',
};

export default function LandlordsAuditLogsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditRow | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState(defaultFilters);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '25');

    if (filters.action) params.set('action', filters.action);
    if (filters.status) params.set('status', filters.status);
    if (filters.level) params.set('level', filters.level);
    if (filters.entityType) params.set('entityType', filters.entityType);
    if (filters.search) params.set('search', filters.search);

    return params.toString();
  }, [filters, page]);

  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') {
      router.replace('/landlords');
    }
  }, [authLoading, user?.role, router]);

  useEffect(() => {
    if (authLoading || user?.role !== 'admin') {
      return;
    }

    let cancelled = false;

    async function fetchAuditLogs() {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.get<AuditQueryResponse>(
          `/audit?${queryString}`,
        );

        if (!cancelled) {
          setRows(response.data.data || []);
          setTotalPages(Math.max(response.data.totalPages || 1, 1));
        }
      } catch {
        if (!cancelled) {
          setRows([]);
          setError('Failed to load audit logs. Please retry.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchAuditLogs();

    return () => {
      cancelled = true;
    };
  }, [queryString, authLoading, user?.role]);

  if (authLoading) {
    return (
      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Audit Logs
        </h2>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-blue-200/80">
          Verifying access...
        </div>
      </section>
    );
  }

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Audit Logs
        </h2>
        <p className="text-sm text-blue-200/70">
          Filter and inspect sensitive activity across the platform.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-5">
        <input
          className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none"
          placeholder="Search"
          value={filters.search}
          onChange={(e) => {
            setPage(1);
            setFilters((prev) => ({ ...prev, search: e.target.value }));
          }}
        />
        <input
          className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none"
          placeholder="Action (e.g. KYC_SUBMITTED)"
          value={filters.action}
          onChange={(e) => {
            setPage(1);
            setFilters((prev) => ({ ...prev, action: e.target.value }));
          }}
        />
        <select
          className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none"
          value={filters.status}
          onChange={(e) => {
            setPage(1);
            setFilters((prev) => ({ ...prev, status: e.target.value }));
          }}
        >
          <option value="">All status</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILURE">FAILURE</option>
        </select>
        <select
          className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none"
          value={filters.level}
          onChange={(e) => {
            setPage(1);
            setFilters((prev) => ({ ...prev, level: e.target.value }));
          }}
        >
          <option value="">All levels</option>
          <option value="INFO">INFO</option>
          <option value="WARN">WARN</option>
          <option value="ERROR">ERROR</option>
          <option value="SECURITY">SECURITY</option>
        </select>
        <input
          className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none"
          placeholder="Entity type"
          value={filters.entityType}
          onChange={(e) => {
            setPage(1);
            setFilters((prev) => ({ ...prev, entityType: e.target.value }));
          }}
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-blue-200/70">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-b border-white/5 hover:bg-white/5"
                  onClick={() => setSelected(row)}
                >
                  <td className="px-4 py-3 text-blue-100/90">
                    {new Date(row.performed_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-white">
                    {row.action}
                  </td>
                  <td className="px-4 py-3 text-blue-200/80">
                    {row.entity_type || '-'}
                    {row.entity_id ? ` (${row.entity_id})` : ''}
                  </td>
                  <td className="px-4 py-3 text-blue-200/80">
                    {row.performed_by_user?.email || row.performed_by || '-'}
                  </td>
                  <td className="px-4 py-3 text-blue-200/80">
                    {row.status || '-'}
                  </td>
                  <td className="px-4 py-3 text-blue-200/80">
                    {row.level || '-'}
                  </td>
                  <td className="px-4 py-3 text-blue-200/80">
                    {row.ip_address || '-'}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Audit Detail</h3>
            <button
              type="button"
              className="text-sm text-blue-300 hover:text-blue-200"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
          <pre className="max-h-80 overflow-auto rounded-xl bg-black/30 p-3 text-xs text-blue-100/90">
            {JSON.stringify(selected, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
}
