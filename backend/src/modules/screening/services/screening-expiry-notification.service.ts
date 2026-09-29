import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, LessThan } from 'typeorm';
import { NotificationsService } from '../../notifications/notifications.service';
import { AuditService } from '../../audit/audit.service';
import { AuditAction, AuditLevel } from '../../audit/entities/audit-log.entity';
import { TenantScreeningReport } from '../entities/tenant-screening-report.entity';
import { TenantScreeningRequest } from '../entities/tenant-screening-request.entity';
import { UserScreeningStatus } from '../screening.enums';

@Injectable()
export class ScreeningExpiryNotificationService {
  private readonly logger = new Logger(ScreeningExpiryNotificationService.name);

  constructor(
    @InjectRepository(TenantScreeningReport)
    private readonly reportRepository: Repository<TenantScreeningReport>,
    @InjectRepository(TenantScreeningRequest)
    private readonly screeningRepository: Repository<TenantScreeningRequest>,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async notifyExpiringReports(): Promise<number> {
    this.logger.log('Starting screening expiry notification check');

    // Get the notification window in days (default: 7 days before expiry)
    const notificationWindowDays = Number(
      this.configService.get<string>(
        'TENANT_SCREENING_EXPIRY_NOTIFICATION_DAYS',
        '7',
      ),
    );

    // Calculate the cutoff date: reports expiring within the notification window
    const now = new Date();
    const expiryWindowStart = new Date(
      now.getTime() + notificationWindowDays * 24 * 60 * 60 * 1000,
    );

    // Find reports that will expire within the notification window
    const expiringReports = await this.reportRepository.find({
      where: {
        accessExpiresAt: LessThan(expiryWindowStart),
      },
      relations: ['screening'],
    });

    this.logger.log(
      `Found ${expiringReports.length} screening report(s) expiring within ${notificationWindowDays} days`,
    );

    let notificationsSent = 0;

    for (const report of expiringReports) {
      const screening = await this.screeningRepository.findOne({
        where: { id: report.screeningId },
      });

      if (!screening) {
        this.logger.warn(`Screening request not found for report ${report.id}`);
        continue;
      }

      // Skip if screening is not in completed status
      if (screening.status !== UserScreeningStatus.COMPLETED) {
        continue;
      }

      try {
        // Calculate days until expiry
        const daysUntilExpiry = Math.ceil(
          (report.accessExpiresAt!.getTime() - now.getTime()) /
            (24 * 60 * 60 * 1000),
        );

        const expiryMessage =
          daysUntilExpiry <= 0
            ? 'Your tenant screening report has expired.'
            : `Your tenant screening report will expire in ${daysUntilExpiry} day(s).`;

        // Notify the requester
        await this.notificationsService.notify(
          screening.requestedByUserId,
          'Tenant screening report expiring soon',
          `${expiryMessage} Please renew if needed.`,
          'screening_expiry_notification',
        );

        // Notify the tenant as well
        await this.notificationsService.notify(
          screening.tenantId,
          'Tenant screening report expiring soon',
          `${expiryMessage} Your rental application screening will need renewal if required.`,
          'screening_expiry_notification',
        );

        await this.auditService.log({
          action: AuditAction.UPDATE,
          entityType: 'TenantScreeningReport',
          entityId: report.id,
          performedBy: 'SYSTEM',
          level: AuditLevel.INFO,
          metadata: {
            screeningId: screening.id,
            daysUntilExpiry,
            notificationType: 'expiry_approaching',
          },
        });

        notificationsSent++;
      } catch (error) {
        this.logger.error(
          `Failed to send expiry notification for report ${report.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    this.logger.log(`Sent ${notificationsSent} expiry notification(s)`);
    return notificationsSent;
  }
}
