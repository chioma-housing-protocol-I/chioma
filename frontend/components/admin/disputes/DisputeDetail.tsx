'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Gavel,
  Image as ImageIcon,
  MessageSquare,
  User,
  Users,
  Video,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { useDateFnsLocale } from '@/lib/utils/date-fns-locale';
import { formatCurrency } from '@/lib/utils/format';
import type { AdminDisputeDetail } from '@/lib/admin-dispute-detail';
import {
  statusLabel,
  timelineIconType,
  typeLabel,
} from '@/lib/admin-dispute-detail';
import type { DisputeStatus } from '@/lib/dashboard-data';

const STATUS_STYLES: Record<DisputeStatus, string> = {
  OPEN: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  UNDER_REVIEW: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  RESOLVED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  REJECTED: 'bg-red-500/15 text-red-300 border-red-500/30',
  WITHDRAWN: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

const PRIORITY_STYLES = {
  low: 'bg-slate-500/15 text-slate-300 border-slate-500/25',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  high: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
};

const TIMELINE_DOT: Record<'info' | 'success' | 'warning' | 'neutral', string> =
  {
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    info: 'bg-sky-400',
    neutral: 'bg-slate-500',
  };

function DecisionBadge({ decision }: { decision: string }) {
  const map: Record<string, string> = {
    approve: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    reject: 'bg-red-500/15 text-red-300 border-red-500/30',
    partial: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    withdrawn: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  };
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border capitalize ${map[decision] ?? map.withdrawn}`}
    >
      {decision}
    </span>
  );
}

export interface DisputeDetailProps {
  dispute: AdminDisputeDetail;
  onBack: () => void;
  onSubmitResolution?: (args: {
    resolutionNotes: string;
    action: 'approve' | 'reject';
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export function DisputeDetail({
  dispute,
  onBack,
  onSubmitResolution,
  isSubmitting = false,
}: DisputeDetailProps) {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const dateFnsLocale = useDateFnsLocale();

  const canResolve = useMemo(() => {
    return dispute.status === 'OPEN' || dispute.status === 'UNDER_REVIEW';
  }, [dispute.status]);

  const sortedTimeline = useMemo(() => {
    return [...dispute.timeline].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [dispute.timeline]);

  const handleSubmit = async (action: 'approve' | 'reject') => {
    setLocalError(null);
    if (!resolutionNotes.trim()) {
      setLocalError('Add resolution notes before recording a decision.');
      return;
    }
    if (!onSubmitResolution) return;
    await onSubmitResolution({
      resolutionNotes: resolutionNotes.trim(),
      action,
    });
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
                {dispute.disputeId}
              </h1>
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-lg border uppercase tracking-wide ${STATUS_STYLES[dispute.status]}`}
              >
                {statusLabel(dispute.status)}
              </span>
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-lg border uppercase tracking-wide ${PRIORITY_STYLES[dispute.priority]}`}
              >
                {dispute.priority} priority
              </span>
            </div>
            <p className="text-blue-200/70 text-sm">
              {typeLabel(dispute.disputeType)} · {dispute.agreementReference} ·{' '}
              {dispute.propertyName}
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
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Gavel className="text-amber-400" size={20} />
              Summary
            </div>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {dispute.description}
            </p>
            {dispute.requestedAmount != null && (
              <div className="pt-4 border-t border-slate-800">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Requested amount
                </p>
                <p className="text-lg font-bold text-white">
                  {formatCurrency(dispute.requestedAmount, dispute.currency)}
                </p>
              </div>
            )}
            <div className="pt-4 border-t border-slate-800 space-y-3 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Clock size={16} className="shrink-0" />
                Opened{' '}
                {format(new Date(dispute.createdAt), 'MMM d, yyyy · HH:mm', {
                  locale: dateFnsLocale,
                })}
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Clock size={16} className="shrink-0" />
                Updated{' '}
                {format(new Date(dispute.updatedAt), 'MMM d, yyyy · HH:mm', {
                  locale: dateFnsLocale,
                })}
              </div>
              {dispute.assignedToName && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Users size={16} className="shrink-0" />
                  Assigned: {dispute.assignedToName}
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Building2 className="text-blue-400" size={20} />
              Parties
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <User className="text-emerald-400" size={18} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Claimant ({dispute.claimantRole})
                  </p>
                  <p className="text-white font-medium">
                    {dispute.claimantName}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
                  <User className="text-violet-300" size={18} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Respondent ({dispute.respondentRole})
                  </p>
                  <p className="text-white font-medium">
                    {dispute.respondentName}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-white font-semibold">
              <AlertCircle className="text-amber-400" size={20} />
              Evidence
            </div>
            {dispute.evidence.length === 0 ? (
              <p className="text-slate-500 text-sm">No evidence uploaded.</p>
            ) : (
              <ul className="grid sm:grid-cols-2 gap-4">
                {dispute.evidence.map((ev) => (
                  <li
                    key={ev.id}
                    className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden flex flex-col"
                  >
                    <div className="aspect-video bg-slate-950/80 flex items-center justify-center relative">
                      {ev.type === 'image' ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={ev.url}
                          alt=""
                          className="max-h-full max-w-full object-contain p-4"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-500 p-6">
                          {ev.type === 'video' ? (
                            <Video size={40} />
                          ) : (
                            <FileText size={40} />
                          )}
                          <span className="text-xs uppercase tracking-wider">
                            {ev.type}
                          </span>
                        </div>
                      )}
                      <span className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 border border-white/10">
                        {ev.type === 'image' ? (
                          <ImageIcon size={14} className="text-white" />
                        ) : ev.type === 'video' ? (
                          <Video size={14} className="text-white" />
                        ) : (
                          <FileText size={14} className="text-white" />
                        )}
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      <p className="text-white font-medium text-sm leading-snug">
                        {ev.label}
                      </p>
                      <p className="text-xs text-slate-500">
                        {ev.uploadedByName} ·{' '}
                        {format(new Date(ev.uploadedAt), 'MMM d, yyyy HH:mm', {
                          locale: dateFnsLocale,
                        })}
                      </p>
                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-xs font-semibold text-sky-400 hover:text-sky-300"
                      >
                        Open file
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-6 text-white font-semibold">
              <Clock className="text-sky-400" size={20} />
              Timeline
            </div>
            <ol className="relative border-l border-slate-700 ml-3 space-y-6 pl-8">
              {sortedTimeline.map((ev) => {
                const tone = timelineIconType(ev.type);
                return (
                  <li key={ev.id} className="relative">
                    <span
                      className={`absolute -left-[21px] top-1.5 flex h-3 w-3 rounded-full ring-4 ring-slate-900 ${TIMELINE_DOT[tone]}`}
                    />
                    <p className="text-white font-medium">{ev.title}</p>
                    {ev.description && (
                      <p className="text-slate-400 text-sm mt-1">
                        {ev.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
                      <span>
                        {format(new Date(ev.createdAt), 'MMM d, yyyy · HH:mm', {
                          locale: dateFnsLocale,
                        })}
                      </span>
                      {ev.actorName && (
                        <span>
                          {ev.actorName}
                          {ev.actorRole ? ` · ${ev.actorRole}` : ''}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {dispute.resolutionHistory.length > 0 && (
            <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-4 text-white font-semibold">
                <CheckCircle2 className="text-emerald-400" size={20} />
                Resolution history
              </div>
              <ul className="space-y-4">
                {dispute.resolutionHistory.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <DecisionBadge decision={r.decision} />
                      <span className="text-xs text-slate-500">
                        {format(new Date(r.decidedAt), 'MMM d, yyyy HH:mm', {
                          locale: dateFnsLocale,
                        })}
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap">
                      {r.notes}
                    </p>
                    <p className="text-xs text-slate-500">
                      {r.decidedByName} · {r.decidedByRole}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {canResolve && onSubmitResolution && (
            <section className="bg-gradient-to-br from-slate-900 to-blue-950/40 border border-sky-500/20 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-4 text-white font-semibold">
                <MessageSquare className="text-sky-400" size={20} />
                Record decision
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Arbiters and admins can approve or reject the claim. Notes are
                stored on the case and surfaced to parties.
              </p>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="Resolution notes (required)…"
                className="w-full px-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none text-sm"
              />
              <div className="flex justify-between items-center mt-2 mb-4">
                <span className="text-xs text-slate-500">
                  {resolutionNotes.length}/2000
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
                  Reject claim
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
                      Approve & resolve
                    </>
                  )}
                </button>
              </div>
            </section>
          )}

          {!canResolve && (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200/90">
              This dispute is closed for new decisions. Review the timeline and
              resolution history above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
