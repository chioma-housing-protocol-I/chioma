import type { AppError, ErrorContext } from './types';

declare global {
  interface Window {
    __CHIOMA_ERROR_REPORTER__?: (payload: {
      name: string;
      message: string;
      stack?: string;
      context?: ErrorContext;
      timestamp: string;
    }) => void;
  }
}

export function logError(error: Error | AppError, context?: ErrorContext) {
  const payload = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  };

  console.error('[Chioma Error]', payload);

  if (typeof window !== 'undefined' && window.__CHIOMA_ERROR_REPORTER__) {
    window.__CHIOMA_ERROR_REPORTER__(payload);
  }
}
