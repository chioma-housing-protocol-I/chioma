'use client';

import { useMemo, useState } from 'react';
import { Blocks, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  buildIndexedTransactionsCsv,
  deriveIndexedTransactionStatsFromTransactions,
} from '@/lib/indexed-transactions';
import {
  useIndexedTransaction,
  useIndexedTransactions,
  useIndexedTransactionStats,
} from '@/lib/query/hooks';
import {
  IndexedTransactionFilters,
  type IndexedTransactionFiltersValue,
} from '@/components/admin/IndexedTransactionFilters';
import { IndexedTransactionList } from '@/components/admin/IndexedTransactionList';
import { IndexedTransactionStats } from '@/components/admin/IndexedTransactionStats';
import { IndexedTransactionDetail } from '@/components/admin/IndexedTransactionDetail';
import { FeatureBoundary } from '@/components/error/FeatureBoundary';

const DEFAULT_FILTERS: IndexedTransactionFiltersValue = {
  page: 1,
  limit: 20,
  search: '',
  status: '',
  startDate: '',
  endDate: '',
};

export default function IndexedTransactionsPage() {
  const [filters, setFilters] =
    useState<IndexedTransactionFiltersValue>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const listParams = useMemo(
    () => ({
      ...filters,
      status: filters.status || undefined,
    }),
    [filters],
  );

  const indexedTransactionsQuery = useIndexedTransactions(listParams);
  const indexedStatsQuery = useIndexedTransactionStats();
  const transactions = indexedTransactionsQuery.data;
  const visibleTransactions = transactions?.data ?? [];
  const selectedTransactionQuery = useIndexedTransaction(selectedId);
  const selectedFromList =
    visibleTransactions.find((transaction) => transaction.id === selectedId) ??
    undefined;
  const selectedTransaction =
    selectedTransactionQuery.data ?? selectedFromList ?? undefined;
  const effectiveStats =
    indexedStatsQuery.data ??
    deriveIndexedTransactionStatsFromTransactions(visibleTransactions);

  const hasFilters = Object.entries(filters).some(
    ([key, value]) => key !== 'page' && key !== 'limit' && value !== '',
  );

  const isRefreshing =
    indexedTransactionsQuery.isRefetching ||
    indexedStatsQuery.isRefetching ||
    selectedTransactionQuery.isRefetching;

  const handleFilterChange = (
    field: keyof Omit<IndexedTransactionFiltersValue, 'page' | 'limit'>,
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
      toast.error('No indexed transactions available to export');
      return;
    }

    const csv = buildIndexedTransactionsCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `indexed-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Indexed transactions exported');
  };

  const handleRefresh = async () => {
    await Promise.allSettled([
      indexedTransactionsQuery.refetch(),
      indexedStatsQuery.refetch(),
      selectedId ? selectedTransactionQuery.refetch() : Promise.resolve(),
    ]);

    toast.success('Indexed transaction feed refreshed');
  };

  return (
    <div className="min-h-full space-y-8 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.16),_transparent_28%),linear-gradient(160deg,_rgba(2,6,23,0.98),_rgba(15,23,42,0.96))] p-4 sm:p-6 lg:p-8">
      <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-3 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100">
              <Blocks className="h-4 w-4" />
              Indexing transparency
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Indexed Transaction Viewer
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100/65 sm:text-base">
              Audit what the indexer has captured, verify confirmation status,
              inspect indexed payloads, and export transaction evidence for
              debugging.
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
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/35 hover:bg-cyan-300/15"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </section>

      <IndexedTransactionStats
        stats={effectiveStats}
        isLoading={indexedStatsQuery.isLoading && !indexedStatsQuery.data}
      />

      <IndexedTransactionFilters
        filters={filters}
        hasFilters={hasFilters}
        resultCount={visibleTransactions.length}
        onChange={handleFilterChange}
        onClear={() => setFilters(DEFAULT_FILTERS)}
      />

      <FeatureBoundary
        name="admin:indexed-transactions-table"
        label="Transaction table"
      >
        <IndexedTransactionList
          transactions={transactions}
          isLoading={
            indexedTransactionsQuery.isLoading && !indexedTransactionsQuery.data
          }
          selectedId={selectedId}
          page={filters.page}
          onSelect={(id) => {
            setSelectedId(id);
            setIsDetailOpen(true);
          }}
          onPageChange={(page) =>
            setFilters((current) => ({
              ...current,
              page,
            }))
          }
        />
      </FeatureBoundary>

      <IndexedTransactionDetail
        transaction={selectedTransaction}
        isLoading={
          selectedTransactionQuery.isLoading && !selectedTransactionQuery.data
        }
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onRefresh={() => void selectedTransactionQuery.refetch()}
      />
    </div>
  );
}
