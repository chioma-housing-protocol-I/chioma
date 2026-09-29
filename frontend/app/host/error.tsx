'use client';

import { useEffect } from 'react';
import ErrorFallback from '@/components/error/ErrorFallback';
import { classifyUnknownError, logError } from '@/lib/errors';

export default function HostRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const appError = classifyUnknownError(error, {
    source: 'app/host/error.tsx',
    action: 'render-host-error',
    route: '/host',
  });

  useEffect(() => {
    logError(appError, appError.context);
  }, [appError]);

  return (
    <ErrorFallback
      title="Host area error"
      description={appError.userMessage}
      error={error}
      retry={reset}
      severity={appError.severity}
      homeHref="/host"
    />
  );
}
