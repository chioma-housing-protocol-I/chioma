import {
  Injectable,
  LoggerService as NestLoggerService,
  Optional,
} from '@nestjs/common';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { trace } from '@opentelemetry/api';
import { requestContext } from '../request-context/request-context';

type AnyRecord = Record<string, any>;

const DEFAULT_REDACT_KEYS = [
  'password',
  'pass',
  'pwd',
  'secret',
  'token',
  'access_token',
  'refresh_token',
  'id_token',
  'authorization',
  'cookie',
  'set-cookie',
  'api_key',
  'apikey',
  'private_key',
  'client_secret',
  'pin',
  'otp',
];

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[\s-]/g, '_');
}

function getRedactKeysFromEnv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((k) => normalizeKey(k))
    .filter(Boolean);
}

function parseRetentionDays(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) return fallback;
  const match = value.trim().match(/^(\d+)(d)?$/i);
  if (!match) return fallback;
  return Math.max(1, Number(match[1]));
}

/**
 * Error instances have non-enumerable `message`/`stack` properties, so
 * `JSON.stringify(err)` yields `{}`. Convert any Error found in log metadata
 * into a plain, JSON-serialisable object so stack traces are never lost.
 */
export function serializeErrors(value: unknown, depth = 0): unknown {
  if (value instanceof Error) {
    const { name, message, stack } = value;
    const extra: AnyRecord = { ...(value as unknown as AnyRecord) };
    return { ...extra, name, message, stack };
  }
  if (depth > 3 || value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    if (!value.some((v) => v != null && typeof v === 'object')) return value;
    return value.map((v) => serializeErrors(v, depth + 1));
  }
  // Only walk plain objects; leave Dates, Buffers, class instances etc. as-is.
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return value;
  const out: AnyRecord = {};
  for (const [k, v] of Object.entries(value as AnyRecord)) {
    out[k] = serializeErrors(v, depth + 1);
  }
  return out;
}

/**
 * Winston format that serialises Error values in the entry's metadata in
 * place. The info object itself is mutated rather than copied so winston's
 * internal Symbol keys (level / message / splat) are preserved.
 */
const serializeErrorsFormat = winston.format((info) => {
  for (const [key, value] of Object.entries(info)) {
    if (value != null && typeof value === 'object') {
      (info as AnyRecord)[key] = serializeErrors(value);
    }
  }
  return info;
});

function createRedactor(options: {
  redactKeys: string[];
  placeholder: string;
  maxDepth: number;
}) {
  const redactSet = new Set(options.redactKeys.map(normalizeKey));
  const placeholder = options.placeholder;
  const maxDepth = options.maxDepth;

  const redact = (value: unknown, depth: number): unknown => {
    if (value == null) return value;
    if (depth > maxDepth) return '[Truncated]';
    if (typeof value !== 'object') return value;

    if (Array.isArray(value)) {
      return value.map((v) => redact(v, depth + 1));
    }

    if (depth === 0) {
      const obj = value as AnyRecord;
      for (const [k, v] of Object.entries(obj)) {
        const nk = normalizeKey(k);
        if (redactSet.has(nk)) {
          obj[k] = placeholder;
        } else {
          obj[k] = redact(v, depth + 1);
        }
      }
      return obj;
    }

    const obj = value as AnyRecord;
    const out: AnyRecord = {};
    for (const [k, v] of Object.entries(obj)) {
      const nk = normalizeKey(k);
      if (redactSet.has(nk)) {
        out[k] = placeholder;
      } else {
        out[k] = redact(v, depth + 1);
      }
    }
    return out;
  };

  return redact;
}

/**
 * Production-ready logging service with Winston
 * Features:
 * - Environment-based log levels
 * - Log rotation with daily files
 * - Structured JSON output by default (set LOG_FORMAT=simple for
 *   human-readable dev output)
 * - Every JSON entry carries ISO-8601 timestamp, level, message, context,
 *   service, environment, hostname, pid and (when present) request / trace ids
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
      'json';
    const serviceName =
      this.configService?.get('SERVICE_NAME') ||
      process.env.SERVICE_NAME ||
      process.env.OTEL_SERVICE_NAME ||
      'chioma-backend';
    const logDir =
      this.configService?.get('LOG_DIR') || process.env.LOG_DIR || 'logs';
    const logMaxSize =
      this.configService?.get('LOG_MAX_SIZE') ||
      process.env.LOG_MAX_SIZE ||
      '20m';
    const logMaxFiles =
      this.configService?.get('LOG_MAX_FILES') ||
      process.env.LOG_MAX_FILES ||
      '14d';
    const errorLogMaxFiles =
      this.configService?.get('LOG_ERROR_MAX_FILES') ||
      process.env.LOG_ERROR_MAX_FILES ||
      '30d';

    const redactKeys = [
      ...DEFAULT_REDACT_KEYS,
      ...getRedactKeysFromEnv(
        this.configService?.get('LOG_REDACT_KEYS') ||
          process.env.LOG_REDACT_KEYS,
      ),
    ];
    const redactPlaceholder =
      this.configService?.get('LOG_REDACT_PLACEHOLDER') ||
      process.env.LOG_REDACT_PLACEHOLDER ||
      '[REDACTED]';
    const redactMaxDepthRaw =
      this.configService?.get('LOG_REDACT_MAX_DEPTH') ||
      process.env.LOG_REDACT_MAX_DEPTH;
    const redactMaxDepth = Math.max(
      1,
      Number.isFinite(Number(redactMaxDepthRaw))
        ? Number(redactMaxDepthRaw)
        : 6,
    );

    const redact = createRedactor({
      redactKeys,
      placeholder: redactPlaceholder,
      maxDepth: redactMaxDepth,
    });

    const useJson = logFormat !== 'simple' || env === 'production';

    // Fields attached to every entry so logs can be filtered by service /
    // instance once they are shipped to the central log store.
    const baseFields = {
      service: serviceName,
      environment: env,
      hostname: os.hostname(),
      pid: process.pid,
    };

    // Define log format
    const formats: winston.Logform.Format[] = [
      // ISO-8601 for JSON so log aggregators (Loki, ELK, Datadog) can parse
      // the timestamp without a custom pattern.
      winston.format.timestamp(
        useJson ? undefined : { format: 'YYYY-MM-DD HH:mm:ss' },
      ),
      winston.format.errors({ stack: true }),
      serializeErrorsFormat(),
      winston.format((info) => {
        // Redact sensitive keys anywhere in the info object, including metadata.
        // Winston expects us to return the (possibly modified) info object.
        return redact(info, 0) as winston.Logform.TransformableInfo;
      })(),
    ];

    // Structured JSON everywhere unless LOG_FORMAT=simple is set explicitly
    // (production always emits JSON).
    if (useJson) {
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
          filename: path.join(logDir, 'application-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: logMaxSize,
          maxFiles: logMaxFiles,
          level: logLevel,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            serializeErrorsFormat(),
            winston.format.json(),
          ),
        }),
      );

      // Error logs with rotation
      transports.push(
        new DailyRotateFile({
          filename: path.join(logDir, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: logMaxSize,
          maxFiles: errorLogMaxFiles,
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            serializeErrorsFormat(),
            winston.format.json(),
          ),
        }),
      );
    }

    return winston.createLogger({
      level: logLevel,
      defaultMeta: useJson ? baseFields : undefined,
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
    this.logger.info(message, this.buildLogPayload(finalContext, meta));
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
      this.logger.error(
        message,
        this.buildLogPayload(contextStr, { stack: traceOrMeta }),
      );
    } else {
      this.logger.error(message, this.buildLogPayload(contextStr, traceOrMeta));
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
    this.logger.warn(message, this.buildLogPayload(finalContext, meta));
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
    this.logger.debug(message, this.buildLogPayload(finalContext, meta));
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
    this.logger.verbose(message, this.buildLogPayload(finalContext, meta));
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

  private buildLogPayload(
    context: string,
    meta: Record<string, any> = {},
  ): Record<string, any> {
    const ctx = requestContext.get();
    const spanContext = trace.getActiveSpan()?.spanContext();

    return {
      context,
      ...(ctx?.requestId ? { requestId: ctx.requestId } : {}),
      ...(spanContext?.traceId
        ? { traceId: spanContext.traceId, spanId: spanContext.spanId }
        : {}),
      ...(ctx?.correlationId ? { correlationId: ctx.correlationId } : {}),
      ...(ctx?.userId ? { userId: ctx.userId } : {}),
      ...meta,
    };
  }

  /**
   * Create a child logger with a specific context
   */
  child(context: string): LoggerService {
    const childLogger = new LoggerService(this.configService, context);
    return childLogger;
  }

  async cleanupOldLogFiles(
    logDir = this.configService?.get('LOG_DIR') ||
      process.env.LOG_DIR ||
      'logs',
    retentionDays = parseRetentionDays(
      this.configService?.get('LOG_MAX_FILES') || process.env.LOG_MAX_FILES,
      14,
    ),
  ): Promise<number> {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    let removed = 0;

    try {
      const entries = await fs.readdir(logDir, { withFileTypes: true });
      await Promise.all(
        entries
          .filter((entry) => entry.isFile() && entry.name.endsWith('.log'))
          .map(async (entry) => {
            const filePath = path.join(logDir, entry.name);
            const stat = await fs.stat(filePath);
            if (stat.mtimeMs >= cutoff) {
              return;
            }

            await fs.unlink(filePath);
            removed++;
          }),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.warn('Log cleanup failed', { error: (error as Error).message });
      }
    }

    return removed;
  }
}
