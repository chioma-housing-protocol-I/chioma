import { Injectable, Scope } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as Sentry from '@sentry/nestjs';
import { ClsService } from './cls.service';

@Injectable({ scope: Scope.DEFAULT })
export class LoggerService {
  private logger: winston.Logger;

  constructor(private readonly cls: ClsService) {
    const isProd = process.env.NODE_ENV === 'production';

    const levels = {
      fatal: 0,
      error: 1,
      warn: 2,
      info: 3,
      debug: 4,
    };

    const colors = {
      fatal: 'red',
      error: 'red',
      warn: 'yellow',
      info: 'green',
      debug: 'blue',
    };

    winston.addColors(colors);

    const format = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
      winston.format.printf((info) => {
        const context = this.cls.get() || {};
        const logPayload = {
          timestamp: info.timestamp,
          level: String(info.level).toUpperCase(),
          message: info.message,
          service: context.service || 'Global',
          method: context.method,
          userId: context.userId,
          requestId: context.requestId,
          correlationId: context.correlationId,
          traceId: context.traceId,
          duration: info.duration,
          context: info.context || {},
          ...(info.error
            ? {
                error: {
                  message:
                    (info.error as any).message ||
                    ((info.error as any).toString
                      ? (info.error as any).toString()
                      : JSON.stringify(info.error)),
                  stack: (info.error as any).stack,
                },
              }
            : {}),
        };

        if (isProd) {
          return JSON.stringify(logPayload);
        }

        const colorizer = winston.format.colorize();
        const levelStr = colorizer.colorize(
          String(info.level),
          String(info.level).toUpperCase(),
        );
        const contextStr = context.method
          ? ` [${context.service}:${context.method}]`
          : '';
        const reqIdStr = context.requestId
          ? ` (reqId: ${context.requestId})`
          : '';

        return `${String(info.timestamp)} ${levelStr}${contextStr}${reqIdStr}: ${String(
          info.message,
        )}${info.duration ? ` (${Number(info.duration)}ms)` : ''}`;
      }),
    );

    const transports: winston.transport[] = [new winston.transports.Console()];

    if (isProd) {
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: 'logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
        }),
      );
    }

    this.logger = winston.createLogger({
      level: isProd ? 'info' : 'debug',
      levels,
      format,
      transports,
    });
  }

  debug(message: string, context?: any): void {
    this.logger.debug(message, { context });
  }

  info(message: string, context?: any): void {
    this.logger.info(message, { context });
  }

  warn(message: string, context?: any): void {
    this.logger.warn(message, { context });
  }

  error(message: string, error?: Error, context?: any): void {
    this.logger.error(message, { error, context });
    if (error) {
      Sentry.captureException(error, { extra: context });
    }
  }

  fatal(message: string, error?: Error, context?: any): void {
    this.logger.log('fatal', message, { error, context });
    if (error) {
      Sentry.captureException(error, { level: 'fatal', extra: context });
    }
  }
}
