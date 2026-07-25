'use client';

import React, { useState } from 'react';
import {
  Calendar,
  FileText,
  MessageCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import {
  useTenantDispute,
  useAddDisputeComment,
  useAppealTenantDispute,
} from '@/lib/query/hooks/use-tenant-dispute';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '@/store/authStore';

interface DisputeDetailProps {
  disputeId: string;
  className?: string;
}

const statusConfig = {
  OPEN: {
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    icon: Clock,
  },
  UNDER_REVIEW: {
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    icon: Clock,
  },
  RESOLVED: {
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: CheckCircle2,
  },
  REJECTED: {
    badge: 'bg-red-500/10 text-red-400 border-red-500/20',
    icon: XCircle,
  },
  WITHDRAWN: {
    badge: 'bg-white/5 text-blue-300/40 border-white/10',
    icon: XCircle,
  },
} as const;

export function DisputeDetail({
  disputeId,
  className = '',
}: DisputeDetailProps) {
  const { user } = useAuthStore();
  const [newComment, setNewComment] = useState('');
  const { data: dispute, isLoading, error } = useTenantDispute(disputeId);
  const addCommentMutation = useAddDisputeComment();
  const appealDisputeMutation = useAppealTenantDispute();

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !dispute || addCommentMutation.isPending) return;
    addCommentMutation.mutate(
      { disputeId: dispute.backendDisputeId, content: newComment.trim() },
      { onSuccess: () => setNewComment('') },
    );
  };

  if (isLoading) {
    return (
      <div
        className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-10 flex items-center justify-center gap-3 ${className}`}
      >
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        <span className="text-blue-200/50">Loading dispute details...</span>
      </div>
    );
  }

  if (error || !dispute) {
    return (
      <div
        className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-12 text-center ${className}`}
      >
        <FileText className="w-12 h-12 text-blue-300/20 mx-auto mb-4" />
        <h3 className="text-base font-bold text-white mb-1">
          Dispute not found
        </h3>
        <p className="text-blue-200/40 text-sm">
          The dispute details could not be loaded.
        </p>
      </div>
    );
  }

  const cfg = statusConfig[dispute.status] ?? statusConfig.OPEN;
  const StatusIcon = cfg.icon;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <StatusIcon size={20} className="text-blue-400" />
              </div>
              <div>
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cfg.badge}`}
                >
                  {dispute.status.replace('_', ' ')}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-blue-200/40 mt-1">
                  <Calendar size={12} />
                  Started{' '}
                  {formatDistanceToNow(new Date(dispute.createdAt), {
                    addSuffix: true,
                  })}
                </div>
              </div>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mb-2">
              {dispute.disputeId} — {dispute.disputeType.replace('_', ' ')}
            </h1>
            <p className="text-blue-200/60 leading-relaxed max-w-3xl">
              {dispute.description}
            </p>
            {dispute.requestedAmount && (
              <div className="mt-5 inline-flex items-baseline gap-2 px-5 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                <span className="text-2xl font-black text-emerald-400">
                  ${dispute.requestedAmount.toLocaleString()} USDC
                </span>
                <span className="text-sm font-semibold text-emerald-400/70">
                  claimed
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 text-sm shrink-0">
            {dispute.status === 'REJECTED' && (
              <button
                type="button"
                onClick={() =>
                  appealDisputeMutation.mutate({ disputeId: dispute.id })
                }
                disabled={appealDisputeMutation.isPending}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {appealDisputeMutation.isPending
                  ? 'Submitting appeal...'
                  : 'Appeal Dispute'}
              </button>
            )}
            <div>
              <p className="text-blue-200/40 text-xs uppercase tracking-wider mb-0.5">
                Agreement
              </p>
              <p className="font-semibold text-white">{dispute.agreementId}</p>
            </div>
            <div>
              <p className="text-blue-200/40 text-xs uppercase tracking-wider mb-0.5">
                Property
              </p>
              <p className="font-semibold text-white">{dispute.propertyName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Clock size={18} className="text-blue-400" /> Timeline
        </h2>
        <div className="space-y-3">
          <div className="flex items-start gap-4 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0" />
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                  Filed Dispute
                </span>
                <span className="text-xs text-blue-200/40">
                  {format(new Date(dispute.createdAt), 'MMM d, yyyy · h:mm a')}
                </span>
              </div>
              <p className="text-sm text-white">
                Dispute opened by {dispute.raisedBy.name}
              </p>
            </div>
          </div>
          {dispute.status !== 'OPEN' && (
            <div className="flex items-start gap-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 shrink-0" />
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Status Updated
                  </span>
                  <span className="text-xs text-blue-200/40">
                    {format(
                      new Date(dispute.updatedAt),
                      'MMM d, yyyy · h:mm a',
                    )}
                  </span>
                </div>
                <p className="text-sm text-white">
                  Status changed to{' '}
                  <span className="font-bold">{dispute.status}</span>
                  {dispute.resolution && <span>. {dispute.resolution}</span>}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Evidence */}
      {dispute.evidence.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
          <h2 className="text-base font-bold text-white mb-4">
            Evidence ({dispute.evidence.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dispute.evidence.map((ev) => (
              <div
                key={ev.id}
                className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3 mb-3">
                  <FileText
                    size={16}
                    className="text-blue-300/40 mt-0.5 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate text-sm">
                      {ev.filename}
                    </p>
                    <p className="text-xs text-blue-200/40 mt-0.5">
                      {formatDistanceToNow(new Date(ev.uploadedAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
                {ev.fileUrl ? (
                  <a
                    href={ev.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full text-xs font-semibold text-blue-400 transition-colors hover:text-blue-300"
                  >
                    Open Evidence
                  </a>
                ) : (
                  <span className="text-xs font-semibold text-blue-300/40">
                    File uploaded
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <MessageCircle size={18} className="text-blue-400" /> Comments (
          {dispute.comments.length})
        </h2>

        <div className="space-y-3 mb-5">
          {dispute.comments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-3 p-4 bg-white/5 border border-white/5 rounded-xl"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                <span className="font-bold text-white text-xs">
                  {(comment.author?.role || 'U').charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-white text-sm">
                    {comment.author?.name || 'Anonymous'}
                  </span>
                  <span className="text-xs text-blue-200/30">
                    {formatDistanceToNow(new Date(comment.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="text-blue-200/70 text-sm leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
          {dispute.comments.length === 0 && (
            <p className="text-center text-blue-200/30 text-sm py-4">
              No comments yet. Be the first to comment.
            </p>
          )}
        </div>

        {dispute.status !== 'RESOLVED' && dispute.status !== 'WITHDRAWN' && (
          <form
            onSubmit={handleSubmitComment}
            className="border border-white/10 rounded-2xl p-4 bg-white/5"
          >
            <div className="flex gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                <span className="font-bold text-white text-xs">
                  {user?.firstName?.[0] || 'U'}
                </span>
              </div>
              <div className="flex-1 space-y-3">
                <textarea
                  placeholder="Add a comment or update..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  disabled={addCommentMutation.isPending}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none transition-all"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setNewComment('')}
                    disabled={addCommentMutation.isPending}
                    className="px-4 py-2 text-blue-200/50 hover:text-white text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      !newComment.trim() || addCommentMutation.isPending
                    }
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {addCommentMutation.isPending && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    {addCommentMutation.isPending ? 'Adding...' : 'Add Comment'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
