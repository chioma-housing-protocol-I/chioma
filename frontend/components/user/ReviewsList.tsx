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
import { useRouter } from 'next/navigation';
import { Search, Filter, Loader2, Star, Edit3, Trash2 } from 'lucide-react';
import { StarRating } from '@/components/common/StarRating';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  useTenantReviews,
  TenantReviewRecord,
} from '@/lib/query/hooks/use-tenant-reviews';
import { formatDistanceToNow } from 'date-fns';

interface ReviewsListProps {
  className?: string;
}

export function ReviewsList({ className = '' }: ReviewsListProps) {
  const router = useRouter();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [ratingFilter, setRatingFilter] = React.useState<string>('ALL');
  const [globalFilter, setGlobalFilter] = React.useState('');

  const {
    data: reviews = [],
    isLoading,
    error,
  } = useTenantReviews({
    rating: ratingFilter === 'ALL' ? undefined : ratingFilter,
    search: globalFilter,
  });

  const columns = React.useMemo<ColumnDef<TenantReviewRecord>[]>(
    () => [
      {
        accessorKey: 'target',
        header: 'Reviewed',
        cell: ({ row }) => (
          <span className="font-semibold text-white">
            {row.getValue('target')}
          </span>
        ),
      },
      {
        accessorKey: 'propertyName',
        header: 'Property',
        cell: ({ row }) => (
          <span className="text-blue-200/60 text-sm">
            {row.getValue('propertyName')}
          </span>
        ),
      },
      {
        accessorKey: 'rating',
        header: 'Rating',
        cell: ({ row }) => (
          <StarRating value={row.getValue('rating')} readonly />
        ),
        sortingFn: 'alphanumeric',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.getValue('status') as string;
          return (
            <span
              className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                status === 'PUBLISHED'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-white/5 text-blue-300/40 border-white/10'
              }`}
            >
              {status}
            </span>
          );
        },
      },
      {
        accessorKey: 'comment',
        header: 'Review',
        cell: ({ row }) => (
          <div
            className="max-w-xs truncate text-blue-200/60 text-sm"
            title={row.getValue('comment')}
          >
            {row.getValue('comment')}
          </div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Date',
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
          <div className="flex gap-1">
            <Link
              href={`/tenant/reviews/${row.original.id}`}
              className="p-2 text-blue-300/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors inline-flex"
            >
              <Edit3 className="h-4 w-4" />
            </Link>
            <button className="p-2 text-blue-300/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: reviews,
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
          Failed to load reviews
        </h3>
        <p className="text-blue-200/50 text-sm mb-4">
          There was an issue fetching your reviews.
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
              placeholder="Search reviews..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
            />
          </div>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none cursor-pointer"
          >
            <option value="ALL" className="bg-slate-900">
              All Ratings
            </option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={String(n)} className="bg-slate-900">
                {n} Stars
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-blue-200/40">
          <Filter className="w-4 h-4" />
          <span>
            {reviews.length} review{reviews.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            <span className="text-blue-200/50">Loading your reviews...</span>
          </div>
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={Star}
            title="No reviews yet"
            description="Your review history will appear here."
            actionLabel="Write Your First Review"
            onAction={() => router.push('/user/reviews/new')}
            variant="dark"
            className="border-0"
          />
        ) : (
          <>
            <div className="px-6 py-4 border-b border-white/5">
              <h3 className="text-base font-bold text-white">Your Reviews</h3>
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
