'use client';

import { useEffect } from 'react';
import ErrorFallback from '@/components/error/ErrorFallback';
import { classifyUnknownError, logError } from '@/lib/errors';

export default function StaysRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const appError = classifyUnknownError(error, {
    source: 'app/stays/error.tsx',
    action: 'render-stays-error',
    route: '/stays',
  });

  useEffect(() => {
    logError(appError, appError.context);
  }, [appError]);

  return (
    <ErrorFallback
      title="Stays error"
      description={appError.userMessage}
      error={error}
      retry={reset}
      severity={appError.severity}
      homeHref="/stays"
    />
  );
}
