export type ErrorCategory =
  | 'network'
  | 'validation'
  | 'authentication'
  | 'permission'
  | 'business'
  | 'system'
  | 'unknown';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export type ErrorCode =
  | 'NETWORK_OFFLINE'
  | 'NETWORK_TIMEOUT'
  | 'NETWORK_REQUEST_FAILED'
  | 'AUTH_REQUIRED'
  | 'AUTH_SESSION_EXPIRED'
  | 'PERMISSION_DENIED'
  | 'VALIDATION_INVALID_INPUT'
  | 'BUSINESS_RULE_VIOLATION'
  | 'SYSTEM_UNEXPECTED'
  | 'UNKNOWN_ERROR';

export interface ErrorContext {
  source?: string;
  action?: string;
  route?: string;
  metadata?: Record<string, unknown>;
}

export interface AppErrorOptions {
  code: ErrorCode;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  recoverable: boolean;
  status?: number;
  cause?: unknown;
  context?: ErrorContext;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly userMessage: string;
  readonly recoverable: boolean;
  readonly status?: number;
  readonly cause?: unknown;
  readonly context?: ErrorContext;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = 'AppError';
    this.code = options.code;
    this.category = options.category;
    this.severity = options.severity;
    this.userMessage = options.userMessage;
    this.recoverable = options.recoverable;
    this.status = options.status;
    this.cause = options.cause;
    this.context = options.context;
  }
}
