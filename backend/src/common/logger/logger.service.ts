import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { LogLevel, LogEntry, LogContext } from './logger.interfaces';
import { RequestContext } from './request-context';

/**
 * Centralised structured logger.
 *
 * - In **production** every log is a single-line JSON object.
 * - In **development** a human-readable coloured line is printed.
 * - Error/Fatal levels are automatically forwarded to Sentry.
 * - Context from AsyncLocalStorage (request/correlation/trace IDs, userId) is
 *   attached automatically.
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private serviceName = 'App';

  /** Set the service/class context for all subsequent log calls. */
  setContext(name: string): void {
    this.serviceName = name;
  }

  /** Create a child logger pre-bound to a specific service name. */
  forContext(name: string): LoggerService {
    const child = new LoggerService();
    child.serviceName = name;
    return child;
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  debug(message: string, context?: LogContext | string): void {
    this.write(LogLevel.DEBUG, message, undefined, this.normalizeCtx(context));
  }

  info(message: string, context?: LogContext | string): void {
    this.write(LogLevel.INFO, message, undefined, this.normalizeCtx(context));
  }

  /** Alias so NestJS `Logger.log()` calls still work. */
  log(message: string, context?: LogContext | string): void {
    this.info(message, context);
  }

  warn(message: string, context?: LogContext | string): void {
    this.write(LogLevel.WARN, message, undefined, this.normalizeCtx(context));
  }

  error(
    message: string,
    error?: Error | string,
    context?: LogContext | string,
  ): void {
    const err = error instanceof Error ? error : undefined;
    const ctx = this.normalizeCtx(context);
    this.write(LogLevel.ERROR, message, err, ctx);

    // Forward to Sentry
    if (err) {
      Sentry.captureException(err);
    } else {
      Sentry.captureMessage(message, 'error');
    }
  }

  fatal(
    message: string,
    error?: Error | string,
    context?: LogContext | string,
  ): void {
    const err = error instanceof Error ? error : undefined;
    const ctx = this.normalizeCtx(context);
    this.write(LogLevel.FATAL, message, err, ctx);

    if (err) {
      Sentry.captureException(err);
    } else {
      Sentry.captureMessage(message, 'fatal');
    }
  }

  verbose?(message: string, context?: LogContext | string): void {
    this.debug(message, context);
  }

  /* ------------------------------------------------------------------ */
  /*  Internal                                                           */
  /* ------------------------------------------------------------------ */

  private write(
    level: LogLevel,
    message: string,
    error?: Error,
    ctx?: LogContext,
  ): void {
    const reqCtx = RequestContext.current();

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      ...(ctx?.method && { method: ctx.method }),
      ...(ctx?.duration !== undefined && { duration: ctx.duration }),
      userId: ctx?.userId ?? reqCtx.userId,
      correlationId: ctx?.correlationId ?? reqCtx.correlationId,
      requestId: ctx?.requestId ?? reqCtx.requestId,
      traceId: ctx?.traceId ?? reqCtx.traceId,
    };

    // Attach extra context fields (any keys not consumed above)
    const extraKeys = ctx
      ? Object.keys(ctx).filter(
          (k) =>
            ![
              'method',
              'userId',
              'duration',
              'correlationId',
              'requestId',
              'traceId',
            ].includes(k),
        )
      : [];
    if (extraKeys.length > 0) {
      entry.context = {};
      for (const k of extraKeys) {
        entry.context[k] = ctx![k];
      }
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    const isProd = process.env.NODE_ENV === 'production';

    if (isProd) {
      // Structured JSON (one line per entry)
      this.emit(level, JSON.stringify(entry));
    } else {
      // Human-readable
      const parts = [
        `[${entry.timestamp}]`,
        level.padEnd(5),
        `[${this.serviceName}]`,
        ctx?.method ? `${ctx.method}()` : '',
        message,
        ctx?.duration !== undefined ? `(${ctx.duration}ms)` : '',
        error ? `\n  ${error.stack ?? error.message}` : '',
      ].filter(Boolean);
      this.emit(level, parts.join(' '));
    }
  }

  private emit(level: LogLevel, text: string): void {
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(text);
        break;
      case LogLevel.WARN:
        console.warn(text);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(text);
        break;
      default:
        console.log(text);
    }
  }

  /** Normalise the `context` param which may be a plain string (NestJS compat). */
  private normalizeCtx(ctx?: LogContext | string): LogContext | undefined {
    if (!ctx) return undefined;
    if (typeof ctx === 'string') return { method: ctx };
    return ctx;
  }
}
