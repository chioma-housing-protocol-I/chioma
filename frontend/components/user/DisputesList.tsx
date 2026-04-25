'use client';

import React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import Link from 'next/link';
import { Search, Filter, Loader2, Eye, Flag } from 'lucide-react';
import { DisputeStatus } from '@/lib/dashboard-data';
import {
  useTenantDisputes,
  TenantDisputeRecord,
} from '@/lib/query/hooks/use-tenant-disputes';
import { formatDistanceToNow } from 'date-fns';

const statusBadge: Record<DisputeStatus, string> = {
  OPEN: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  UNDER_REVIEW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  RESOLVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  REJECTED: 'bg-red-500/10 text-red-400 border-red-500/20',
  WITHDRAWN: 'bg-white/5 text-blue-300/40 border-white/10',
};

const DISPUTE_PREVIEW_FALLBACK =
  'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=80&q=80';

interface DisputesListProps {
  className?: string;
}

export function DisputesList({ className = '' }: DisputesListProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [statusFilter, setStatusFilter] = React.useState<DisputeStatus | 'ALL'>(
    'ALL',
  );
  const [globalFilter, setGlobalFilter] = React.useState('');

  const {
    data: disputes = [],
    isLoading,
    error,
  } = useTenantDisputes({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    search: globalFilter,
  });

  const columns = React.useMemo<ColumnDef<TenantDisputeRecord>[]>(
    () => [
      {
        accessorKey: 'disputeId',
        header: 'Dispute ID',
        cell: ({ row }) => (
          <span className="font-mono text-sm font-bold text-white">
            {row.getValue('disputeId')}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.getValue('status') as DisputeStatus;
          return (
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusBadge[status] ?? 'bg-white/5 text-blue-300/40 border-white/10'}`}
            >
              {status.replace('_', ' ')}
            </span>
          );
        },
      },
      {
        accessorKey: 'propertyName',
        header: 'Property',
        cell: ({ row }) => (
          <span className="font-medium text-white">
            {row.getValue('propertyName')}
          </span>
        ),
      },
      {
        accessorKey: 'disputeType',
        header: 'Type',
        cell: ({ row }) => (
          <span className="text-xs uppercase tracking-wider text-blue-200/50">
            {row.getValue('disputeType')}
          </span>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Summary',
        cell: ({ row }) => (
          <div
            className="max-w-xs truncate text-blue-200/60 text-sm"
            title={row.getValue('description')}
          >
            {row.getValue('description')}
          </div>
        ),
      },
      {
        accessorKey: 'requestedAmount',
        header: 'Amount',
        cell: ({ row }) => {
          const amount = row.getValue('requestedAmount') as number | undefined;
          return amount ? (
            <span className="font-mono font-bold text-emerald-400">
              ${amount.toLocaleString()} USDC
            </span>
          ) : (
            <span className="text-blue-300/30">—</span>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => (
          <span className="text-blue-200/50 text-sm">
            {formatDistanceToNow(new Date(row.getValue('createdAt')), {
              addSuffix: true,
            })}
          </span>
        ),
        sortingFn: 'datetime',
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <Link
            href={`/user/disputes/${row.original.id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-blue-300/70 hover:text-white hover:bg-blue-500/20 transition-colors"
            aria-label={`Preview dispute ${row.original.disputeId}`}
          >
            <span className="relative h-6 w-6 overflow-hidden rounded-md border border-white/10 bg-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={DISPUTE_PREVIEW_FALLBACK}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </span>
            <Eye className="h-4 w-4" />
          </Link>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: disputes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters, globalFilter },
  });

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-10 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-white mb-1">
          Failed to load disputes
        </h3>
        <p className="text-blue-200/50 text-sm mb-4">
          There was an issue fetching your disputes.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/40" />
            <input
              placeholder="Search disputes..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as DisputeStatus | 'ALL')
            }
            className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none cursor-pointer"
          >
            <option value="ALL" className="bg-slate-900">
              All Statuses
            </option>
            <option value="OPEN" className="bg-slate-900">
              Open
            </option>
            <option value="UNDER_REVIEW" className="bg-slate-900">
              Under Review
            </option>
            <option value="RESOLVED" className="bg-slate-900">
              Resolved
            </option>
            <option value="REJECTED" className="bg-slate-900">
              Rejected
            </option>
            <option value="WITHDRAWN" className="bg-slate-900">
              Withdrawn
            </option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-blue-200/40">
          <Filter className="w-4 h-4" />
          <span>
            {disputes.length} dispute{disputes.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            <span className="text-blue-200/50">Loading your disputes...</span>
          </div>
        ) : disputes.length === 0 ? (
          <div className="p-16 text-center">
            <Flag className="w-12 h-12 text-blue-300/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-1">
              No disputes yet
            </h3>
            <p className="text-blue-200/40 text-sm">
              All your rental agreements are running smoothly.
            </p>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-white/5">
              <h3 className="text-base font-bold text-white">Your Disputes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr>
                    {table.getHeaderGroups().map((hg) =>
                      hg.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-6 py-4 text-left text-xs font-bold text-blue-300/40 uppercase tracking-widest"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </th>
                      )),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-white/5 transition-colors"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-6 py-4">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="px-6 py-10 text-center text-blue-200/40"
                      >
                        No results.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-white/5 border-t border-white/5 flex items-center justify-between">
              <span className="text-sm text-blue-200/40">
                Page {table.getState().pagination.pageIndex + 1} of{' '}
                {table.getPageCount()}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
