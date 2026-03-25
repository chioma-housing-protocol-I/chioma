/**
 * Jest mock for @nestjs/terminus to avoid loading the real package when its
 * internal require('../health-check/logger/logger.provider') fails in some installs.
 */
import { Module } from '@nestjs/common';

export class HealthCheckError extends Error {
  constructor(
    message: string,
    public readonly causes?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'HealthCheckError';
    Object.setPrototypeOf(this, HealthCheckError.prototype);
  }
}

export type HealthIndicatorResult = Record<
  string,
  { status: 'up' | 'down'; message?: string; [key: string]: unknown }
>;
export type HealthCheckStatus = 'ok' | 'error' | 'shutting_down';
export type HealthIndicatorStatus = 'up' | 'down';

export interface HealthCheckResult {
  status: HealthCheckStatus;
  info?: Record<string, HealthIndicatorResult>;
  error?: Record<string, HealthIndicatorResult>;
  details?: Record<string, HealthIndicatorResult>;
}

export abstract class HealthIndicator {
  protected getStatus(
    key: string,
    isHealthy: boolean,
    details?: Record<string, unknown>,
  ): HealthIndicatorResult {
    return {
      [key]: {
        status: isHealthy ? 'up' : 'down',
        ...details,
      },
    };
  }
  protected abstract check(key: string): Promise<HealthIndicatorResult>;
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    return this.check(key);
  }
}

export const HealthCheck = () => () => {};

export class HealthCheckService {
  check = jest.fn();
}

@Module({})
export class TerminusModule {}
