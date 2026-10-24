/**
 * Frontend Logger service.
 * Provides unified, structured logging across the frontend application.
 * Prevents log pollution and information disclosure in production environments.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export class Logger {
  private readonly context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  private static defaultInstance = new Logger();

  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const prefix = this.context ? `[${this.context}]` : '';
    return `[${timestamp}] [${level.toUpperCase()}]${prefix ? ` ${prefix}` : ''} ${message}`;
  }

  /**
   * Log standard informational message. Suppressed in production to prevent console clutter.
   */
  log(message: string, ...args: unknown[]): void {
    if (this.isProduction()) {
      return;
    }
    // eslint-disable-next-line no-console
    console.log(this.formatMessage('info', message), ...args);
  }

  /**
   * Log informational message. Suppressed in production to prevent console clutter.
   */
  info(message: string, ...args: unknown[]): void {
    if (this.isProduction()) {
      return;
    }
    // eslint-disable-next-line no-console
    console.info(this.formatMessage('info', message), ...args);
  }

  /**
   * Log warning message. Preserved across all environments.
   */
  warn(message: string, ...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.warn(this.formatMessage('warn', message), ...args);
  }

  /**
   * Log error message. Preserved across all environments and dispatched to error reporter if present.
   */
  error(message: string, ...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.error(this.formatMessage('error', message), ...args);

    if (typeof window !== 'undefined' && window.__CHIOMA_ERROR_REPORTER__) {
      const err = args.find((arg): arg is Error => arg instanceof Error);
      const extraContext = args.filter((arg) => !(arg instanceof Error));
      window.__CHIOMA_ERROR_REPORTER__({
        name: err ? err.name : 'LoggerError',
        message: `${message}${err ? `: ${err.message}` : ''}`,
        stack: err?.stack,
        context: {
          loggerContext: this.context,
          details: extraContext.length > 0 ? extraContext : undefined,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Log debug message. Suppressed in production.
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.isProduction()) {
      return;
    }
    // eslint-disable-next-line no-console
    console.debug(this.formatMessage('debug', message), ...args);
  }

  /**
   * Create a scoped child logger with a sub-context.
   */
  createChild(context: string): Logger {
    const nextContext = this.context ? `${this.context}:${context}` : context;
    return new Logger(nextContext);
  }

  // Static API delegates to default singleton instance
  static log(message: string, ...args: unknown[]): void {
    Logger.defaultInstance.log(message, ...args);
  }

  static info(message: string, ...args: unknown[]): void {
    Logger.defaultInstance.info(message, ...args);
  }

  static warn(message: string, ...args: unknown[]): void {
    Logger.defaultInstance.warn(message, ...args);
  }

  static error(message: string, ...args: unknown[]): void {
    Logger.defaultInstance.error(message, ...args);
  }

  static debug(message: string, ...args: unknown[]): void {
    Logger.defaultInstance.debug(message, ...args);
  }

  static createChild(context: string): Logger {
    return Logger.defaultInstance.createChild(context);
  }
}

export const LoggerService = Logger;
export default Logger;
