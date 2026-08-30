import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HealthCheckService } from '@nestjs/terminus';
import { HealthService } from './health.service';
import { DatabaseHealthIndicator } from './indicators/database.indicator';
import { StellarHealthIndicator } from './indicators/stellar.indicator';
import { MemoryHealthIndicator } from './indicators/memory.indicator';
import { ErrorNotificationService } from '../modules/monitoring/error-notification.service';

@Injectable()
export class HealthAutomationService {
  private readonly logger = new Logger(HealthAutomationService.name);
  private consecutiveDatabaseFailures = 0;
  private readonly databaseFailureAlertThreshold = 3;

  constructor(
    private health: HealthCheckService,
    private healthService: HealthService,
    private databaseHealthIndicator: DatabaseHealthIndicator,
    private stellarHealthIndicator: StellarHealthIndicator,
    private memoryHealthIndicator: MemoryHealthIndicator,
    private readonly errorNotificationService: ErrorNotificationService,
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
      this.trackDatabaseFailureStreak(enhancedResult.services);

      if (enhancedResult.status === 'ok') {
        this.logger.debug('System is healthy');
      } else if (enhancedResult.status === 'warning') {
        this.logger.warn(
          'System is degraded: ' + JSON.stringify(enhancedResult.services),
        );
        if (!this.shouldSuppressForDatabaseDebounce(enhancedResult.services)) {
          await this.errorNotificationService.notifyHealthDegradation({
            status: 'warning',
            summary: 'Automated health check reported degraded services',
            services: enhancedResult.services,
          });
        }
      } else {
        this.logger.error(
          'System is unhealthy: ' + JSON.stringify(enhancedResult.services),
        );
        if (!this.shouldSuppressForDatabaseDebounce(enhancedResult.services)) {
          await this.errorNotificationService.notifyHealthDegradation({
            status: 'error',
            summary: 'Automated health check reported unhealthy services',
            services: enhancedResult.services,
          });
        }
      }
    } catch (error: unknown) {
      const degradedResult = this.healthService.handlePartialFailure(error);
      this.logger.error(
        'Health check failed: ' + JSON.stringify(degradedResult),
      );
      await this.errorNotificationService.notifyHealthDegradation({
        status: 'error',
        summary: 'Automated health check failed',
        services: degradedResult.services ?? { error: String(error) },
      });
    }
  }

  /**
   * Updates the consecutive-database-failure counter based on the latest
   * check. Reset to 0 as soon as the database reports healthy again.
   */
  private trackDatabaseFailureStreak(services: Record<string, any>): void {
    if (this.isDatabaseFailing(services)) {
      this.consecutiveDatabaseFailures += 1;
    } else {
      this.consecutiveDatabaseFailures = 0;
    }
  }

  /**
   * Debounces alerts for isolated, transient database blips: when the
   * database is the only failing service and it hasn't failed
   * `databaseFailureAlertThreshold` times in a row yet, suppress the alert.
   * Failures involving other services (or a database outage that has
   * persisted past the threshold) still alert immediately.
   */
  private shouldSuppressForDatabaseDebounce(
    services: Record<string, any>,
  ): boolean {
    if (!this.isDatabaseFailing(services)) {
      return false;
    }

    const onlyDatabaseFailing = Object.entries(services)
      .filter(([key]) => key !== 'database')
      .every(([, service]) => service?.status === 'ok');

    return (
      onlyDatabaseFailing &&
      this.consecutiveDatabaseFailures < this.databaseFailureAlertThreshold
    );
  }

  private isDatabaseFailing(services: Record<string, any>): boolean {
    return services?.database?.status !== 'ok';
  }
}
