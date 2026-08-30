import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PropertyCacheWarmingService } from '../properties/property-cache-warming.service';
import { RentReminderService } from '../rent/rent-reminder.service';
import { QueueMonitoringService } from '../queues/services/queue-monitoring.service';
import { DeadLetterQueueService } from '../queues/services/dead-letter-queue.service';
import { SecurityPatchManagementService } from '../cleanup/security-patch-management.service';

@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(
    private readonly propertyCacheWarming: PropertyCacheWarmingService,
    private readonly rentReminder: RentReminderService,
    private readonly queueMonitoring: QueueMonitoringService,
    private readonly deadLetterQueue: DeadLetterQueueService,
    private readonly securityPatch: SecurityPatchManagementService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async warmPropertyCache(): Promise<void> {
    this.logger.log('Running property cache warming');
    await this.propertyCacheWarming.warmCache();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processRentReminders(): Promise<void> {
    this.logger.log('Processing pending rent reminders');
    const sent = await this.rentReminder.processPendingReminders();
    this.logger.log(`Sent ${sent} rent reminder(s)`);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async collectQueueMetrics(): Promise<void> {
    await this.queueMonitoring.collectMetrics();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeDeadLetterJobs(): Promise<void> {
    this.logger.log('Purging expired dead letter jobs');
    const removed = await this.deadLetterQueue.purgeExpiredJobs();
    this.logger.log(`Purged ${removed} expired dead letter job(s)`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runSecurityPatchCheck(): Promise<void> {
    await this.securityPatch.runScheduledSecurityPatchCheck();
  }
}
