'use client';

import { useEffect } from 'react';
import ErrorFallback from '@/components/error/ErrorFallback';
import { classifyUnknownError, logError } from '@/lib/errors';

export default function TermsRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const appError = classifyUnknownError(error, {
    source: 'app/terms/error.tsx',
    action: 'render-terms-error',
    route: '/',
  });

  useEffect(() => {
    logError(appError, appError.context);
  }, [appError]);

  return (
    <ErrorFallback
      title="Terms page error"
      description={appError.userMessage}
      error={error}
      retry={reset}
      severity={appError.severity}
      homeHref="/"
    />
  );
}
