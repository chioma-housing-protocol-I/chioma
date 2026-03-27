'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  FileWarning,
  ShieldBan,
  ShieldCheck,
  ShieldQuestion,
  UserRoundCog,
} from 'lucide-react';
import type { SecurityFeedItem } from '@/lib/security-dashboard';

export interface SecurityResponseLogEntry {
  label: string;
  timestamp: string;
  note?: string;
}

interface SecurityEventActionsProps {
  item: SecurityFeedItem;
  entries: SecurityResponseLogEntry[];
  onTrackAction: (label: string, note?: string) => void;
  onMarkFalsePositive: () => Promise<void>;
  onResolveIncident: (resolution: string) => Promise<void>;
  onGenerateReport: () => Promise<void>;
  isMutating: boolean;
}

const MANUAL_ACTIONS = [
  { label: 'Acknowledge Event', icon: ShieldCheck },
  { label: 'Investigate Event', icon: ShieldQuestion },
  { label: 'Block User', icon: ShieldBan },
  { label: 'Revoke Token', icon: AlertOctagon },
  { label: 'Reset Password', icon: UserRoundCog },
  { label: 'Create Incident', icon: FileWarning },
];

export function SecurityEventActions({
  item,
  entries,
  onTrackAction,
  onMarkFalsePositive,
  onResolveIncident,
  onGenerateReport,
  isMutating,
}: SecurityEventActionsProps) {
  const [resolution, setResolution] = useState(
    'Resolved from security dashboard',
  );
  const canResolveIncident =
    item.kind === 'incident' && item.status !== 'resolved';
  const canMarkFalsePositive =
    item.kind === 'threat' &&
    item.status !== 'false_positive' &&
    item.status !== 'mitigated';

  const helperText = useMemo(() => {
    if (item.kind === 'incident') {
      return 'Use the live incident controls below and track additional analyst steps beside them.';
    }

    if (item.kind === 'threat') {
      return 'Track analyst actions locally, or mark a noisy threat as false positive.';
    }

    return 'Track analyst responses for this event so handoffs stay visible in the dashboard.';
  }, [item.kind]);

  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-black/20 p-5">
      <div>
        <h4 className="text-base font-semibold text-white">Response Actions</h4>
        <p className="mt-1 text-sm text-blue-200/55">{helperText}</p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {MANUAL_ACTIONS.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white transition hover:bg-white/10"
            onClick={() => onTrackAction(label)}
          >
            <Icon className="h-4 w-4 text-blue-300" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {canMarkFalsePositive && (
        <button
          type="button"
          className="w-full rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isMutating}
          onClick={() => void onMarkFalsePositive()}
        >
          Mark threat as false positive
        </button>
      )}

      {item.kind === 'incident' && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <label className="block text-sm font-medium text-white">
            Resolution note
            <textarea
              value={resolution}
              onChange={(event) => setResolution(event.target.value)}
              className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-white outline-none"
            />
          </label>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isMutating || !canResolveIncident}
              onClick={() => void onResolveIncident(resolution)}
            >
              Resolve incident
            </button>
            <button
              type="button"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isMutating}
              onClick={() => void onGenerateReport()}
            >
              Generate incident report
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-200/50">
            Response Tracking
          </h5>
          <span className="text-xs text-blue-200/45">
            {entries.length} logged
          </span>
        </div>

        {entries.length === 0 ? (
          <p className="text-sm text-blue-200/55">
            No response actions logged yet for this signal.
          </p>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li
                key={`${entry.label}-${entry.timestamp}`}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">
                    {entry.label}
                  </p>
                  <span className="text-xs text-blue-200/45">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
                {entry.note && (
                  <p className="mt-1 text-sm text-blue-200/55">{entry.note}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
