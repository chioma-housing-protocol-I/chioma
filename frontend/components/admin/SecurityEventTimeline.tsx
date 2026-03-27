'use client';

import React from 'react';
import type { SecurityFeedItem } from '@/lib/security-dashboard';
import {
  buildSecurityEventLabel,
  formatSecurityTimestamp,
} from '@/lib/security-dashboard';

interface SecurityEventTimelineProps {
  items: SecurityFeedItem[];
  onSelect: (item: SecurityFeedItem) => void;
}

function getDotTone(severity: SecurityFeedItem['severity']) {
  switch (severity) {
    case 'critical':
      return 'bg-rose-400 shadow-[0_0_20px_rgba(251,113,133,0.6)]';
    case 'high':
      return 'bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.45)]';
    case 'medium':
      return 'bg-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.45)]';
    default:
      return 'bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.45)]';
  }
}

export function SecurityEventTimeline({
  items,
  onSelect,
}: SecurityEventTimelineProps) {
  const timelineItems = items.slice(0, 10);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Timeline</h3>
          <p className="text-sm text-blue-200/55">
            Recent signal sequence for faster incident reconstruction.
          </p>
        </div>
        <span className="text-xs text-blue-200/45">
          Showing {timelineItems.length} latest
        </span>
      </div>

      <div className="mt-6 space-y-4">
        {timelineItems.length === 0 ? (
          <p className="text-sm text-blue-200/55">
            The current filters removed all timeline activity.
          </p>
        ) : (
          timelineItems.map((item) => (
            <button
              type="button"
              key={`${item.kind}-${item.id}`}
              className="grid w-full grid-cols-[18px_1fr] gap-4 text-left"
              onClick={() => onSelect(item)}
            >
              <div className="relative flex justify-center">
                <span
                  className={`mt-1 h-3 w-3 rounded-full ${getDotTone(item.severity)}`}
                />
                <span className="absolute top-4 bottom-[-1rem] w-px bg-white/10" />
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:bg-black/30">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">
                    {item.title}
                  </p>
                  <span className="text-xs text-blue-200/45">
                    {formatSecurityTimestamp(item.timestamp)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-blue-200/60">
                  {item.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-blue-200/45">
                  <span>{buildSecurityEventLabel(item.kind)}</span>
                  <span>{buildSecurityEventLabel(item.sourceType)}</span>
                  <span>{item.status}</span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
