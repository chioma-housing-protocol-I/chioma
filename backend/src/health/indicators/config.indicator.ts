import { Injectable, Logger } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { validateEnvironment } from '../../config/env.validation';

@Injectable()
export class ConfigHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(ConfigHealthIndicator.name);

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      validateEnvironment(process.env);
      return this.getStatus(key, true, {
        status: 'up',
        checkedAt: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Critical config health check failed', message);
      const result = this.getStatus(key, false, {
        status: 'down',
        error: message,
      });
      throw new HealthCheckError('Config check failed', result);
    }
  }
}
