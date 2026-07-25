import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheService } from './cache.service';

@Injectable()
export class CacheMaintenanceService {
  private readonly logger = new Logger(CacheMaintenanceService.name);

  constructor(private readonly cacheService: CacheService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredDependencyMetadata(): Promise<void> {
    const cleaned = await this.cacheService.cleanupExpiredDependencies();
    if (cleaned > 0) {
      this.logger.log(`Cleaned ${cleaned} expired cache dependency records`);
    }
  }
}
