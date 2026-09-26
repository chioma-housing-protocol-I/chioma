import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import {
  MaintenanceRequest,
  MaintenanceStatus,
  SlaEscalationTier,
} from './maintenance-request.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

const OPEN_STATUSES: MaintenanceStatus[] = [
  MaintenanceStatus.OPEN,
  MaintenanceStatus.IN_PROGRESS,
];

/**
 * Enforces the SLA deadlines computed at request creation time
 * (`responseDueAt` / `resolutionDueAt` on MaintenanceRequest).
 *
 * A minute-by-minute sweep finds still-open requests whose deadline has
 * passed and have not yet been escalated to the current tier, notifies the
 * next tier (landlord first, then admin), and records the tier reached so
 * the same breach is never re-notified.
 */
@Injectable()
export class MaintenanceSlaService {
  private readonly logger = new Logger(MaintenanceSlaService.name);

  constructor(
    @InjectRepository(MaintenanceRequest)
    private readonly maintenanceRepo: Repository<MaintenanceRequest>,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  isEnabled(): boolean {
    // Default to enabled; allow explicit opt-out (e.g. in tests/CI) via config.
    return (
      this.configService.get<string>('MAINTENANCE_SLA_ENFORCEMENT') !== 'false'
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async enforceSlaBreaches(): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    await this.escalateToLandlord();
    await this.escalateToAdmin();
  }

  /**
   * Tier 1: the response window elapsed and the request is still
   * OPEN/IN_PROGRESS and has not yet been escalated. Notifies the landlord
   * and advances the tier to LANDLORD.
   */
  private async escalateToLandlord(): Promise<void> {
    const now = new Date();
    const breached = await this.maintenanceRepo.find({
      where: {
        status: In(OPEN_STATUSES),
        responseDueAt: LessThan(now),
        slaEscalationTier: SlaEscalationTier.NONE,
      },
    });

    for (const request of breached) {
      try {
        await this.notificationsService.notify(
          request.landlordId,
          'Maintenance SLA Breach: Response Overdue',
          `Maintenance request ${request.id} (priority ${request.priority}) has exceeded its response SLA and still requires action.`,
          'maintenance_sla',
        );
        request.slaEscalationTier = SlaEscalationTier.LANDLORD;
        await this.maintenanceRepo.save(request);
      } catch (error) {
        this.logger.error(
          `Failed to escalate SLA breach to landlord for request ${request.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  /**
   * Tier 2: the resolution window elapsed, the request is still
   * OPEN/IN_PROGRESS, and the landlord tier was already notified without
   * resolution. Notifies all admins and advances the tier to ADMIN.
   */
  private async escalateToAdmin(): Promise<void> {
    const now = new Date();
    const breached = await this.maintenanceRepo.find({
      where: {
        status: In(OPEN_STATUSES),
        resolutionDueAt: LessThan(now),
        slaEscalationTier: SlaEscalationTier.LANDLORD,
      },
    });

    if (breached.length === 0) {
      return;
    }

    const adminIds = await this.usersService.findAdminIds();
    if (adminIds.length === 0) {
      this.logger.warn(
        'Maintenance SLA resolution breach detected but no admin users are configured to notify',
      );
      return;
    }

    for (const request of breached) {
      try {
        await Promise.all(
          adminIds.map((adminId) =>
            this.notificationsService.notify(
              adminId,
              'Maintenance SLA Breach: Resolution Overdue',
              `Maintenance request ${request.id} (priority ${request.priority}) has exceeded its resolution SLA after already breaching its response SLA.`,
              'maintenance_sla',
            ),
          ),
        );
        request.slaEscalationTier = SlaEscalationTier.ADMIN;
        await this.maintenanceRepo.save(request);
      } catch (error) {
        this.logger.error(
          `Failed to escalate SLA breach to admins for request ${request.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
