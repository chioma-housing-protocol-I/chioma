'use client';

import { useEffect } from 'react';
import ErrorFallback from '@/components/error/ErrorFallback';
import { classifyUnknownError, logError } from '@/lib/errors';

export type RouteErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
  /** Route group key, e.g. 'admin', 'host', 'sublet'. Used for logging and the default home link. */
  section: string;
  /** Human-readable section label, e.g. 'Admin area'. Defaults to a formatted version of `section`. */
  label?: string;
  /** Home href for the "Go to safety" link. Defaults to `/${section}`. */
  homeHref?: string;
};

/**
 * Shared error boundary for top-level route groups.
 *
 * Drop into any `app/<section>/error.tsx` to get a consistent error UI with
 * section-appropriate messaging, a retry button, and a "Go to safety" link
 * that navigates to the section's home.
 *
 * Usage:
 *   ```tsx
 *   import RouteErrorBoundary from '@/components/error/RouteErrorBoundary';
 *   export default function AdminRouteError(props: import('@/components/error/RouteErrorBoundary').RouteErrorBoundaryProps) {
 *     return <RouteErrorBoundary {...props} section="admin" label="Admin area" />;
 *   }
 *   ```
 */
export default function RouteErrorBoundary({
  error,
  reset,
  section,
  label,
  homeHref,
}: RouteErrorBoundaryProps) {
  const sectionLabel = label ?? section.charAt(0).toUpperCase() + section.slice(1);
  const appError = classifyUnknownError(error, {
    source: `app/${section}/error.tsx`,
    action: `render-${section}-error`,
    route: `/${section}`,
  });

  useEffect(() => {
    logError(appError, appError.context);
  }, [appError]);

  return (
    <ErrorFallback
      title={`${sectionLabel} area error`}
      description={appError.userMessage}
      error={error}
      retry={reset}
      severity={appError.severity}
      homeHref={homeHref ?? `/${section}`}
    />
  );
}