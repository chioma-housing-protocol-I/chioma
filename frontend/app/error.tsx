'use client';

import { useEffect } from 'react';
import ErrorFallback from '@/components/error/ErrorFallback';
import { classifyUnknownError, logError } from '@/lib/errors';

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
  const appError = classifyUnknownError(error, {
    source: 'app/error.tsx',
    action: 'render-global-error',
  });

  useEffect(() => {
    logError(appError, {
      ...(appError.context ?? {}),
      metadata: { digest: error.digest },
    });
  }, [appError, error.digest]);

  return (
    <ErrorFallback
      title="Something went wrong"
      description={appError.userMessage}
      error={error}
      retry={reset}
      severity={appError.severity}
      homeHref="/"
    />
  );
}
