'use client';

import React from 'react';

interface ChartSkeletonProps {
  className?: string;
  height?: string | number;
}

/**
 * Shared loading placeholder for dynamically imported chart components.
 */
export function ChartSkeleton({
  className = '',
  height = '100%',
}: ChartSkeletonProps) {
  return (
    <div
      className={`w-full animate-pulse rounded-2xl border border-white/10 bg-white/5 ${className}`}
      style={{ height }}
      aria-hidden="true"
    />
  );
}
