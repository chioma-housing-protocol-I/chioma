'use client';

import { format } from 'date-fns';
import { useDateFnsLocale } from '@/lib/utils/date-fns-locale';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { getIndexedTransactionExplorerUrl } from '@/lib/indexed-transactions';
import type { IndexedTransaction, PaginatedResponse } from '@/types';
import { IndexedTransactionStatus } from './IndexedTransactionStatus';

interface IndexedTransactionListProps {
  transactions?: PaginatedResponse<IndexedTransaction>;
  isLoading: boolean;
  selectedId: string | null;
  page: number;
  onSelect: (id: string) => void;
  onPageChange: (page: number) => void;
}

export function IndexedTransactionList({
  transactions,
  isLoading,
  selectedId,
  page,
  onSelect,
  onPageChange,
}: IndexedTransactionListProps) {
  const dateFnsLocale = useDateFnsLocale();
  const rows = transactions?.data ?? [];
  const totalPages = Math.max(transactions?.totalPages ?? 1, 1);

  if (isLoading && rows.length === 0) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div className="flex h-72 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-cyan-300" />
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Indexed transaction feed
          </h2>
          <p className="mt-1 text-sm text-blue-100/55">
            Open a row to inspect chain metadata, retry state, and exported
            index data.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-slate-950/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-100/55">
          {transactions?.total ?? rows.length} total
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-slate-950/35 text-[11px] uppercase tracking-[0.25em] text-blue-100/45">
            <tr>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Transaction</th>
              <th className="px-6 py-4">Source</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Indexed</th>
              <th className="px-6 py-4">Retries</th>
              <th className="px-6 py-4 text-right">Explorer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((transaction) => {
              const isSelected = selectedId === transaction.id;

              return (
                <tr
                  key={transaction.id}
                  onClick={() => onSelect(transaction.id)}
                  className={`cursor-pointer transition ${
                    isSelected ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  <td className="px-6 py-4">
                    <IndexedTransactionStatus
                      status={transaction.indexingStatus}
                      confirmation={transaction.blockchainConfirmation}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold uppercase tracking-[0.14em] text-white">
                      {transaction.transactionType.replace(/_/g, ' ')}
                    </div>
                    <div className="mt-1 max-w-[16rem] truncate font-mono text-xs text-blue-100/55">
                      {transaction.transactionHash}
                    </div>
                    <div className="mt-1 text-xs text-blue-100/40">
                      Ledger {transaction.ledger}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-[15rem] truncate text-white">
                      {transaction.sourceAccount}
                    </div>
                    <div className="mt-1 max-w-[15rem] truncate text-xs text-blue-100/40">
                      {transaction.destinationAccount ??
                        'No destination recorded'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-white">
                      {transaction.amount} {transaction.assetCode}
                    </div>
                    <div className="mt-1 text-xs text-blue-100/40">
                      Fee {transaction.fee}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-blue-100/75">
                    {transaction.indexedAt
                      ? format(
                          new Date(transaction.indexedAt),
                          'MMM d, yyyy HH:mm',
                          { locale: dateFnsLocale },
                        )
                      : 'Awaiting index'}
                  </td>
                  <td className="px-6 py-4 text-white">
                    {transaction.retryCount}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <a
                      href={getIndexedTransactionExplorerUrl(transaction)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/15"
                      title="Open Stellar Explorer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <p className="text-base font-semibold text-white">
                    No indexed transactions matched these filters.
                  </p>
                  <p className="mt-2 text-sm text-blue-100/50">
                    Try widening the date range or clearing the status filter.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
        <p className="text-xs text-blue-100/50">
          Page <span className="font-semibold text-white">{page}</span> of{' '}
          <span className="font-semibold text-white">{totalPages}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="inline-flex rounded-xl border border-white/10 p-2 text-blue-100/75 transition hover:border-white/20 hover:bg-white/5 hover:text-white disabled:pointer-events-none disabled:opacity-35"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="inline-flex rounded-xl border border-white/10 p-2 text-blue-100/75 transition hover:border-white/20 hover:bg-white/5 hover:text-white disabled:pointer-events-none disabled:opacity-35"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
