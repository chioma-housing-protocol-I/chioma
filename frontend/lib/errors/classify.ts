import { getErrorMessage } from './messages';
import { AppError, type ErrorContext } from './types';

export function createHttpError(
  status: number,
  context?: ErrorContext,
): AppError {
  if (status === 401) {
    const msg = getErrorMessage('AUTH_SESSION_EXPIRED');
    return new AppError({
      code: 'AUTH_SESSION_EXPIRED',
      category: 'authentication',
      severity: 'warning',
      message: `HTTP 401 Unauthorized`,
      userMessage: msg.message,
      recoverable: true,
      status,
      context,
    });
  }

  if (status === 403) {
    const msg = getErrorMessage('PERMISSION_DENIED');
    return new AppError({
      code: 'PERMISSION_DENIED',
      category: 'permission',
      severity: 'warning',
      message: `HTTP 403 Forbidden`,
      userMessage: msg.message,
      recoverable: false,
      status,
      context,
    });
  }

  if (status === 400 || status === 422) {
    const msg = getErrorMessage('VALIDATION_INVALID_INPUT');
    return new AppError({
      code: 'VALIDATION_INVALID_INPUT',
      category: 'validation',
      severity: 'info',
      message: `HTTP ${status} Validation Error`,
      userMessage: msg.message,
      recoverable: true,
      status,
      context,
    });
  }

  if (status >= 500) {
    const msg = getErrorMessage('SYSTEM_UNEXPECTED');
    return new AppError({
      code: 'SYSTEM_UNEXPECTED',
      category: 'system',
      severity: 'critical',
      message: `HTTP ${status} Server Error`,
      userMessage: msg.message,
      recoverable: true,
      status,
      context,
    });
  }

  const msg = getErrorMessage('UNKNOWN_ERROR');
  return new AppError({
    code: 'UNKNOWN_ERROR',
    category: 'unknown',
    severity: 'error',
    message: `HTTP ${status} Error`,
    userMessage: msg.message,
    recoverable: true,
    status,
    context,
  });
}

export function classifyUnknownError(
  error: unknown,
  context?: ErrorContext,
): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof DOMException && error.name === 'AbortError') {
    const msg = getErrorMessage('NETWORK_TIMEOUT');
    return new AppError({
      code: 'NETWORK_TIMEOUT',
      category: 'network',
      severity: 'warning',
      message: error.message,
      userMessage: msg.message,
      recoverable: true,
      cause: error,
      context,
    });
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const msg = getErrorMessage('NETWORK_OFFLINE');
    return new AppError({
      code: 'NETWORK_OFFLINE',
      category: 'network',
      severity: 'warning',
      message: error instanceof Error ? error.message : 'Offline',
      userMessage: msg.message,
      recoverable: true,
      cause: error,
      context,
    });
  }

  if (error instanceof TypeError) {
    const msg = getErrorMessage('NETWORK_REQUEST_FAILED');
    return new AppError({
      code: 'NETWORK_REQUEST_FAILED',
      category: 'network',
      severity: 'warning',
      message: error.message,
      userMessage: msg.message,
      recoverable: true,
      cause: error,
      context,
    });
  }

  if (error instanceof Error) {
    const msg = getErrorMessage('SYSTEM_UNEXPECTED');
    return new AppError({
      code: 'SYSTEM_UNEXPECTED',
      category: 'system',
      severity: 'error',
      message: error.message,
      userMessage: msg.message,
      recoverable: true,
      cause: error,
      context,
    });
  }

  const msg = getErrorMessage('UNKNOWN_ERROR');
  return new AppError({
    code: 'UNKNOWN_ERROR',
    category: 'unknown',
    severity: 'error',
    message: 'Unknown error value received',
    userMessage: msg.message,
    recoverable: true,
    cause: error,
    context,
  });
}
