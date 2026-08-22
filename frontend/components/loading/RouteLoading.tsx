import React from 'react';
import { SkeletonLoader } from '@/components/loading/Skeleton';

export interface RouteLoadingProps {
  /** Number of card skeletons to show. Defaults to 3. */
  cards?: number;
  className?: string;
}

/**
 * Shared page-level loading placeholder for route groups.
 *
 * Drop into any `app/<section>/loading.tsx` to get a consistent loading state
 * while the page's data is being fetched.
 *
 * Usage:
 *   ```tsx
 *   import RouteLoading from '@/components/loading/RouteLoading';
 *   export default function AdminRouteLoading() {
 *     return <RouteLoading cards={4} />;
 *   }
 *   ```
 */
export default function RouteLoading({ cards = 3, className = '' }: RouteLoadingProps) {
  return (
    <div className={`space-y-6 p-6 ${className}`} aria-busy="true" aria-label="Page loading">
      {/* Title skeleton */}
      <div className="animate-pulse">
        <div className="h-8 w-48 rounded bg-neutral-200" />
      </div>

      {/* Loading indicator */}
      <div className="animate-pulse space-y-4">
        <div className="h-3 w-96 rounded bg-neutral-200" />
        <div className="h-3 w-80 rounded bg-neutral-200" />
      </div>

      {/* Card grid skeletons */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => (
          <SkeletonLoader key={i} variant="card" />
        ))}
      </div>
    </div>
  );
}