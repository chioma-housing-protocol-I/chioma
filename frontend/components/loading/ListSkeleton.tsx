'use client';

import React from 'react';
import { Shimmer } from './Shimmer';

export interface ListSkeletonProps {
  rows?: number;
  className?: string;
}

/**
 * Generic vertical list placeholder (settings rows, notifications, etc.).
 */
export function ListSkeleton({ rows = 5, className = '' }: ListSkeletonProps) {
  return (
    <ul className={`space-y-3 ${className}`} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex gap-3">
          <Shimmer className="h-10 w-10 shrink-0" rounded="full" />
          <div className="flex flex-1 flex-col gap-2 py-1">
            <Shimmer className="h-3 w-2/3" rounded="sm" />
            <Shimmer className="h-3 w-full" rounded="sm" />
          </div>
        </li>
      ))}
    </ul>
  );
}
