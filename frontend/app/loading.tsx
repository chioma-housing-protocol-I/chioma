'use client';

/**
 * Global Loading UI — app/loading.tsx
 *
 * Next.js App Router automatically renders this component as a fallback
 * while a page or layout in this segment is loading (via React Suspense).
 * Applies to all routes unless a more specific loading.tsx is present.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center space-y-5">
        {/* Animated logo mark */}
        <div className="relative flex h-16 w-16 items-center justify-center">
          {/* Outer spinning ring */}
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-20"></span>
          {/* Inner spinner */}
          <span className="relative inline-flex h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></span>
        </div>

        {/* Brand name */}
        <p className="text-lg font-semibold tracking-tight text-neutral-900">
          Chioma
        </p>

        {/* Subtle subtext */}
        <p className="text-sm text-neutral-500">Loading, please wait…</p>
      </div>
    </div>
  );
}
