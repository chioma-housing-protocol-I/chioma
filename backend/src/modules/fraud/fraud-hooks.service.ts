import { Injectable, Logger } from '@nestjs/common';
import { FraudService } from './fraud.service';

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
   * Runs after a successful payment record. Never throws — failures are logged only.
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
   * Runs after a listing is published. Never throws — failures are logged only.
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
