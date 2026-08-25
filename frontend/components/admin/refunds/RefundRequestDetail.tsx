'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  CreditCard,
  History,
  MessageSquare,
  User,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { useDateFnsLocale } from '@/lib/utils/date-fns-locale';
import { formatCurrency } from '@/lib/utils/format';
import type {
  AdminRefundRequestDetail,
  AdminRefundStatus,
} from '@/lib/admin-refund-requests';
import { statusLabel } from '@/lib/admin-refund-requests';

const STATUS_BADGE: Record<AdminRefundStatus, string> = {
  PENDING: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  APPROVED: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  PROCESSING: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  COMPLETED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  REJECTED: 'bg-red-500/15 text-red-300 border-red-500/30',
};

const HISTORY_ACTION_LABEL: Record<string, string> = {
  created: 'Created',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  processing_started: 'Processing',
  completed: 'Completed',
};

export interface RefundRequestDetailProps {
  refund: AdminRefundRequestDetail;
  onBack: () => void;
  onSubmitDecision?: (args: {
    action: 'approve' | 'reject';
    notes: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export function RefundRequestDetail({
  refund,
  onBack,
  onSubmitDecision,
  isSubmitting = false,
}: RefundRequestDetailProps) {
  const [notes, setNotes] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const dateFnsLocale = useDateFnsLocale();

  const canDecide = refund.status === 'PENDING' && onSubmitDecision;

  const handleSubmit = async (action: 'approve' | 'reject') => {
    setLocalError(null);
    if (!notes.trim()) {
      setLocalError('Add reviewer notes before submitting a decision.');
      return;
    }
    if (!onSubmitDecision) return;
    await onSubmitDecision({ action, notes: notes.trim() });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={onBack}
            className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all text-sm group shrink-0"
            aria-label="Back"
          >
            <ArrowLeft
              size={18}
              className="group-hover:-translate-x-1 transition-transform"
            />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {refund.refundId}
              </h1>
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-lg border uppercase tracking-wide ${STATUS_BADGE[refund.status]}`}
              >
                {statusLabel(refund.status)}
              </span>
            </div>
            <p className="text-blue-200/70 text-sm">
              Original payment {refund.originalPaymentId}
            </p>
          </div>
        </div>
        <a
          href="https://t.me/chiomagroup"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-sky-300/90 hover:text-sky-200 underline underline-offset-4 shrink-0"
        >
          Community: Telegram support
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-white font-semibold">
              <CircleDollarSign className="text-emerald-400" size={20} />
              Amount
            </div>
            <p className="text-3xl font-bold text-white">
              {formatCurrency(refund.amount, refund.currency)}
            </p>
            <div className="pt-4 border-t border-slate-800 space-y-2 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Clock size={16} />
                Requested{' '}
                {format(new Date(refund.requestedAt), 'MMM d, yyyy HH:mm', {
                  locale: dateFnsLocale,
                })}
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} />
                Updated{' '}
                {format(new Date(refund.updatedAt), 'MMM d, yyyy HH:mm', {
                  locale: dateFnsLocale,
                })}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-white font-semibold">
              <User className="text-sky-400" size={20} />
              Requester
            </div>
            <p className="text-white font-medium">{refund.requesterName}</p>
            <p className="text-slate-400 text-sm">{refund.requesterEmail}</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-white font-semibold">
              <CreditCard className="text-violet-400" size={20} />
              Payment
            </div>
            <p className="text-slate-300 text-sm">{refund.paymentMethod}</p>
            {refund.propertyName && (
              <div className="flex items-start gap-2 text-sm text-slate-400">
                <Building2 size={16} className="shrink-0 mt-0.5" />
                <span>
                  {refund.propertyName}
                  {refund.agreementReference
                    ? ` · ${refund.agreementReference}`
                    : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-white font-semibold mb-3">Reason</h2>
            <p className="text-slate-400 text-sm mb-4">
              {refund.reasonSummary}
            </p>
            <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
              {refund.reasonDetail}
            </p>
          </section>

          <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-white font-semibold">
              <History className="text-amber-400" size={20} />
              Refund history
            </div>
            {refund.history.length === 0 ? (
              <p className="text-slate-500 text-sm">No history yet.</p>
            ) : (
              <ol className="space-y-4">
                {[...refund.history]
                  .sort(
                    (a, b) =>
                      new Date(a.createdAt).getTime() -
                      new Date(b.createdAt).getTime(),
                  )
                  .map((h) => (
                    <li
                      key={h.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2 justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
                          {HISTORY_ACTION_LABEL[h.action] ?? h.action}
                        </span>
                        <span className="text-xs text-slate-500">
                          {format(new Date(h.createdAt), 'MMM d, yyyy HH:mm', {
                            locale: dateFnsLocale,
                          })}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm">{h.message}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        {h.actorName} · {h.actorRole}
                      </p>
                    </li>
                  ))}
              </ol>
            )}
          </section>

          {canDecide && (
            <section className="bg-gradient-to-br from-slate-900 to-emerald-950/30 border border-emerald-500/20 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-4 text-white font-semibold">
                <MessageSquare className="text-emerald-400" size={20} />
                Decision
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Approve to authorize refund processing, or reject with a clear
                policy note. Parties are notified when a decision is recorded.
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Reviewer notes (required)…"
                className="w-full px-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none text-sm"
              />
              <div className="flex justify-between items-center mt-2 mb-4">
                <span className="text-xs text-slate-500">
                  {notes.length}/2000
                </span>
                {localError && (
                  <span className="text-xs text-red-400">{localError}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 justify-end">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleSubmit('reject')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-red-600/90 hover:bg-red-600 border border-red-500/40 disabled:opacity-50"
                >
                  <XCircle size={18} />
                  Reject
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleSubmit('approve')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-emerald-600/90 hover:bg-emerald-600 border border-emerald-500/40 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Approve
                    </>
                  )}
                </button>
              </div>
            </section>
          )}

          {!canDecide && refund.status !== 'PENDING' && (
            <div className="rounded-2xl border border-slate-600/40 bg-slate-800/40 px-4 py-3 text-sm text-slate-300">
              This request is not awaiting review. Use the history above to
              audit status changes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
