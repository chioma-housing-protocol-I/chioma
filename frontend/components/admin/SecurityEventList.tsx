'use client';

import React from 'react';
import { ChevronRight, ShieldAlert } from 'lucide-react';
import type { SecurityFeedItem } from '@/lib/security-dashboard';
import {
  buildSecurityEventLabel,
  formatSecurityTimestamp,
} from '@/lib/security-dashboard';

interface SecurityEventListProps {
  items: SecurityFeedItem[];
  loading: boolean;
  selectedId?: string | null;
  onSelect: (item: SecurityFeedItem) => void;
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

function getKindBadge(kind: SecurityFeedItem['kind']) {
  switch (kind) {
    case 'incident':
      return 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20';
    case 'threat':
      return 'bg-orange-500/10 text-orange-300 border-orange-500/20';
    default:
      return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20';
  }
}

export function SecurityEventList({
  items,
  loading,
  selectedId,
  onSelect,
}: SecurityEventListProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Security Signals</h3>
          <p className="text-sm text-blue-200/55">
            Searchable event stream with incident and threat context.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-blue-200/60">
          {items.length} visible
        </div>
      </div>

      <div className="max-h-[34rem] overflow-y-auto">
        {loading ? (
          <div className="flex h-56 items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-blue-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center gap-3 px-6 text-center">
            <ShieldAlert className="h-10 w-10 text-blue-300/30" />
            <div>
              <p className="text-base font-medium text-white">
                No matching signals
              </p>
              <p className="text-sm text-blue-200/55">
                Adjust the filters or broaden the time range to inspect more
                activity.
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {items.map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                <button
                  type="button"
                  className={`flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/5 ${
                    selectedId === item.id ? 'bg-white/5' : ''
                  }`}
                  onClick={() => onSelect(item)}
                >
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${getKindBadge(item.kind)}`}
                      >
                        {item.kind}
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
                      <p className="truncate text-base font-semibold text-white">
                        {item.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-blue-200/60">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-blue-200/45">
                      <span>{buildSecurityEventLabel(item.sourceType)}</span>
                      <span>{buildSecurityEventLabel(item.category)}</span>
                      <span>{item.status}</span>
                      {item.userId && <span>User {item.userId}</span>}
                      {item.ipAddress && <span>{item.ipAddress}</span>}
                    </div>
                  </div>

                  <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-blue-300/35" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
