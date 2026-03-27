'use client';

import React from 'react';
import { X } from 'lucide-react';
import type { SecurityFeedItem } from '@/lib/security-dashboard';
import {
  buildSecurityEventLabel,
  formatSecurityTimestamp,
} from '@/lib/security-dashboard';
import {
  SecurityEventActions,
  type SecurityResponseLogEntry,
} from './SecurityEventActions';

interface SecurityEventDetailProps {
  item: SecurityFeedItem | null;
  entries: SecurityResponseLogEntry[];
  incidentReport: Record<string, unknown> | null;
  isMutating: boolean;
  onClose: () => void;
  onTrackAction: (label: string, note?: string) => void;
  onMarkFalsePositive: () => Promise<void>;
  onResolveIncident: (resolution: string) => Promise<void>;
  onGenerateReport: () => Promise<void>;
}

function getSeverityBadge(severity: SecurityFeedItem['severity']) {
  switch (severity) {
    case 'critical':
      return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
    case 'high':
      return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
    case 'medium':
      return 'bg-blue-500/10 text-blue-300 border-blue-500/20';
    default:
      return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
  }
}

export function SecurityEventDetail({
  item,
  entries,
  incidentReport,
  isMutating,
  onClose,
  onTrackAction,
  onMarkFalsePositive,
  onResolveIncident,
  onGenerateReport,
}: SecurityEventDetailProps) {
  if (!item) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/80 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-6xl rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200/55">
                {buildSecurityEventLabel(item.kind)}
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${getSeverityBadge(item.severity)}`}
              >
                {item.severity}
              </span>
              <span className="text-xs text-blue-200/45">
                {formatSecurityTimestamp(item.timestamp)}
              </span>
            </div>

            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-white">
                {item.title}
              </h3>
              <p className="mt-2 max-w-3xl text-sm text-blue-200/60">
                {item.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="rounded-2xl border border-white/10 bg-white/5 p-3 text-blue-200/60 transition hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 px-6 py-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200/45">
                  Source Type
                </p>
                <p className="mt-2 text-sm text-white">
                  {buildSecurityEventLabel(item.sourceType)}
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200/45">
                  Status
                </p>
                <p className="mt-2 text-sm text-white">
                  {buildSecurityEventLabel(item.status)}
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200/45">
                  User
                </p>
                <p className="mt-2 break-all text-sm text-white">
                  {item.userId || 'Unattributed'}
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200/45">
                  IP Address
                </p>
                <p className="mt-2 break-all text-sm text-white">
                  {item.ipAddress || 'Unknown'}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h4 className="text-base font-semibold text-white">
                Signal Detail
              </h4>
              <pre className="mt-4 max-h-[18rem] overflow-auto rounded-2xl bg-black/30 p-4 text-xs text-blue-100/85">
                {JSON.stringify(item.raw, null, 2)}
              </pre>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h4 className="text-base font-semibold text-white">
                Parsed Details
              </h4>
              <pre className="mt-4 max-h-[16rem] overflow-auto rounded-2xl bg-black/30 p-4 text-xs text-blue-100/85">
                {JSON.stringify(item.details, null, 2)}
              </pre>
            </div>

            {incidentReport && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h4 className="text-base font-semibold text-white">
                  Generated Incident Report
                </h4>
                <pre className="mt-4 max-h-[16rem] overflow-auto rounded-2xl bg-black/30 p-4 text-xs text-blue-100/85">
                  {JSON.stringify(incidentReport, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <SecurityEventActions
            item={item}
            entries={entries}
            onTrackAction={onTrackAction}
            onMarkFalsePositive={onMarkFalsePositive}
            onResolveIncident={onResolveIncident}
            onGenerateReport={onGenerateReport}
            isMutating={isMutating}
          />
        </div>
      </div>
    </div>
  );
}
