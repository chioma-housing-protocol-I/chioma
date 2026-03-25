/**
 * Consistent structured logging interfaces.
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

/** Structured log entry emitted by LoggerService. */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  method?: string;
  userId?: string;
  message: string;
  duration?: number;
  correlationId?: string;
  requestId?: string;
  traceId?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  context?: Record<string, unknown>;
}

/** Context bag passed alongside log calls. */
export interface LogContext {
  method?: string;
  userId?: string;
  duration?: number;
  correlationId?: string;
  requestId?: string;
  traceId?: string;
  [key: string]: unknown;
}
