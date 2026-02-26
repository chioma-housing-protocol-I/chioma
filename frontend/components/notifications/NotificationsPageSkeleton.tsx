import React from 'react';

// ─── Single skeleton row (mirrors NotificationItem layout) ─────────────────

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 px-4 py-4 animate-pulse">
      {/* Icon circle */}
      <div className="shrink-0 w-9 h-9 bg-gray-200 rounded-full" />

      {/* Text lines */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-2/5" />
        <div className="h-3 bg-gray-200 rounded w-4/5" />
        <div className="h-3 bg-gray-100 rounded w-1/4" />
      </div>

      {/* Action placeholder */}
      <div className="shrink-0 h-4 bg-gray-200 rounded w-14 mt-0.5" />
    </div>
  );
}

// ─── Full page skeleton ─────────────────────────────────────────────────────

export default function NotificationsPageSkeleton() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="space-y-2">
          <div className="h-7 bg-gray-200 rounded w-40" />
          <div className="h-4 bg-gray-100 rounded w-56" />
        </div>
        <div className="h-4 bg-gray-200 rounded w-28" />
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-4 h-4 bg-gray-200 rounded" />
        {[16, 20, 24, 18].map((w, i) => (
          <div
            key={i}
            className="h-8 bg-gray-200 rounded-full"
            style={{ width: `${w * 4}px` }}
          />
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-card divide-y divide-gray-100 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
