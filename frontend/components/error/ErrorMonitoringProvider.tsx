'use client';

import { useEffect } from 'react';
import { classifyUnknownError, logError } from '@/lib/errors';

export default function ErrorMonitoringProvider() {
  useEffect(() => {
    const onWindowError = (event: ErrorEvent) => {
      const appError = classifyUnknownError(event.error ?? event.message, {
        source: 'window.onerror',
        metadata: {
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
        },
      });
      logError(appError, appError.context);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const appError = classifyUnknownError(event.reason, {
        source: 'window.onunhandledrejection',
      });
      logError(appError, appError.context);
    };

    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
