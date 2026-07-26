'use client';

import React, { useState } from 'react';
import { TransactionSigningModal } from '@/components/blockchain/TransactionSigningModal';
import { BlockchainStatusBadge } from '@/components/blockchain/BlockchainStatusBadge';
import PaymentFormErrorBoundary from '@/components/forms/PaymentFormErrorBoundary';
import { ChevronRight, Loader2 } from 'lucide-react';

export type PaymentFlowStep = 'amount' | 'review' | 'sign';

export interface PaymentFlowWizardProps {
  title?: string;
  assetLabel?: string;
  /** Build unsigned XDR when user confirms review step */
  prepareTransaction: (params: {
    amount: string;
    memo: string;
  }) => Promise<string>;
  onSigned?: (signedXdr: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}

export function PaymentFlowWizard({
  title = 'Send payment',
  assetLabel = 'XLM',
  prepareTransaction,
  onSigned,
  onError,
  className = '',
}: PaymentFlowWizardProps) {
  const [step, setStep] = useState<PaymentFlowStep>('amount');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [prepareLoading, setPrepareLoading] = useState(false);
  const [xdr, setXdr] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const steps: PaymentFlowStep[] = ['amount', 'review', 'sign'];
  const stepIndex = steps.indexOf(step);

  const goReview = () => {
    if (!amount.trim()) return;
    setStep('review');
  };

  const goSign = async () => {
    setPrepareLoading(true);
    try {
      const built = await prepareTransaction({
        amount: amount.trim(),
        memo: memo.trim(),
      });
      setXdr(built);
      setStep('sign');
      setModalOpen(true);
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Could not build payment');
      onError?.(err);
    } finally {
      setPrepareLoading(false);
    }
  };

  return (
    <div
      className={`rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-950 p-5 sm:p-6 space-y-6 ${className}`}
    >
      <PaymentFormErrorBoundary>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <BlockchainStatusBadge variant="network" />
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            {i > 0 && <ChevronRight size={14} className="shrink-0" />}
            <span
              className={
                i <= stepIndex ? 'text-sky-400 font-medium' : 'text-slate-600'
              }
            >
              {s === 'amount' ? 'Amount' : s === 'review' ? 'Review' : 'Sign'}
            </span>
          </React.Fragment>
        ))}
      </div>

      {step === 'amount' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Amount ({assetLabel})
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-sky-500/40 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Memo (optional)
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Invoice #…"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-sky-500/40 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={goReview}
            disabled={!amount.trim()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <dl className="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/10 text-sm">
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-slate-400">Amount</dt>
              <dd className="text-white font-medium">
                {amount} {assetLabel}
              </dd>
            </div>
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-slate-400">Memo</dt>
              <dd className="text-slate-200">{memo || '—'}</dd>
            </div>
          </dl>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => setStep('amount')}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => void goSign()}
              disabled={prepareLoading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold disabled:opacity-50"
            >
              {prepareLoading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Building transaction…
                </>
              ) : (
                'Prepare & sign'
              )}
            </button>
          </div>
        </div>
      )}

      {step === 'sign' && xdr && (
        <p className="text-sm text-slate-400">
          Use the modal to sign. If it closed without signing, you can reopen
          from your wallet flow.
        </p>
      )}

      <p className="text-xs text-slate-500">
        Community:{' '}
        <a
          href="https://t.me/chiomagroup"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 hover:underline"
        >
          Telegram support
        </a>
      </p>

      {xdr && (
        <TransactionSigningModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            if (step === 'sign') setStep('review');
          }}
          transactionXdr={xdr}
          title="Sign payment"
          onSigned={(signed) => {
            onSigned?.(signed);
            setModalOpen(false);
          }}
          onError={onError}
        />
      )}
      </PaymentFormErrorBoundary>
    </div>
  );
}
