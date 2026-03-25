import {
  Injectable,
  LoggerService as NestLoggerService,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import * as Sentry from '@sentry/nestjs';
import { LogLevel, LogEntry, LogContext } from './logger.interfaces';
import { RequestContext } from './request-context';

/**
 * Centralised structured logger using Winston.
 *
 * - In **production/staging**: single-line JSON with daily file rotation.
 * - In **development**: human-readable coloured console output.
 * - Error/Fatal levels are automatically forwarded to Sentry.
 * - Context from AsyncLocalStorage (request/correlation/trace IDs, userId) is
 *   attached automatically to every log entry.
 * - Supports multiple log levels compatible with NestJS and standard logging.
 */
@Injectable()
export class LoggerService implements NestLoggerService, OnModuleInit {
  private logger: winston.Logger;
  private serviceName = 'App';

  constructor(private readonly configService: ConfigService) {
    this.logger = this.createWinstonLogger();
  }

  onModuleInit() {
    // Ensure the logger is ready
  }

  /** Set the service/class context for all subsequent log calls in this instance. */
  setContext(name: string): void {
    this.serviceName = name;
  }

  /** Create a child logger pre-bound to a specific service name. */
  forContext(name: string): LoggerService {
    const child = new LoggerService(this.configService);
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

  private createWinstonLogger(): winston.Logger {
    const env = this.configService.get('NODE_ENV', 'development');
    const isProd = env === 'production' || env === 'staging';
    const logLevel = this.configService.get(
      'LOG_LEVEL',
      isProd ? 'info' : 'debug',
    );

    const transports: winston.transport[] = [];

    // Console transport
    transports.push(
      new winston.transports.Console({
        level: logLevel,
        format: isProd
          ? winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            )
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp({ format: 'HH:mm:ss' }),
              winston.format.printf(
                ({
                  timestamp,
                  level,
                  message,
                  service,
                  method,
                  duration,
                  ...meta
                }: any) => {
                  const svc = service ? `[${service}]` : '';
                  const mthd = method ? `${method}()` : '';
                  const dur = duration !== undefined ? ` (${duration}ms)` : '';
                  const metaStr = Object.keys(meta).length
                    ? ` ${JSON.stringify(meta)}`
                    : '';
                  return `[${String(timestamp)}] ${String(level).padEnd(5)} ${svc} ${mthd} ${String(message)}${dur}${metaStr}`;
                },
              ),
            ),
      }),
    );

    // File transport for production/staging (rotated daily)
    if (isProd) {
      transports.push(
        new DailyRotateFile({
          filename: 'logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          level: logLevel,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );

      transports.push(
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );
    }

    return winston.createLogger({
      level: logLevel,
      transports,
      exitOnError: false,
    });
  }

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

    // Attach extra context fields
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

    // Winston handles the actual output and formatting based on transports
    const winstonLevel = this.mapToWinstonLevel(level);
    this.logger.log(winstonLevel, message, entry);
  }

  private mapToWinstonLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return 'debug';
      case LogLevel.INFO:
        return 'info';
      case LogLevel.WARN:
        return 'warn';
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        return 'error';
      default:
        return 'info';
    }
  }

  /** Normalise the `context` param which may be a plain string (NestJS compat). */
  private normalizeCtx(ctx?: LogContext | string): LogContext | undefined {
    if (!ctx) return undefined;
    if (typeof ctx === 'string') return { method: ctx };
    return ctx;
  }
}
