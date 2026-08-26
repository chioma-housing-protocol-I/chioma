'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useDateFnsLocale } from '@/lib/utils/date-fns-locale';
import { formatCurrency } from '@/lib/utils/format';
import { ArrowRight, CircleDollarSign, Filter, Loader2 } from 'lucide-react';
import type {
  AdminRefundRequestRow,
  AdminRefundStatus,
} from '@/lib/admin-refund-requests';
import { filterByStatus, statusLabel } from '@/lib/admin-refund-requests';

const STATUS_OPTIONS: { value: AdminRefundStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REJECTED', label: 'Rejected' },
];

const STATUS_BADGE: Record<AdminRefundStatus, string> = {
  PENDING: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  APPROVED: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  PROCESSING: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  COMPLETED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  REJECTED: 'bg-red-500/15 text-red-300 border-red-500/30',
};

export interface RefundManagementProps {
  rows: AdminRefundRequestRow[];
  loading?: boolean;
  error?: string | null;
}

export function RefundManagement({
  rows,
  loading,
  error,
}: RefundManagementProps) {
  const [statusFilter, setStatusFilter] = useState<AdminRefundStatus | 'ALL'>(
    'ALL',
  );

  const filtered = useMemo(
    () => filterByStatus(rows, statusFilter),
    [rows, statusFilter],
  );
  const dateFnsLocale = useDateFnsLocale();

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <CircleDollarSign className="text-emerald-400" size={28} />
            Refund management
          </h1>
          <p className="text-blue-200/60 mt-1 text-sm max-w-xl">
            Review refund requests, approve or reject, and track processing
            status.
          </p>
        </div>
        <a
          href="https://t.me/chiomagroup"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-sky-300/90 hover:text-sky-200 underline underline-offset-4"
        >
          Community: Telegram support
        </a>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Filter size={16} />
          <span className="sr-only sm:not-sr-only">Filter by status</span>
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as AdminRefundStatus | 'ALL')
          }
          className="bg-slate-950/80 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 max-w-xs"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-slate-900">
              {o.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500">
          {filtered.length} request{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex justify-center py-20 text-blue-200/80">
            <Loader2 className="animate-spin" size={28} />
          </div>
        ) : error ? (
          <p className="p-8 text-red-400 text-center">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-slate-500 text-center">
            No refund requests match this filter.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-5 py-4 font-semibold">Refund</th>
                  <th className="px-5 py-4 font-semibold hidden md:table-cell">
                    Requester
                  </th>
                  <th className="px-5 py-4 font-semibold">Amount</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold hidden sm:table-cell">
                    Updated
                  </th>
                  <th className="px-5 py-4 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <p className="text-white font-medium">{row.refundId}</p>
                      <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">
                        {row.reasonSummary}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-300 hidden md:table-cell">
                      <span className="text-white">{row.requesterName}</span>
                      <br />
                      <span className="text-slate-500 text-xs">
                        {row.requesterEmail}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-white font-medium whitespace-nowrap">
                      {formatCurrency(row.amount, row.currency)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${STATUS_BADGE[row.status]}`}
                      >
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 hidden sm:table-cell whitespace-nowrap">
                      {format(new Date(row.updatedAt), 'MMM d, yyyy', {
                        locale: dateFnsLocale,
                      })}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/refunds/${row.id}`}
                        className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium"
                      >
                        View
                        <ArrowRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
