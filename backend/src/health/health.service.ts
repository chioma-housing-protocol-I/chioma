import { Injectable, Logger } from '@nestjs/common';
import { HealthCheckResult, HealthCheckError } from '@nestjs/terminus';
import * as fs from 'fs';
import * as path from 'path';

export interface EnhancedHealthResult {
  status: 'ok' | 'error' | 'warning';
  timestamp: string;
  version: string;
  uptime: number;
  services: Record<string, unknown>;
  environment?: string;
  details?: Record<string, unknown>;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  enhanceHealthResult(
    result: HealthCheckResult,
    includeDetails = false,
  ): EnhancedHealthResult {
    const packageJson = this.getPackageJson() as { version?: string };
    const overallStatus = this.determineOverallStatus(result);

    const enhancedResult: EnhancedHealthResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: packageJson.version || '1.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      services: this.formatServices(result.details),
    };

    if (includeDetails) {
      enhancedResult.environment = process.env.NODE_ENV || 'development';
      enhancedResult.details = {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        processId: process.pid,
        memoryUsage: process.memoryUsage(),
      };
    }

    return enhancedResult;
  }

  handlePartialFailure(
    error: Error & { causes?: Record<string, unknown> },
    includeDetails = false,
  ): EnhancedHealthResult {
    this.logger.error('Health check partial failure', error);

    const packageJson = this.getPackageJson() as { version?: string };
    let services: Record<string, unknown> = {};
    let status: 'ok' | 'error' | 'warning' = 'error';

    // Extract information from HealthCheckError if available
    if (error instanceof HealthCheckError && error.causes) {
      services = this.formatServices(error.causes as Record<string, unknown>);
      status = this.determineOverallStatusFromError(
        error.causes as Record<string, unknown>,
      );
    }

    const result: EnhancedHealthResult = {
      status,
      timestamp: new Date().toISOString(),
      version: packageJson.version || '1.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      services,
    };

    if (includeDetails) {
      result.environment = process.env.NODE_ENV || 'development';
      result.details = {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        processId: process.pid,
        memoryUsage: process.memoryUsage(),
        error: error.message,
      };
    }

    return result;
  }

  private determineOverallStatus(
    result: HealthCheckResult,
  ): 'ok' | 'error' | 'warning' {
    if (result.status === 'ok') {
      return 'ok';
    }

    // Check if any services are still healthy (partial failure)
    const services = Object.values(result.details || {});
    const hasHealthyServices = services.some(
      (service: unknown) =>
        typeof service === 'object' &&
        service !== null &&
        'status' in service &&
        (service as { status: string }).status === 'up',
    );

    return hasHealthyServices ? 'warning' : 'error';
  }

  private determineOverallStatusFromError(
    causes: Record<string, unknown>,
  ): 'ok' | 'error' | 'warning' {
    const services = Object.values(causes || {});
    const healthyServices = services.filter(
      (service: unknown) =>
        typeof service === 'object' &&
        service !== null &&
        'status' in service &&
        (service as { status: string }).status === 'up',
    );
    const totalServices = services.length;

    if (healthyServices.length === totalServices) {
      return 'ok';
    } else if (healthyServices.length > 0) {
      return 'warning';
    } else {
      return 'error';
    }
  }

  private formatServices(
    details: Record<string, unknown> | undefined,
  ): Record<string, unknown> {
    if (!details) {
      return {};
    }

    const formatted: Record<string, unknown> = {};

    Object.entries(details).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        const serviceValue = value as Record<string, unknown>;
        formatted[key] = {
          status:
            serviceValue.status === 'up'
              ? 'ok'
              : serviceValue.status === 'down'
                ? 'error'
                : serviceValue.status === 'warning'
                  ? 'warning'
                  : 'error',
          responseTime: serviceValue.responseTime || null,
          ...serviceValue,
        };
      } else {
        formatted[key] = value;
      }
    });

    return formatted;
  }

  private getPackageJson(): { version?: string } {
    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageContent = fs.readFileSync(packagePath, 'utf8');
      return JSON.parse(packageContent) as { version?: string };
    } catch (error) {
      this.logger.warn('Could not read package.json', error);
      return { version: '1.0.0' };
    }
  }
}
