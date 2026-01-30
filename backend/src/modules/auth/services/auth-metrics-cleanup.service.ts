import { Injectable, Logger } from '@nestjs/common';
import { AuthMetricsService } from '../services/auth-metrics.service';

@Injectable()
export class AuthMetricsCleanupService {
  private readonly logger = new Logger(AuthMetricsCleanupService.name);

  constructor(private readonly authMetricsService: AuthMetricsService) {}

  // Manual cleanup method - can be called by external scheduler
  async cleanupOldMetrics() {
    this.logger.log('Starting cleanup of old auth metrics...');

    try {
      await this.authMetricsService.cleanupOldMetrics(90); // Keep 90 days
      this.logger.log('Completed cleanup of old auth metrics');
    } catch (error) {
      this.logger.error('Failed to cleanup old auth metrics', error);
    }
  }
}
