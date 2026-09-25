'use client';

import { format } from 'date-fns';
import { useDateFnsLocale } from '@/lib/utils/date-fns-locale';
import { ExternalLink, RefreshCw, X } from 'lucide-react';
import { getIndexedTransactionExplorerUrl } from '@/lib/indexed-transactions';
import type { IndexedTransaction } from '@/types';
import { IndexedTransactionStatus } from './IndexedTransactionStatus';

interface IndexedTransactionDetailProps {
  transaction?: IndexedTransaction;
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function IndexedTransactionDetail({
  transaction,
  isLoading,
  isOpen,
  onClose,
  onRefresh,
}: IndexedTransactionDetailProps) {
  const dateFnsLocale = useDateFnsLocale();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/95 shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Indexed transaction detail
            </h2>
            <p className="mt-1 text-sm text-blue-100/55">
              Inspect the indexed payload, confirmation state, and retry trail.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-blue-100/80 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex rounded-full border border-white/10 p-2 text-blue-100/75 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(90vh-88px)] overflow-y-auto p-6">
          {!transaction && isLoading ? (
            <div className="space-y-4">
              <div className="h-8 w-48 animate-pulse rounded-xl bg-white/10" />
              <div className="h-28 animate-pulse rounded-3xl bg-white/10" />
              <div className="h-48 animate-pulse rounded-3xl bg-white/10" />
            </div>
          ) : !transaction ? (
            <div className="rounded-[1.75rem] border border-dashed border-white/15 bg-white/5 p-6 text-sm text-blue-100/60">
              Transaction detail is unavailable for this selection.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-100/45">
                    Transaction ID
                  </p>
                  <p className="mt-2 break-all font-mono text-sm text-white">
                    {transaction.id}
                  </p>
                  <p className="mt-2 break-all font-mono text-sm text-blue-100/60">
                    {transaction.transactionHash}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-3">
                  <IndexedTransactionStatus
                    status={transaction.indexingStatus}
                    confirmation={transaction.blockchainConfirmation}
                  />
                  <a
                    href={getIndexedTransactionExplorerUrl(transaction)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/15"
                  >
                    View on Explorer
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <DetailItem
                  label="Transaction type"
                  value={transaction.transactionType.replace(/_/g, ' ')}
                />
                <DetailItem
                  label="Indexed at"
                  value={
                    transaction.indexedAt
                      ? format(new Date(transaction.indexedAt), 'PPP p', {
                          locale: dateFnsLocale,
                        })
                      : 'Awaiting index'
                  }
                />
                <DetailItem
                  label="Blockchain confirmation"
                  value={transaction.blockchainConfirmation}
                />
                <DetailItem
                  label="Block number"
                  value={String(transaction.blockNumber)}
                />
                <DetailItem
                  label="Ledger close time"
                  value={format(
                    new Date(transaction.ledgerCloseTime),
                    'PPP p',
                    { locale: dateFnsLocale },
                  )}
                />
                <DetailItem
                  label="Retry count"
                  value={String(transaction.retryCount)}
                />
                <DetailItem
                  label="Amount"
                  value={`${transaction.amount} ${transaction.assetCode}`}
                />
                <DetailItem label="Fee" value={transaction.fee} />
                <DetailItem
                  label="Data indexed"
                  value={`${transaction.dataIndexed} record${transaction.dataIndexed === 1 ? '' : 's'}`}
                />
                <DetailItem
                  label="Source account"
                  value={transaction.sourceAccount}
                  mono
                />
                <DetailItem
                  label="Destination account"
                  value={transaction.destinationAccount ?? 'Not recorded'}
                  mono
                />
                <DetailItem label="Memo" value={transaction.memo ?? 'None'} />
              </div>

              <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-100/45">
                  Related references
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <DetailItem
                    label="Agreement ID"
                    value={transaction.agreementId ?? 'N/A'}
                    mono
                  />
                  <DetailItem
                    label="Property ID"
                    value={transaction.propertyId ?? 'N/A'}
                    mono
                  />
                  <DetailItem
                    label="Payment ID"
                    value={transaction.paymentId ?? 'N/A'}
                    mono
                  />
                  <DetailItem
                    label="Deposit ID"
                    value={transaction.depositId ?? 'N/A'}
                    mono
                  />
                </div>
              </section>

              <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-100/45">
                  Indexed operations
                </div>
                <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-xs leading-6 text-blue-100/75">
                  {JSON.stringify(transaction.operations ?? [], null, 2)}
                </pre>
              </section>

              <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-100/45">
                  Indexed metadata
                </div>
                <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-xs leading-6 text-blue-100/75">
                  {JSON.stringify(transaction.metadata ?? {}, null, 2)}
                </pre>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-blue-100/40">
        {label}
      </div>
      <div
        className={`mt-2 break-all text-sm text-white ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </div>
    </div>
  );
}
