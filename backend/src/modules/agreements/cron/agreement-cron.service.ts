import { Injectable, Logger, Cron, CronExpression } from '@nestjs/common';
import { AgreementStatus } from '../../rent/entities/rent-contract.entity';
import { AgreementsService } from '../agreements.service';

@Injectable()
export class AgreementCronService {
  private readonly logger = new Logger(AgreementCronService.name);

  constructor(private readonly agreementsService: AgreementsService) {}

  /**
   * Daily cron job to auto-transition agreements based on dates and escrow.
   * Runs at 00:00 UTC.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'agreement-state-transitions',
  })
  async handleDailyTransitions() {
    this.logger.log('Running daily agreement state transitions...');

    const now = new Date();

    // 1. Transition SIGNED -> ACTIVE if start_date <= today and escrow_balance >= security_deposit
    const signedAgreements = await this.agreementsService.findByStatus(
      AgreementStatus.SIGNED,
    );
    for (const agr of signedAgreements) {
      try {
        const startDate = new Date(agr.startDate);
        const depositMet =
          Number(agr.escrowBalance) >= Number(agr.securityDeposit);
        if (startDate <= now && depositMet) {
          await this.agreementsService.updateStatusWithGuard(
            agr.id,
            AgreementStatus.ACTIVE,
            'Auto-transition: start date reached and deposit confirmed',
          );
          this.logger.log(`Agreement ${agr.id} activated.`);
        }
      } catch (err) {
        this.logger.error(
          `Failed to activate agreement ${agr.id}: ${err.message}`,
        );
      }
    }

    // 2. Transition ACTIVE -> EXPIRED if end_date < today and no renewal
    const activeAgreements = await this.agreementsService.findByStatus(
      AgreementStatus.ACTIVE,
    );
    for (const agr of activeAgreements) {
      try {
        const endDate = new Date(agr.endDate);
        if (endDate < now) {
          await this.agreementsService.updateStatusWithGuard(
            agr.id,
            AgreementStatus.EXPIRED,
            'Auto-transition: lease term ended',
          );
          this.logger.log(`Agreement ${agr.id} marked as expired.`);
        }
      } catch (err) {
        this.logger.error(
          `Failed to expire agreement ${agr.id}: ${err.message}`,
        );
      }
    }
  }
}
