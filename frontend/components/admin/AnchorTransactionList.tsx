'use client';

import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import {
  formatAnchorAmount,
  getAnchorProofReference,
  getAnchorTransactionExplorerUrl,
  getAnchorVerificationState,
} from '@/lib/anchor-transactions';
import type { AnchorTransaction, PaginatedResponse } from '@/types';

interface AnchorTransactionListProps {
  transactions?: PaginatedResponse<AnchorTransaction>;
  isLoading: boolean;
  selectedId: string | null;
  page: number;
  onSelect: (id: string) => void;
  onPageChange: (page: number) => void;
}

const TYPE_STYLES = {
  deposit: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
  withdrawal: 'border-violet-400/20 bg-violet-400/10 text-violet-200',
} as const;

const STATUS_STYLES = {
  pending: 'border-blue-400/20 bg-blue-400/10 text-blue-200',
  processing: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
  completed: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  failed: 'border-rose-400/20 bg-rose-400/10 text-rose-200',
  refunded: 'border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200',
} as const;

const VERIFICATION_LABELS = {
  verified: 'Verified',
  processing: 'Awaiting proof',
  pending: 'Pending',
  failed: 'Review',
} as const;

export function AnchorTransactionList({
  transactions,
  isLoading,
  selectedId,
  page,
  onSelect,
  onPageChange,
}: AnchorTransactionListProps) {
  const rows = transactions?.data ?? [];
  const totalPages = Math.max(transactions?.totalPages ?? 1, 1);

  if (isLoading && rows.length === 0) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div className="flex h-72 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-emerald-300" />
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Anchor transaction feed
          </h2>
          <p className="mt-1 text-sm text-blue-100/55">
            Select a row to inspect proof references, wallet details, and raw
            anchor metadata.
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
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Wallet</th>
              <th className="px-6 py-4">Anchor proof</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4 text-right">Network</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((transaction) => {
              const explorerUrl = getAnchorTransactionExplorerUrl(transaction);
              const verificationState = getAnchorVerificationState(transaction);
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
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${TYPE_STYLES[transaction.type]}`}
                    >
                      {transaction.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-white">
                      {formatAnchorAmount(transaction)}
                    </div>
                    <div className="mt-1 text-xs text-blue-100/40">
                      {transaction.paymentMethod ??
                        transaction.destination ??
                        'Anchor flow'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-[15rem] truncate text-white">
                      {transaction.walletAddress}
                    </div>
                    <div className="mt-1 text-xs text-blue-100/40">
                      {transaction.currency}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-[12rem] truncate font-mono text-xs text-blue-100/85">
                      {getAnchorProofReference(transaction) ?? 'Pending'}
                    </div>
                    <div className="mt-1 text-xs text-blue-100/40">
                      {transaction.anchorTransactionId
                        ? 'SEP-24 reference'
                        : 'Local record only'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${STATUS_STYLES[transaction.status]}`}
                    >
                      {transaction.status}
                    </div>
                    <div className="mt-2 text-xs text-blue-100/55">
                      {VERIFICATION_LABELS[verificationState]}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-blue-100/75">
                    {format(
                      new Date(transaction.createdAt),
                      'MMM d, yyyy HH:mm',
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {explorerUrl ? (
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-2 text-emerald-100 transition hover:border-emerald-300/40 hover:bg-emerald-400/15"
                        title="Open Stellar Explorer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="inline-flex rounded-xl border border-white/10 bg-white/5 p-2 text-blue-100/25">
                        <ExternalLink className="h-4 w-4" />
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <p className="text-base font-semibold text-white">
                    No anchor transactions matched these filters.
                  </p>
                  <p className="mt-2 text-sm text-blue-100/50">
                    Try widening the date range or clearing the proof and status
                    filters.
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
