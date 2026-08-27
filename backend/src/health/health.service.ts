import { Injectable, Logger } from '@nestjs/common';
import { HealthCheckResult, HealthCheckError } from '@nestjs/terminus';
import * as fs from 'fs';
import * as path from 'path';
import {
  DependencyCriticality,
  getDependencyCriticality,
  isDegradedStatus,
  isFailingStatus,
} from './health.constants';

export interface EnhancedHealthResult {
  status: 'ok' | 'error' | 'warning';
  timestamp: string;
  version: string;
  uptime: number;
  services: Record<string, any>;
  environment?: string;
  details?: any;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  enhanceHealthResult(
    result: HealthCheckResult,
    includeDetails = false,
  ): EnhancedHealthResult {
    const packageJson = this.getPackageJson();
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
    error: any,
    includeDetails = false,
  ): EnhancedHealthResult {
    this.logger.error('Health check partial failure', error);

    const packageJson = this.getPackageJson();
    let services = {};
    let status: 'ok' | 'error' | 'warning' = 'error';

    const causes = this.extractIndicatorDetails(error);
    if (causes) {
      services = this.formatServices(causes);
      status = this.determineOverallStatusFromError(causes);
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

  /**
   * Pulls the per-indicator details out of whatever the health check threw.
   *
   * An individual indicator throws `HealthCheckError` (details on `causes`),
   * while `HealthCheckService.check()` rejects with a Nest
   * `ServiceUnavailableException` whose response body is the full
   * `HealthCheckResult`. Both carry every indicator — healthy ones included —
   * which is what the degraded/unhealthy classification needs to see.
   */
  private extractIndicatorDetails(error: any): Record<string, any> | undefined {
    if (error instanceof HealthCheckError && error.causes) {
      return error.causes as Record<string, any>;
    }

    const response =
      typeof error?.getResponse === 'function'
        ? error.getResponse()
        : error?.response;

    if (response && typeof response === 'object') {
      const details = (response as HealthCheckResult).details;
      if (details && typeof details === 'object') {
        return details as Record<string, any>;
      }
    }

    return undefined;
  }

  private determineOverallStatus(
    result: HealthCheckResult,
  ): 'ok' | 'error' | 'warning' {
    return this.classifyServices(result.details);
  }

  private determineOverallStatusFromError(
    causes: Record<string, any>,
  ): 'ok' | 'error' | 'warning' {
    return this.classifyServices(causes);
  }

  /**
   * Folds the per-indicator statuses into one overall status using the
   * criticality classification in `health.constants.ts`.
   *
   * - A failing `critical` dependency makes the whole service `error` (503).
   * - A failing or warning `degraded` dependency makes it `warning` (200), so
   *   an outage in Redis, Elasticsearch or Stellar is visible without taking
   *   the pod out of the load balancer.
   * - `skipped` indicators (not configured in this environment) are ignored.
   */
  private classifyServices(
    services: Record<string, any> | undefined,
  ): 'ok' | 'error' | 'warning' {
    const entries = Object.entries(services || {});

    if (entries.length === 0) {
      return 'ok';
    }

    let degraded = false;

    for (const [name, service] of entries) {
      const status = service?.status;

      if (isFailingStatus(status)) {
        if (this.criticalityOf(name) === 'critical') {
          return 'error';
        }
        degraded = true;
        continue;
      }

      if (isDegradedStatus(status)) {
        degraded = true;
      }
    }

    return degraded ? 'warning' : 'ok';
  }

  private criticalityOf(name: string): DependencyCriticality {
    return getDependencyCriticality(name);
  }

  private formatServices(
    details: Record<string, any> | undefined,
  ): Record<string, any> {
    if (!details) {
      return {};
    }

    const formatted: Record<string, any> = {};

    Object.entries(details).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        formatted[key] = {
          status:
            value.status === 'up'
              ? 'ok'
              : value.status === 'down'
                ? 'error'
                : value.status === 'warning'
                  ? 'warning'
                  : value.status === 'skipped'
                    ? 'skipped'
                    : 'error',
          responseTime: value.responseTime || null,
          criticality: getDependencyCriticality(key),
          ...value,
        };
      } else {
        formatted[key] = value;
      }
    });

    return formatted;
  }

  private getPackageJson(): any {
    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageContent = fs.readFileSync(packagePath, 'utf8');
      return JSON.parse(packageContent);
    } catch (error) {
      this.logger.warn('Could not read package.json', error);
      return { version: '1.0.0' };
    }
  }
}
