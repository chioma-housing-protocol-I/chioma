import { LoggerService, LogContext } from './logger.service';

/** Minimal interface covering both NestJS and custom logger shapes. */
interface LoggerLike {
  info?: (message: string, metadata: Record<string, unknown>) => void;
  log?: (message: string, metadata: Record<string, unknown>) => void;
  error: (message: string, error: unknown, metadata?: Record<string, unknown>) => void;
}

export function Logging(contextInfo: Partial<LogContext> = {}) {
  return function (
    target: { constructor: { name: string } },
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;
    descriptor.value = async function (this: { logger?: LoggerLike }, ...args: unknown[]) {
      const logger: LoggerLike = this.logger ?? new LoggerService();
      const logInfo = (message: string, metadata: Record<string, unknown>) => {
        if (typeof logger.info === 'function') {
          logger.info(message, metadata);
          return;
        }
        if (typeof logger.log === 'function') {
          logger.log(message, metadata);
        }
      };
      const method = propertyKey;
      const service = target.constructor.name;
      const start = Date.now();
      try {
        logInfo(`START ${service}.${method}`, {
          ...contextInfo,
          service,
          method,
        });
        const result = await originalMethod.apply(this, args);
        logInfo(`END ${service}.${method}`, {
          ...contextInfo,
          service,
          method,
          duration: Date.now() - start,
        });
        return result;
      } catch (error) {
        logger.error(`ERROR in ${service}.${method}`, error, {
          ...contextInfo,
          service,
          method,
          duration: Date.now() - start,
        });
        throw error;
      }
    };
    return descriptor;
  };
}
