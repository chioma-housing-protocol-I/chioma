import { LoggerService } from '../services/logger.service';
import { ClsService } from '../services/cls.service';

export function Logging(options: { service?: string } = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cls = new ClsService();
      const logger = new LoggerService(cls);
      const startTime = Date.now();
      const serviceName = options.service || target.constructor.name;

      cls.set('service', serviceName);
      cls.set('method', propertyKey);

      logger.info(`Entering ${serviceName}.${propertyKey}`);

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        logger.info(`Exiting ${serviceName}.${propertyKey}`, { duration });
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`Error in ${serviceName}.${propertyKey}`, error, {
          duration,
        });
        throw error;
      }
    };

    return descriptor;
  };
}
