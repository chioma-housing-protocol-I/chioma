'use client';

import { useEffect } from 'react';

/**
 * Dashboard Error Boundary — app/landlords/error.tsx
 *
 * Shown when an unhandled error occurs inside any landlord dashboard page.
 * Scoped to the /landlords segment so the rest of the app stays functional.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard Error Boundary]', error);
  }, [error]);

  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        {/* Icon */}
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <svg
            className="h-7 w-7 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h2 className="mb-2 text-xl font-bold text-neutral-900">
          Dashboard error
        </h2>
        <p className="mb-5 text-sm text-neutral-500">
          Could not load this section. Please try again.
        </p>

        {process.env.NODE_ENV === 'development' && error?.message && (
          <pre className="mb-5 overflow-auto rounded-lg bg-red-50 px-4 py-3 text-left text-xs text-red-700">
            {error.message}
          </pre>
        )}

        <button
          onClick={reset}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
