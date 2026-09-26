import { Injectable, Logger } from '@nestjs/common';
import { FraudService } from './fraud.service';
import { FraudBlockedException } from './exceptions/fraud-blocked.exception';
import { CheckTransactionFraudDto } from './dto/check-transaction-fraud.dto';

export type PaymentRecordedFraudParams = {
  userId: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
};

@Injectable()
export class FraudHooksService {
  private readonly logger = new Logger(FraudHooksService.name);

  constructor(private readonly fraudService: FraudService) {}

  hooksEnabled(): boolean {
    return process.env.FRAUD_HOOKS_ENABLED !== 'false';
  }

  /**
   * Pre-check: Runs before payment recording. Throws FraudBlockedException if decision is 'block'.
   * Used to prevent payment from being recorded in the first place.
   */
  async checkTransactionBeforeRecording(
    params: PaymentRecordedFraudParams,
  ): Promise<void> {
    if (!this.hooksEnabled()) {
      return;
    }
    try {
      const result = await this.fraudService.checkTransactionFraud({
        userId: params.userId,
        amount: params.amount,
        currency: params.currency ?? 'NGN',
        paymentMethod: params.paymentMethod,
      });

      if (result.decision === 'block') {
        throw new FraudBlockedException('transaction', params.userId, result);
      }
    } catch (err) {
      // Re-throw FraudBlockedException to block the payment
      if (err instanceof FraudBlockedException) {
        throw err;
      }
      // For other errors, log and don't block (non-fatal)
      this.logger.warn(
        `Fraud pre-check failed (non-fatal): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /**
   * Pre-check: Runs before listing publication. Throws FraudBlockedException if decision is 'block'.
   * Used to prevent listing from being published in the first place.
   */
  async checkListingBeforePublishing(propertyId: string): Promise<void> {
    if (!this.hooksEnabled()) {
      return;
    }
    try {
      const result = await this.fraudService.checkListingFraud(propertyId);

      if (result.decision === 'block') {
        throw new FraudBlockedException('listing', propertyId, result);
      }
    } catch (err) {
      // Re-throw FraudBlockedException to block the publication
      if (err instanceof FraudBlockedException) {
        throw err;
      }
      // For other errors, log and don't block (non-fatal)
      this.logger.warn(
        `Fraud pre-check failed (non-fatal): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /**
   * Post-check: Runs after a successful payment record. Never throws — failures are logged only.
   * Used for logging and alerting on fraud decisions after the payment has been recorded.
   */
  async onPaymentRecorded(params: PaymentRecordedFraudParams): Promise<void> {
    if (!this.hooksEnabled()) {
      return;
    }
    try {
      await this.fraudService.checkTransactionFraud({
        userId: params.userId,
        amount: params.amount,
        currency: params.currency ?? 'NGN',
        paymentMethod: params.paymentMethod,
      });
    } catch (err) {
      this.logger.warn(
        `Fraud transaction hook failed (non-fatal): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /**
   * Post-check: Runs after a listing is published. Never throws — failures are logged only.
   * Used for logging and alerting on fraud decisions after the listing has been published.
   */
  async onListingPublished(propertyId: string): Promise<void> {
    if (!this.hooksEnabled()) {
      return;
    }
    try {
      await this.fraudService.checkListingFraud(propertyId);
    } catch (err) {
      this.logger.warn(
        `Fraud listing hook failed (non-fatal): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
