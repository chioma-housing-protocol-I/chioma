import { Injectable, Logger, Scope } from '@nestjs/common';
import * as fs from 'fs';
import * as Sentry from '@sentry/nestjs';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface LogContext {
  service?: string;
  method?: string;
  userId?: string;
  requestId?: string;
  correlationId?: string;
  traceId?: string;
  duration?: number;
  context?: any;
}

export interface LogEntry extends LogContext {
  timestamp: string;
  level: LogLevel;
  message: string;
  error?: string;
}

/** A destination log entries are written to. */
export interface LogTransport {
  write(entry: LogEntry): void;
}

/** Local, non-durable: NestJS console output. Always available for dev. */
export class ConsoleTransport implements LogTransport {
  constructor(
    private readonly nestLogger: Logger = new Logger(LoggerService.name),
  ) {}

  write(entry: LogEntry): void {
    const logStr = JSON.stringify(entry);
    if (entry.level === 'ERROR' || entry.level === 'FATAL') {
      this.nestLogger.error(logStr);
    } else if (entry.level === 'WARN') {
      this.nestLogger.warn(logStr);
    } else {
      this.nestLogger.log(logStr);
    }
  }
}

/** Local, non-durable: append-only file on the instance's own disk. */
export class FileTransport implements LogTransport {
  constructor(private readonly filePath: string) {}

  write(entry: LogEntry): void {
    fs.appendFileSync(this.filePath, JSON.stringify(entry) + '\n');
  }
}

/**
 * Durable sink: ships WARN+ entries to Sentry so they survive instance
 * restarts and scale-in. Silently disabled when SENTRY_DSN isn't set.
 */
export class SentryTransport implements LogTransport {
  write(entry: LogEntry): void {
    const { level, message, error, timestamp, ...extra } = entry;
    if (level === 'ERROR' || level === 'FATAL') {
      Sentry.captureException(new Error(error || message), {
        level: level === 'FATAL' ? 'fatal' : 'error',
        extra: { message, timestamp, ...extra },
      });
    } else if (level === 'WARN') {
      Sentry.captureMessage(message, { level: 'warning', extra });
    } else {
      Sentry.addBreadcrumb({
        category: 'log',
        level: 'info',
        message,
        data: extra,
      });
    }
  }
}

const TRANSPORT_FACTORIES: Record<
  string,
  (env: NodeJS.ProcessEnv) => LogTransport | null
> = {
  console: () => new ConsoleTransport(),
  file: (env) => new FileTransport(env.LOG_FILE || 'logs/app.log'),
  sentry: (env) => (env.SENTRY_DSN ? new SentryTransport() : null),
};

/**
 * Reads LOG_TRANSPORT (comma-separated, e.g. "console,sentry") to pick
 * transports. Defaults to console-only in development/test, and
 * console+sentry in staging/production so logs reach a durable sink there
 * without any extra configuration.
 */
export function resolveTransports(
  env: NodeJS.ProcessEnv = process.env,
): LogTransport[] {
  const configured = env.LOG_TRANSPORT;
  const names = configured
    ? configured
        .split(',')
        .map((name) => name.trim().toLowerCase())
        .filter(Boolean)
    : env.NODE_ENV === 'production' || env.NODE_ENV === 'staging'
      ? ['console', 'sentry']
      : ['console'];

  const transports = names
    .map((name) => TRANSPORT_FACTORIES[name]?.(env))
    .filter((t): t is LogTransport => t != null);

  return transports.length > 0 ? transports : [new ConsoleTransport()];
}

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService {
  private readonly transports: LogTransport[];

  constructor() {
    this.transports = resolveTransports();
  }

  private log(
    level: LogLevel,
    message: string,
    context: LogContext = {},
    error?: Error,
  ) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      ...context,
      message,
      error: error ? error.stack || error.message : undefined,
    };
    for (const transport of this.transports) {
      transport.write(logEntry);
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('DEBUG', message, context);
  }
  info(message: string, context?: LogContext) {
    this.log('INFO', message, context);
  }
  warn(message: string, context?: LogContext) {
    this.log('WARN', message, context);
  }
  error(message: string, error?: Error, context?: LogContext) {
    this.log('ERROR', message, context, error);
  }
  fatal(message: string, error?: Error, context?: LogContext) {
    this.log('FATAL', message, context, error);
  }
}
