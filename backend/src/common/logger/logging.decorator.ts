import { LoggerService } from './logger.service';

/**
 * Method decorator that auto-logs method entry, exit, duration and errors.
 */
export function Logging() {
  const logger = new LoggerService();

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    logger.setContext(className);

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      logger.debug(`Entering ${propertyKey}`, { method: propertyKey });

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - start;
        logger.info(`Exiting ${propertyKey}`, {
          method: propertyKey,
          duration,
        });
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        logger.error(
          `Error in ${propertyKey}`,
          error instanceof Error ? error : String(error),
          {
            method: propertyKey,
            duration,
          },
        );
        throw error;
      }
    };

    return descriptor;
  };
}
