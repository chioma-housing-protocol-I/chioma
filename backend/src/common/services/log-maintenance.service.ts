import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoggerService } from './logger.service';

@Injectable()
export class LogMaintenanceService {
  private readonly logger = new Logger(LogMaintenanceService.name);

  constructor(private readonly loggerService: LoggerService) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async cleanupOldLogs(): Promise<void> {
    const removed = await this.loggerService.cleanupOldLogFiles();
    if (removed > 0) {
      this.logger.log(`Removed ${removed} expired log files`);
    }
  }
}
