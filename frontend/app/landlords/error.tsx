'use client';

import { useEffect } from 'react';
import ErrorFallback from '@/components/error/ErrorFallback';
import { classifyUnknownError, logError } from '@/lib/errors';

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
  const appError = classifyUnknownError(error, {
    source: 'app/landlords/error.tsx',
    action: 'render-landlords-error',
    route: '/landlords',
  });

  useEffect(() => {
    logError(appError, appError.context);
  }, [appError]);

  return (
    <ErrorFallback
      title="Landlord dashboard error"
      description={appError.userMessage}
      error={error}
      retry={reset}
      severity={appError.severity}
      homeHref="/landlords"
    />
  );
}
