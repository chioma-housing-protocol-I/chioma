import { Logger } from '@nestjs/common';

/**
 * Method decorator that auto-logs method entry, exit, duration and errors.
 */
export function Logging() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const logger = new Logger(className);

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      logger.debug(`Entering ${propertyKey}`, { method: propertyKey });

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - start;
        logger.log(`Exiting ${propertyKey}`, {
          method: propertyKey,
          duration,
        });
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        logger.error(
          `Error in ${propertyKey}`,
          error instanceof Error ? error.stack : String(error),
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
