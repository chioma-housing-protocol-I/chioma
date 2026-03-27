'use client';

import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  FileStack,
  FileUp,
  MessageSquareText,
  Scale,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { BaseModal } from './BaseModal';
import type { DashboardDispute } from '@/lib/dashboard-data';

interface TimelineEvent {
  label: string;
  date: string;
  icon: React.ReactNode;
  color: string;
}

interface DisputeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispute: DashboardDispute | null;
  onUploadEvidence?: (disputeId: string) => void;
}

const statusConfig: Record<
  DashboardDispute['status'],
  { label: string; color: string; icon: React.ReactNode }
> = {
  OPEN: {
    label: 'Open',
    color:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    icon: <AlertCircle size={14} />,
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    icon: <Clock size={14} />,
  },
  RESOLVED: {
    label: 'Resolved',
    color:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    icon: <CheckCircle2 size={14} />,
  },
  REJECTED: {
    label: 'Rejected',
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400',
    icon: <XCircle size={14} />,
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    color:
      'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
    icon: <XCircle size={14} />,
  },
};

function buildTimeline(dispute: DashboardDispute): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      label: 'Dispute filed',
      date: dispute.createdAt,
      icon: <Scale size={14} />,
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    },
  ];

  if (dispute.status === 'UNDER_REVIEW') {
    events.push({
      label: 'Under review',
      date: dispute.updatedAt,
      icon: <Clock size={14} />,
      color:
        'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    });
  }

  if (dispute.status === 'RESOLVED') {
    events.push({
      label: 'Dispute resolved',
      date: dispute.updatedAt,
      icon: <CheckCircle2 size={14} />,
      color:
        'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    });
  }

  if (dispute.status === 'REJECTED') {
    events.push({
      label: 'Dispute rejected',
      date: dispute.updatedAt,
      icon: <XCircle size={14} />,
      color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
    });
  }

  if (dispute.status === 'WITHDRAWN') {
    events.push({
      label: 'Dispute withdrawn',
      date: dispute.updatedAt,
      icon: <XCircle size={14} />,
      color:
        'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
    });
  }

  return events;
}

export const DisputeDetailModal: React.FC<DisputeDetailModalProps> = ({
  isOpen,
  onClose,
  dispute,
  onUploadEvidence,
}) => {
  if (!dispute) return null;

  const status = statusConfig[dispute.status];
  const timeline = buildTimeline(dispute);
  const canUploadEvidence =
    dispute.status === 'OPEN' || dispute.status === 'UNDER_REVIEW';

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Dispute Details"
      subtitle={dispute.disputeId}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          {canUploadEvidence && onUploadEvidence ? (
            <button
              onClick={() => onUploadEvidence(dispute.id)}
              className="px-5 py-2.5 rounded-xl font-bold text-brand-blue border border-brand-blue hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-2 text-sm"
            >
              <FileUp size={16} />
              Add Evidence
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Status + Type */}
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${status.color}`}
          >
            {status.icon}
            {status.label}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            <Scale size={12} />
            {dispute.disputeType.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Main Info */}
        <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
              Property
            </p>
            <p className="text-neutral-900 dark:text-white font-semibold">
              {dispute.propertyName}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {dispute.agreementReference} · Against {dispute.counterpartyName}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
              Description
            </p>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
              {dispute.description}
            </p>
          </div>

          {typeof dispute.requestedAmount === 'number' && (
            <div className="flex items-center gap-2">
              <CircleDollarSign size={16} className="text-neutral-500" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Requested Amount
                </p>
                <p className="text-sm font-bold text-neutral-900 dark:text-white">
                  {new Intl.NumberFormat('en-NG', {
                    style: 'currency',
                    currency: 'NGN',
                    maximumFractionDigits: 0,
                  }).format(dispute.requestedAmount)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
              <FileStack
                size={16}
                className="text-amber-600 dark:text-amber-400"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Evidence
              </p>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">
                {dispute.evidenceCount}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <MessageSquareText
                size={16}
                className="text-blue-600 dark:text-blue-400"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Comments
              </p>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">
                {dispute.commentCount}
              </p>
            </div>
          </div>
        </div>

        {/* Resolution */}
        {dispute.resolution && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2
                size={16}
                className="text-emerald-600 dark:text-emerald-400"
              />
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                Resolution
              </p>
            </div>
            <p className="text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed">
              {dispute.resolution}
            </p>
          </div>
        )}

        {/* Timeline */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-4">
            Timeline
          </p>
          <ol className="relative border-l border-neutral-200 dark:border-neutral-700 space-y-4 ml-2">
            {timeline.map((event, idx) => (
              <li key={idx} className="ml-5">
                <span
                  className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ${event.color}`}
                >
                  {event.icon}
                </span>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {event.label}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {format(new Date(event.date), 'MMM d, yyyy · h:mm a')}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </BaseModal>
  );
};
