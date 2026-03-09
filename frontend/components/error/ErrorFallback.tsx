'use client';

import Link from 'next/link';
import type { AppError, ErrorSeverity } from '@/lib/errors';

type ErrorFallbackProps = {
  title?: string;
  description?: string;
  error?: Error | AppError;
  retry?: () => void;
  homeHref?: string;
  severity?: ErrorSeverity;
};

function getAccent(severity: ErrorSeverity) {
  if (severity === 'critical') return 'red';
  if (severity === 'warning') return 'amber';
  if (severity === 'info') return 'blue';
  return 'red';
}

export default function ErrorFallback({
  title = 'Something went wrong',
  description = 'An unexpected issue occurred. You can retry or navigate to a safe page.',
  error,
  retry,
  homeHref = '/',
  severity = 'error',
}: ErrorFallbackProps) {
  const accent = getAccent(severity);
  const iconBg =
    accent === 'amber'
      ? 'bg-amber-50'
      : accent === 'blue'
        ? 'bg-blue-50'
        : 'bg-red-50';
  const iconColor =
    accent === 'amber'
      ? 'text-amber-500'
      : accent === 'blue'
        ? 'text-blue-500'
        : 'text-red-500';
  const detailBg =
    accent === 'amber'
      ? 'bg-amber-50 text-amber-700'
      : accent === 'blue'
        ? 'bg-blue-50 text-blue-700'
        : 'bg-red-50 text-red-700';

  return (
    <section
      className="flex min-h-[50vh] items-center justify-center px-6 py-10"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="w-full max-w-md text-center">
        <div
          className={`mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full ${iconBg}`}
        >
          <svg
            className={`h-7 w-7 ${iconColor}`}
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

        <h2 className="mb-2 text-xl font-bold tracking-tight text-neutral-900">
          {title}
        </h2>
        <p className="mb-4 text-sm text-neutral-600">{description}</p>

        {process.env.NODE_ENV === 'development' && error?.message && (
          <pre
            className={`mb-5 overflow-auto rounded-lg px-4 py-3 text-left text-xs ${detailBg}`}
          >
            {error.message}
          </pre>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {retry && (
            <button
              onClick={retry}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Retry
            </button>
          )}
          <Link
            href={homeHref}
            className="rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:ring-offset-2"
          >
            Go to safety
          </Link>
        </div>
      </div>
    </section>
  );
}
