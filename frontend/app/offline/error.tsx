'use client';

import { useEffect } from 'react';
import ErrorFallback from '@/components/error/ErrorFallback';
import { classifyUnknownError, logError } from '@/lib/errors';

export default function OfflineRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const appError = classifyUnknownError(error, {
    source: 'app/offline/error.tsx',
    action: 'render-offline-error',
    route: '/',
  });

  useEffect(() => {
    logError(appError, appError.context);
  }, [appError]);

  return (
    <ErrorFallback
      title="Offline page error"
      description={appError.userMessage}
      error={error}
      retry={reset}
      severity={appError.severity}
      homeHref="/"
    />
  );
}
