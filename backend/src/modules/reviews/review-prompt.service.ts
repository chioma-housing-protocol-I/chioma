import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { ReviewPrompt } from './entities/review-prompt.entity';
import { ReviewContext } from './review.entity';
import { RentAgreement } from '../rent/entities/rent-contract.entity';
import { MaintenanceRequest } from '../maintenance/maintenance-request.entity';
import { NotificationsService } from '../notifications/notifications.service';

/** Postgres unique_violation error code. */
const POSTGRES_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error as unknown as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION
  );
}

@Injectable()
export class ReviewPromptService {
  private readonly logger = new Logger(ReviewPromptService.name);

  constructor(
    @InjectRepository(ReviewPrompt)
    private readonly reviewPromptRepository: Repository<ReviewPrompt>,
    @InjectRepository(RentAgreement)
    private readonly agreementRepository: Repository<RentAgreement>,
    @InjectRepository(MaintenanceRequest)
    private readonly maintenanceRepository: Repository<MaintenanceRequest>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async promptForLeaseReview(agreementId: string): Promise<void> {
    if (!(await this.claimPrompt(ReviewContext.LEASE, agreementId))) {
      return;
    }

    const agreement = await this.agreementRepository.findOne({
      where: { id: agreementId },
    });
    if (!agreement) {
      this.logger.warn(
        `Skipping lease review prompt: agreement ${agreementId} not found`,
      );
      return;
    }

    const reference = agreement.agreementNumber ?? agreement.id;
    await this.notifyParties(
      [agreement.userId, agreement.adminId],
      'Leave a review',
      `Your lease ${reference} has ended. Share a review to help others in the community.`,
      'review_prompt_lease',
    );
  }

  async promptForMaintenanceReview(maintenanceId: string): Promise<void> {
    if (!(await this.claimPrompt(ReviewContext.MAINTENANCE, maintenanceId))) {
      return;
    }

    const request = await this.maintenanceRepository.findOne({
      where: { id: maintenanceId },
    });
    if (!request) {
      this.logger.warn(
        `Skipping maintenance review prompt: request ${maintenanceId} not found`,
      );
      return;
    }

    await this.notifyParties(
      [request.tenantId, request.landlordId],
      'Leave a review',
      `Your maintenance request "${request.category}" has been closed. Share a review of how it was handled.`,
      'review_prompt_maintenance',
    );
  }

  private async notifyParties(
    userIds: (string | null | undefined)[],
    title: string,
    message: string,
    type: string,
  ): Promise<void> {
    const recipients = [
      ...new Set(userIds.filter((id): id is string => Boolean(id))),
    ];

    const results = await Promise.allSettled(
      recipients.map((userId) =>
        this.notificationsService.notify(userId, title, message, type),
      ),
    );

    for (const [index, result] of results.entries()) {
      if (result.status === 'rejected') {
        this.logger.error(
          `Failed to send review prompt to user ${recipients[index]}`,
          result.reason instanceof Error
            ? result.reason.stack
            : String(result.reason),
        );
      }
    }
  }

  /**
   * Atomically claims the right to prompt for `(context, sourceId)` by
   * inserting a tracking row first. Returns false when a prompt was already
   * sent for this event — either the row already existed, or a concurrent
   * caller won the insert race — so the same lease end/ticket close event
   * never triggers duplicate notifications.
   */
  private async claimPrompt(
    context: ReviewContext,
    sourceId: string,
  ): Promise<boolean> {
    const existing = await this.reviewPromptRepository.findOne({
      where: { context, sourceId },
    });
    if (existing) {
      return false;
    }

    try {
      await this.reviewPromptRepository.insert({ context, sourceId });
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) {
        return false;
      }
      throw error;
    }
  }
}
