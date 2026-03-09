import type { ErrorCode } from './types';

type MessageTemplate = {
  title: string;
  message: string;
  guidance: string;
};

const ERROR_MESSAGES: Record<ErrorCode, MessageTemplate> = {
  NETWORK_OFFLINE: {
    title: 'You are offline',
    message: 'We could not reach the server because your device is offline.',
    guidance: 'Check your connection and try again.',
  },
  NETWORK_TIMEOUT: {
    title: 'Request timed out',
    message: 'The server took too long to respond.',
    guidance: 'Try again in a few seconds.',
  },
  NETWORK_REQUEST_FAILED: {
    title: 'Network request failed',
    message: 'Something interrupted the request to the server.',
    guidance: 'Retry now or refresh the page.',
  },
  AUTH_REQUIRED: {
    title: 'Sign-in required',
    message: 'Your account is not authenticated for this action.',
    guidance: 'Sign in and try again.',
  },
  AUTH_SESSION_EXPIRED: {
    title: 'Session expired',
    message: 'Your session has expired for security reasons.',
    guidance: 'Sign in again to continue.',
  },
  PERMISSION_DENIED: {
    title: 'Permission denied',
    message: 'Your account does not have access to this resource.',
    guidance: 'Contact support if you believe this is incorrect.',
  },
  VALIDATION_INVALID_INPUT: {
    title: 'Check your input',
    message: 'Some fields contain invalid or missing information.',
    guidance: 'Review highlighted fields and submit again.',
  },
  BUSINESS_RULE_VIOLATION: {
    title: 'Action unavailable',
    message: 'This action conflicts with current business rules.',
    guidance: 'Update the information and try again.',
  },
  SYSTEM_UNEXPECTED: {
    title: 'Unexpected system error',
    message: 'Something unexpected happened in the application.',
    guidance: 'Retry now. If this continues, contact support.',
  },
  UNKNOWN_ERROR: {
    title: 'Something went wrong',
    message: 'An unknown error occurred.',
    guidance: 'Try again or go back to a safe page.',
  },
};

export function getErrorMessage(code: ErrorCode): MessageTemplate {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.UNKNOWN_ERROR;
}
