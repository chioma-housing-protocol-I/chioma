import { LoggerService, LogContext } from './logger.service';

export function Logging(contextInfo: Partial<LogContext> = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const logger: LoggerService = this.logger || new LoggerService();
      const method = propertyKey;
      const service = target.constructor.name;
      const start = Date.now();
      try {
        logger.info(`START ${service}.${method}`, {
          ...contextInfo,
          service,
          method,
        });
        const result = await originalMethod.apply(this, args);
        logger.info(`END ${service}.${method}`, {
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
