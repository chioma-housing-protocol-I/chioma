'use client';

import { useMemo, useState } from 'react';
import { Anchor, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  buildAnchorTransactionsCsv,
  deriveAnchorStatsFromTransactions,
} from '@/lib/anchor-transactions';
import {
  useAnchorTransaction,
  useAnchorTransactions,
  useAnchorTransactionStats,
} from '@/lib/query/hooks';
import { AnchorTransactionDetail } from '@/components/admin/AnchorTransactionDetail';
import {
  AnchorTransactionFilters,
  type AnchorTransactionFiltersValue,
} from '@/components/admin/AnchorTransactionFilters';
import { AnchorTransactionList } from '@/components/admin/AnchorTransactionList';
import { AnchorTransactionStats } from '@/components/admin/AnchorTransactionStats';

const DEFAULT_FILTERS: AnchorTransactionFiltersValue = {
  page: 1,
  limit: 20,
  search: '',
  type: '',
  status: '',
  startDate: '',
  endDate: '',
};

export default function AnchorTransactionsPage() {
  const [filters, setFilters] =
    useState<AnchorTransactionFiltersValue>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const listParams = useMemo(
    () => ({
      ...filters,
      type: filters.type || undefined,
      status: filters.status || undefined,
    }),
    [filters],
  );

  const anchorTransactionsQuery = useAnchorTransactions(listParams);
  const anchorStatsQuery = useAnchorTransactionStats();
  const transactions = anchorTransactionsQuery.data;
  const visibleTransactions = transactions?.data ?? [];
  const effectiveSelectedId = visibleTransactions.some(
    (transaction) => transaction.id === selectedId,
  )
    ? selectedId
    : (visibleTransactions[0]?.id ?? null);
  const selectedTransactionQuery = useAnchorTransaction(effectiveSelectedId);
  const selectedFromList =
    visibleTransactions.find(
      (transaction) => transaction.id === effectiveSelectedId,
    ) ?? undefined;
  const selectedTransaction =
    selectedTransactionQuery.data ?? selectedFromList ?? undefined;
  const effectiveStats =
    anchorStatsQuery.data ??
    deriveAnchorStatsFromTransactions(visibleTransactions);

  const hasFilters = Object.entries(filters).some(
    ([key, value]) => key !== 'page' && key !== 'limit' && value !== '',
  );

  const isRefreshing =
    anchorTransactionsQuery.isRefetching ||
    anchorStatsQuery.isRefetching ||
    selectedTransactionQuery.isRefetching;

  const handleFilterChange = (
    field: keyof Omit<AnchorTransactionFiltersValue, 'page' | 'limit'>,
    value: string,
  ) => {
    setFilters((current) => ({
      ...current,
      page: 1,
      [field]: value,
    }));
  };

  const handleExport = () => {
    const rows = transactions?.data ?? [];

    if (rows.length === 0) {
      toast.error('No anchor transactions available to export');
      return;
    }

    const csv = buildAnchorTransactionsCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `anchor-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Anchor transactions exported');
  };

  const handleRefresh = async () => {
    await Promise.allSettled([
      anchorTransactionsQuery.refetch(),
      anchorStatsQuery.refetch(),
      effectiveSelectedId
        ? selectedTransactionQuery.refetch()
        : Promise.resolve(),
    ]);

    toast.success('Anchor transaction feed refreshed');
  };

  return (
    <div className="min-h-full space-y-8 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.16),_transparent_28%),linear-gradient(160deg,_rgba(2,6,23,0.98),_rgba(15,23,42,0.96))] p-4 sm:p-6 lg:p-8">
      <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-3 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-emerald-100">
              <Anchor className="h-4 w-4" />
              Anchor transparency
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Anchor Transaction Control Room
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100/65 sm:text-base">
              Review every deposit and withdrawal flowing through the anchor,
              inspect proof references, and confirm which transactions have
              landed on Stellar. Data refreshes automatically every 15 seconds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/10 bg-slate-950/50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-blue-100/55">
              {isRefreshing ? 'Syncing now' : 'Auto-refresh 15s'}
            </span>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/5"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300/35 hover:bg-emerald-300/15"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </section>

      <AnchorTransactionStats
        stats={effectiveStats}
        isLoading={anchorStatsQuery.isLoading && !anchorStatsQuery.data}
      />

      <AnchorTransactionFilters
        filters={filters}
        hasFilters={hasFilters}
        resultCount={visibleTransactions.length}
        onChange={handleFilterChange}
        onClear={() => setFilters(DEFAULT_FILTERS)}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.95fr)]">
        <AnchorTransactionList
          transactions={transactions}
          isLoading={
            anchorTransactionsQuery.isLoading && !anchorTransactionsQuery.data
          }
          selectedId={effectiveSelectedId}
          page={filters.page}
          onSelect={setSelectedId}
          onPageChange={(page) =>
            setFilters((current) => ({
              ...current,
              page,
            }))
          }
        />

        <AnchorTransactionDetail
          transaction={selectedTransaction}
          isLoading={
            selectedTransactionQuery.isLoading ||
            selectedTransactionQuery.isRefetching
          }
          onRefresh={() => {
            if (effectiveSelectedId) {
              void selectedTransactionQuery.refetch();
            }
          }}
        />
      </div>
    </div>
  );
}
