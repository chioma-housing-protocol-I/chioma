'use client';

import {
  ExternalLink,
  Fingerprint,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import {
  getAnchorMetadataString,
  getAnchorProofReference,
  getAnchorTransactionExplorerUrl,
  getAnchorVerificationState,
} from '@/lib/anchor-transactions';
import type { AnchorTransaction } from '@/types';

interface AnchorVerificationProps {
  transaction: AnchorTransaction;
}

const VERIFICATION_STYLES = {
  verified: {
    badge: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
    icon: ShieldCheck,
    title: 'Verified on Stellar',
    summary:
      'The anchor flow has produced a network transaction hash and can be audited externally.',
  },
  processing: {
    badge: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
    icon: Fingerprint,
    title: 'Proof in progress',
    summary:
      'The anchor session exists, but the network transaction has not been finalized yet.',
  },
  pending: {
    badge: 'border-blue-400/20 bg-blue-400/10 text-blue-200',
    icon: Fingerprint,
    title: 'Awaiting anchor proof',
    summary:
      'The record exists locally and is waiting for the anchor to assign a proof reference.',
  },
  failed: {
    badge: 'border-rose-400/20 bg-rose-400/10 text-rose-200',
    icon: ShieldAlert,
    title: 'Verification incomplete',
    summary:
      'This flow ended in a failed or refunded state, so it should be reviewed before settlement.',
  },
} as const;

export function AnchorVerification({ transaction }: AnchorVerificationProps) {
  const verificationState = getAnchorVerificationState(transaction);
  const proofReference = getAnchorProofReference(transaction);
  const explorerUrl = getAnchorTransactionExplorerUrl(transaction);
  const anchorMessage = getAnchorMetadataString(transaction, 'message');
  const nextStep = getAnchorMetadataString(transaction, 'how');
  const externalReference = getAnchorMetadataString(
    transaction,
    'external_transaction_id',
  );
  const StyleIcon = VERIFICATION_STYLES[verificationState].icon;

  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${VERIFICATION_STYLES[verificationState].badge}`}
          >
            <StyleIcon className="h-3.5 w-3.5" />
            {VERIFICATION_STYLES[verificationState].title}
          </div>
          <p className="mt-3 text-sm leading-6 text-blue-100/65">
            {VERIFICATION_STYLES[verificationState].summary}
          </p>
        </div>

        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300/40 hover:bg-emerald-400/15"
          >
            View on Explorer
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ProofItem
          label="Anchor proof"
          value={proofReference ?? 'Not assigned yet'}
        />
        <ProofItem
          label="Stellar transaction"
          value={transaction.stellarTransactionId ?? 'Pending network hash'}
        />
        <ProofItem
          label="External reference"
          value={externalReference ?? 'Unavailable'}
        />
        <ProofItem label="Next anchor step" value={nextStep ?? 'Unavailable'} />
      </div>

      {anchorMessage && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-blue-100/75">
          <span className="block text-xs font-semibold uppercase tracking-[0.25em] text-blue-100/45">
            Anchor message
          </span>
          <p className="mt-2">{anchorMessage}</p>
        </div>
      )}
    </section>
  );
}

function ProofItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-blue-100/40">
        {label}
      </div>
      <div className="mt-2 break-all font-mono text-sm text-white">{value}</div>
    </div>
  );
}
