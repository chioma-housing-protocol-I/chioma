'use client';

/**
 * Dashboard Loading UI — app/landlords/loading.tsx
 *
 * Shown while any landlord dashboard page is loading.
 * Uses a skeleton layout that mirrors the actual dashboard structure
 * to avoid layout shift.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl bg-gray-200 h-28" />
        ))}
      </div>

      {/* Chart + Activity skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 rounded-xl bg-gray-200 h-64" />
        <div className="rounded-xl bg-gray-200 h-64" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl bg-gray-200 h-48" />
    </div>
  );
}
