import React from 'react';

interface SkeletonTableProps {
  rows?: number;
}

export function SkeletonTable({ rows = 5 }: SkeletonTableProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden animate-pulse">
      {/* Table Header Skeleton */}
      <div className="bg-neutral-50 border-b border-neutral-200 px-6 py-4 flex space-x-4">
        <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
        <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
        <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
        <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
      </div>

      {/* Table Body Skeleton */}
      <div className="divide-y divide-neutral-200">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="px-6 py-4 flex items-center space-x-4 bg-white"
          >
            <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
            <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
            <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
            <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
