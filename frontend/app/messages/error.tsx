'use client';

import { useEffect } from 'react';
import ErrorFallback from '@/components/error/ErrorFallback';
import { classifyUnknownError, logError } from '@/lib/errors';

export default function MessagesRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const appError = classifyUnknownError(error, {
    source: 'app/messages/error.tsx',
    action: 'render-messages-error',
    route: '/messages',
  });

  useEffect(() => {
    logError(appError, appError.context);
  }, [appError]);

  return (
    <ErrorFallback
      title="Messages error"
      description={appError.userMessage}
      error={error}
      retry={reset}
      severity={appError.severity}
      homeHref="/messages"
    />
  );
}
