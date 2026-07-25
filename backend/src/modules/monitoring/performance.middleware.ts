import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PerformanceMonitorService } from './performance-monitor.service';

export interface RequestWithTiming extends Request {
  startTime?: number;
  endTime?: number;
  responseTime?: number;
}

@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PerformanceMiddleware.name);

  constructor(private readonly performanceMonitor: PerformanceMonitorService) {}

  use(req: RequestWithTiming, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    req.startTime = startTime;

    // Capture the original end method
    const originalEnd = res.end;
    const originalSend = res.send;
    const performanceMonitor = this.performanceMonitor;
    const logger = this.logger;

    // Override res.end to capture timing
    res.end = function (chunk?: any, encoding?: any) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      req.endTime = endTime;
      req.responseTime = responseTime;

      // Record performance metrics
      try {
        const performanceMetrics = {
          timestamp: new Date(startTime),
          endpoint: req.route?.path || req.path,
          method: req.method,
          responseTime,
          statusCode: res.statusCode,
          userAgent: req.get('User-Agent'),
          userId: (req as any).user?.id,
          memoryUsage: process.memoryUsage(),
        };

        // Only record metrics for API endpoints (not static files)
        if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
          performanceMonitor.recordRequestMetrics(performanceMetrics);
        }

        // Log errors
        if (res.statusCode >= 400) {
          logger.warn(
            `Error response: ${req.method} ${req.path} - ${responseTime}ms (Status: ${res.statusCode})`,
          );
        }
      } catch (error) {
        logger.error('Failed to record performance metrics:', error);
      }

      // Call the original end method
      originalEnd.call(this, chunk, encoding);
    }.bind(res);

    // Override res.send to capture timing for responses that use send()
    res.send = function (body?: any) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      req.endTime = endTime;
      req.responseTime = responseTime;

      // Record performance metrics (same as above)
      try {
        const performanceMetrics = {
          timestamp: new Date(startTime),
          endpoint: req.route?.path || req.path,
          method: req.method,
          responseTime,
          statusCode: res.statusCode,
          userAgent: req.get('User-Agent'),
          userId: (req as any).user?.id,
          memoryUsage: process.memoryUsage(),
        };

        if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
          performanceMonitor.recordRequestMetrics(performanceMetrics);
        }

        if (res.statusCode >= 400) {
          logger.warn(
            `Error response: ${req.method} ${req.path} - ${responseTime}ms (Status: ${res.statusCode})`,
          );
        }
      } catch (error) {
        logger.error('Failed to record performance metrics:', error);
      }

      // Call the original send method
      return originalSend.call(this, body);
    }.bind(res);

    next();
  }
}

/**
 * Performance decorator for methods that need detailed timing
 */
export function PerformanceTrack(operationName?: string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;
    const logger = new Logger(`${target.constructor.name}:${propertyName}`);

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const operation =
        operationName || `${target.constructor.name}.${propertyName}`;

      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;

        if (duration > 100) {
          // Log operations taking more than 100ms
          logger.debug(`${operation} completed in ${duration}ms`);
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`${operation} failed after ${duration}ms:`, error);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Database query performance tracking decorator
 */
export function DatabasePerformanceTrack(queryType?: string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;
    const logger = new Logger(`DB:${target.constructor.name}:${propertyName}`);

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const operation = queryType || propertyName;

      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;

        // Log slow database queries
        if (duration > 500) {
          logger.warn(`Slow database query: ${operation} took ${duration}ms`);
        } else if (duration > 100) {
          logger.debug(`Database query: ${operation} took ${duration}ms`);
        }

        // Record metrics if performance monitor is available
        if (this.performanceMonitor) {
          this.performanceMonitor.recordDatabaseQuery?.(operation, duration);
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(
          `Database query failed: ${operation} after ${duration}ms:`,
          error,
        );
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Blockchain operation performance tracking decorator
 */
export function BlockchainPerformanceTrack(operationType?: string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;
    const logger = new Logger(
      `Blockchain:${target.constructor.name}:${propertyName}`,
    );

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const operation = operationType || propertyName;

      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;

        logger.debug(
          `Blockchain operation: ${operation} completed in ${duration}ms`,
        );

        // Record metrics if performance monitor is available
        if (this.performanceMonitor) {
          this.performanceMonitor.recordBlockchainDuration?.(
            operation,
            duration,
          );
          this.performanceMonitor.recordBlockchainTransaction?.(
            operation,
            'success',
          );
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(
          `Blockchain operation failed: ${operation} after ${duration}ms:`,
          error,
        );

        // Record failure metrics
        if (this.performanceMonitor) {
          this.performanceMonitor.recordBlockchainTransaction?.(
            operation,
            'failure',
          );
          this.performanceMonitor.recordBlockchainFailure?.(
            operation,
            error.message,
          );
        }

        throw error;
      }
    };

    return descriptor;
  };
}
