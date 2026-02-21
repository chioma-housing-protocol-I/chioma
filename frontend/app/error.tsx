'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Global Error Boundary UI — app/error.tsx
 *
 * Next.js App Router automatically renders this component when an
 * unhandled error is thrown inside a page or layout in this segment.
 * Must be a Client Component ('use client').
 *
 * Props:
 *  - error:  The thrown Error object (with optional digest for server errors)
 *  - reset:  A function to re-render the error boundary's contents (retry)
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to an error reporting service in production
    console.error('[Chioma Error Boundary]', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <svg
            className="h-8 w-8 text-red-500"
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

        {/* Heading */}
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-neutral-900">
          Something went wrong
        </h1>

        {/* Description */}
        <p className="mb-2 text-sm text-neutral-500">
          An unexpected error occurred. You can try again or return to the home
          page.
        </p>

        {/* Error detail (only shown in development) */}
        {process.env.NODE_ENV === 'development' && error?.message && (
          <pre className="mb-6 overflow-auto rounded-lg bg-red-50 px-4 py-3 text-left text-xs text-red-700">
            {error.message}
            {error.digest && (
              <span className="block mt-1 text-red-400">
                Digest: {error.digest}
              </span>
            )}
          </pre>
        )}

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="w-full rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            Try again
          </button>
          <Link
            href="/"
            className="w-full rounded-lg border border-neutral-200 bg-white px-6 py-2.5 text-sm font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:ring-offset-2 sm:w-auto"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
