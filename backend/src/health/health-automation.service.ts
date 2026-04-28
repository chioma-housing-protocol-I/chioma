import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HealthCheckService } from '@nestjs/terminus';
import { HealthService } from './health.service';
import { DatabaseHealthIndicator } from './indicators/database.indicator';
import { StellarHealthIndicator } from './indicators/stellar.indicator';
import { MemoryHealthIndicator } from './indicators/memory.indicator';

@Injectable()
export class HealthAutomationService {
  private readonly logger = new Logger(HealthAutomationService.name);

  constructor(
    private health: HealthCheckService,
    private healthService: HealthService,
    private databaseHealthIndicator: DatabaseHealthIndicator,
    private stellarHealthIndicator: StellarHealthIndicator,
    private memoryHealthIndicator: MemoryHealthIndicator,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron() {
    this.logger.log('Running automated health check...');

    try {
      const result = await this.health.check([
        () => this.databaseHealthIndicator.isHealthy('database'),
        () => this.stellarHealthIndicator.isHealthy('stellar'),
        () => this.memoryHealthIndicator.isHealthy('memory'),
      ]);

      const enhancedResult = this.healthService.enhanceHealthResult(result);

      if (enhancedResult.status === 'ok') {
        this.logger.debug('System is healthy');
      } else if (enhancedResult.status === 'warning') {
        this.logger.warn(
          'System is degraded: ' + JSON.stringify(enhancedResult.services),
        );
      } else {
        this.logger.error(
          'System is unhealthy: ' + JSON.stringify(enhancedResult.services),
        );
      }
    } catch (error: any) {
      const degradedResult = this.healthService.handlePartialFailure(error);
      this.logger.error(
        'Health check failed: ' + JSON.stringify(degradedResult),
      );
    }
  }
}
