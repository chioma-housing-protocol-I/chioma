import {
  Injectable,
  LoggerService as NestLoggerService,
  Optional,
} from '@nestjs/common';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { ConfigService } from '@nestjs/config';

/**
 * Production-ready logging service with Winston
 * Features:
 * - Environment-based log levels
 * - Log rotation with daily files
 * - JSON formatting for production
 * - Multiple transports (console, file, error file)
 * - Structured logging with metadata
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor(
    @Optional() private configService?: ConfigService,
    @Optional() context?: string,
  ) {
    this.context = context;
    this.logger = this.createLogger();
  }

  /**
   * Create Winston logger with appropriate configuration
   */
  private createLogger(): winston.Logger {
    const env =
      this.configService?.get('NODE_ENV') ||
      process.env.NODE_ENV ||
      'development';
    const logLevel =
      this.configService?.get('LOG_LEVEL') ||
      process.env.LOG_LEVEL ||
      (env === 'production' ? 'info' : 'debug');
    const logFormat =
      this.configService?.get('LOG_FORMAT') ||
      process.env.LOG_FORMAT ||
      (env === 'production' ? 'json' : 'simple');

    // Define log format
    const formats: winston.Logform.Format[] = [
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
    ];

    // Add JSON format for production, pretty print for development
    if (logFormat === 'json' || env === 'production') {
      formats.push(winston.format.json());
    } else {
      formats.push(
        winston.format.colorize(),
        winston.format.printf(
          ({ timestamp, level, message, context, ...meta }) => {
            const contextValue = context ?? '';
            const contextStr =
              typeof contextValue === 'string'
                ? contextValue
                : JSON.stringify(contextValue);
            const ctx = contextStr ? `[${contextStr}]` : '';
            const metaStr = Object.keys(meta).length
              ? JSON.stringify(meta)
              : '';
            return `${String(timestamp)} ${String(level)} ${ctx} ${String(message)} ${metaStr}`;
          },
        ),
      );
    }

    const transports: winston.transport[] = [];

    // Console transport (always enabled)
    transports.push(
      new winston.transports.Console({
        level: logLevel,
        format: winston.format.combine(...formats),
      }),
    );

    // File transports for production and staging (but not test)
    if ((env === 'production' || env === 'staging') && env !== 'test') {
      // Combined logs with rotation
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

      // Error logs with rotation
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

  /**
   * Set context for subsequent log messages
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Log a message at the 'log' level (info)
   */
  log(message: string, context?: string): void;
  log(message: string, meta?: Record<string, any>, context?: string): void;
  log(
    message: string,
    metaOrContext?: Record<string, any> | string,
    context?: string,
  ): void {
    const { meta, ctx } = this.parseArgs(metaOrContext, context);
    const contextStr = ctx || this.context;
    const finalContext =
      typeof contextStr === 'string' ? contextStr : String(contextStr);
    this.logger.info(message, { context: finalContext, ...meta });
  }

  /**
   * Log a message at the 'error' level
   */
  error(message: string, trace?: string, context?: string): void;
  error(message: string, meta?: Record<string, any>, context?: string): void;
  error(
    message: string,
    traceOrMeta?: string | Record<string, any>,
    context?: string,
  ): void {
    const ctx = context || this.context;
    const contextStr = typeof ctx === 'string' ? ctx : String(ctx);

    if (typeof traceOrMeta === 'string') {
      this.logger.error(message, { context: contextStr, stack: traceOrMeta });
    } else {
      this.logger.error(message, { context: contextStr, ...traceOrMeta });
    }
  }

  /**
   * Log a message at the 'warn' level
   */
  warn(message: string, context?: string): void;
  warn(message: string, meta?: Record<string, any>, context?: string): void;
  warn(
    message: string,
    metaOrContext?: Record<string, any> | string,
    context?: string,
  ): void {
    const { meta, ctx } = this.parseArgs(metaOrContext, context);
    const contextStr = ctx || this.context;
    const finalContext =
      typeof contextStr === 'string' ? contextStr : String(contextStr);
    this.logger.warn(message, { context: finalContext, ...meta });
  }

  /**
   * Log a message at the 'debug' level
   */
  debug(message: string, context?: string): void;
  debug(message: string, meta?: Record<string, any>, context?: string): void;
  debug(
    message: string,
    metaOrContext?: Record<string, any> | string,
    context?: string,
  ): void {
    const { meta, ctx } = this.parseArgs(metaOrContext, context);
    const contextStr = ctx || this.context;
    const finalContext =
      typeof contextStr === 'string' ? contextStr : String(contextStr);
    this.logger.debug(message, { context: finalContext, ...meta });
  }

  /**
   * Log a message at the 'verbose' level
   */
  verbose(message: string, context?: string): void;
  verbose(message: string, meta?: Record<string, any>, context?: string): void;
  verbose(
    message: string,
    metaOrContext?: Record<string, any> | string,
    context?: string,
  ): void {
    const { meta, ctx } = this.parseArgs(metaOrContext, context);
    const contextStr = ctx || this.context;
    const finalContext =
      typeof contextStr === 'string' ? contextStr : String(contextStr);
    this.logger.verbose(message, { context: finalContext, ...meta });
  }

  /**
   * Parse arguments to extract metadata and context
   */
  private parseArgs(
    metaOrContext?: Record<string, any> | string,
    context?: string,
  ): { meta: Record<string, any>; ctx?: string } {
    if (typeof metaOrContext === 'string') {
      return { meta: {}, ctx: metaOrContext };
    }
    return { meta: metaOrContext || {}, ctx: context };
  }

  /**
   * Create a child logger with a specific context
   */
  child(context: string): LoggerService {
    const childLogger = new LoggerService(this.configService, context);
    return childLogger;
  }
}
