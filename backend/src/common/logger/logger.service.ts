import { Injectable, Scope } from '@nestjs/common';
import * as fs from 'fs';

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

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService {
  private logToFile = process.env.NODE_ENV === 'production';
  private logFile = 'logs/app.log';

  private log(level: LogLevel, message: string, context: LogContext = {}, error?: Error) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      ...context,
      message,
      error: error ? error.stack || error.message : undefined,
    };
    const logStr = JSON.stringify(logEntry);
    if (this.logToFile) {
      fs.appendFileSync(this.logFile, logStr + '\n');
    } else {
      // Console output for dev
      if (level === 'ERROR' || level === 'FATAL') {
        console.error(logStr);
      } else if (level === 'WARN') {
        console.warn(logStr);
      } else {
        console.log(logStr);
      }
    }
    // TODO: Add Sentry, CloudWatch, ELK integration as needed
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
