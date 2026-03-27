'use client';

import { format } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import {
  formatAnchorAmount,
  formatAnchorDuration,
} from '@/lib/anchor-transactions';
import type { AnchorTransaction } from '@/types';
import { AnchorVerification } from './AnchorVerification';

interface AnchorTransactionDetailProps {
  transaction?: AnchorTransaction;
  isLoading: boolean;
  onRefresh: () => void;
}

export function AnchorTransactionDetail({
  transaction,
  isLoading,
  onRefresh,
}: AnchorTransactionDetailProps) {
  if (!transaction && isLoading) {
    return (
      <aside className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div className="space-y-4">
          <div className="h-8 w-48 animate-pulse rounded-xl bg-white/10" />
          <div className="h-28 animate-pulse rounded-3xl bg-white/10" />
          <div className="h-48 animate-pulse rounded-3xl bg-white/10" />
        </div>
      </aside>
    );
  }

  if (!transaction) {
    return (
      <aside className="rounded-[2rem] border border-dashed border-white/15 bg-white/5 p-6 backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-white">Detail view</h2>
        <p className="mt-3 text-sm leading-6 text-blue-100/60">
          Pick an anchor transaction from the list to inspect proof references,
          timestamps, and raw metadata.
        </p>
      </aside>
    );
  }

  const elapsedSeconds = Math.max(
    0,
    Math.round(
      (new Date(transaction.updatedAt).getTime() -
        new Date(transaction.createdAt).getTime()) /
        1000,
    ),
  );

  return (
    <aside className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm xl:sticky xl:top-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Anchor transaction detail
          </h2>
          <p className="mt-1 text-sm text-blue-100/55">
            Local ID {transaction.id}
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-blue-100/80 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <DetailItem label="Type" value={transaction.type} />
        <DetailItem label="Status" value={transaction.status} />
        <DetailItem label="Amount" value={formatAnchorAmount(transaction)} />
        <DetailItem label="Wallet" value={transaction.walletAddress} />
        <DetailItem
          label="Destination"
          value={transaction.destination ?? 'Not applicable'}
        />
        <DetailItem
          label="Payment method"
          value={transaction.paymentMethod ?? 'Not recorded'}
        />
        <DetailItem
          label="Created"
          value={format(new Date(transaction.createdAt), 'PPP p')}
        />
        <DetailItem
          label="Updated"
          value={format(new Date(transaction.updatedAt), 'PPP p')}
        />
      </div>

      <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-100/45">
          Anchor timing
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white">
            Completion window: {formatAnchorDuration(elapsedSeconds)}
          </span>
          {transaction.memo && (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white">
              Memo: {transaction.memo}
            </span>
          )}
          {transaction.anchorTransactionId && (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white">
              Anchor ref: {transaction.anchorTransactionId}
            </span>
          )}
        </div>
      </div>

      <div className="mt-5">
        <AnchorVerification transaction={transaction} />
      </div>

      <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-100/45">
          Raw metadata
        </div>
        <pre className="mt-3 max-h-80 overflow-auto rounded-2xl bg-black/30 p-4 text-xs leading-6 text-blue-100/85">
          {JSON.stringify(transaction.metadata ?? {}, null, 2)}
        </pre>
      </div>
    </aside>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-blue-100/40">
        {label}
      </div>
      <div className="mt-2 break-words text-sm text-white">{value}</div>
    </div>
  );
}
