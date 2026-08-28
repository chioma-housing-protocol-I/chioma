import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import * as StellarSdk from '@stellar/stellar-sdk';
import { PaymentProcessingService } from '../../stellar/services/payment-processing.service';
import { RentObligationNftService } from '../../stellar/services/rent-obligation-nft.service';
import { EscrowIntegrationService } from '../../agreements/escrow-integration.service';
import { requestContext } from '../../../common/request-context/request-context';

// ---------------------------------------------------------------------------
// Discriminated payload types for each blockchain job variant.
// Callers must populate `data` accordingly before enqueuing.
// ---------------------------------------------------------------------------

export interface SendPaymentData {
  /** Stellar public key of the payer */
  from: string;
  /** ID of the rent agreement being paid */
  agreementId: string;
  /** Amount in stroops (string to preserve precision) */
  amount: string;
  /**
   * Payer's Stellar secret key, used to reconstruct the keypair inside the
   * processor. Must never be logged or stored beyond the lifetime of this job.
   */
  callerSecret: string;
}

export interface CreateEscrowData {
  /** ID of the rent agreement for which an escrow is created */
  agreementId: string;
}

export interface ReleaseEscrowData {
  /** Database ID of the StellarEscrow record */
  escrowId: number;
  /** Stellar address the escrow should be released to */
  releaseTo: string;
}

export interface MintNftData {
  /** ID of the rent agreement to mint a rent-obligation NFT for */
  agreementId: string;
  /** Stellar address of the admin / beneficiary */
  adminAddress: string;
}

export interface BlockchainJobData {
  type:
    | 'send-payment'
    | 'create-escrow'
    | 'release-escrow'
    | 'mint-nft'
    | 'sync-transaction'
    | 'process-anchor-transaction';
  transactionId?: string;
  agreementId?: string;
  paymentId?: string;
  correlationId?: string;
  requestId?: string;
  userId?: string;
  data:
    | SendPaymentData
    | CreateEscrowData
    | ReleaseEscrowData
    | MintNftData
    | Record<string, any>;
}

@Processor('blockchain')
export class BlockchainQueueProcessor {
  private readonly logger = new Logger(BlockchainQueueProcessor.name);

  constructor(
    private readonly paymentProcessingService: PaymentProcessingService,
    private readonly escrowIntegrationService: EscrowIntegrationService,
    private readonly rentObligationNftService: RentObligationNftService,
  ) {}

  @Process()
  async handleBlockchainJob(job: Job<BlockchainJobData>): Promise<void> {
    const correlationId = job.data?.correlationId || job.data?.requestId;
    const requestId = job.data?.requestId || correlationId;
    const userId = job.data?.userId;

    return requestContext.run(
      { correlationId, requestId, userId },
      async () => {
        this.logger.log(
          `Processing blockchain job ${job.id}: ${job.data.type}`,
        );

        try {
          switch (job.data.type) {
            case 'send-payment':
              await this.sendPayment(job.data);
              break;

            case 'create-escrow':
              await this.createEscrow(job.data);
              break;

            case 'release-escrow':
              await this.releaseEscrow(job.data);
              break;

            case 'mint-nft':
              await this.mintNft(job.data);
              break;

            case 'sync-transaction':
              await this.syncTransaction(job.data);
              break;

            case 'process-anchor-transaction':
              await this.processAnchorTransaction(job.data);
              break;

            default:
              throw new Error(
                `Unknown blockchain type: ${String(job.data.type)}`,
              );
          }

          this.logger.log(`Blockchain job ${job.id} completed successfully`);
        } catch (error) {
          this.logger.error(
            `Blockchain job ${job.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            error instanceof Error ? error.stack : '',
          );
          // Re-throw so Bull marks the job as failed, triggering retry/backoff/DLQ.
          throw error;
        }
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Private handlers — each delegates directly to the corresponding service.
  // Any exception propagates to handleBlockchainJob, which re-throws it so
  // Bull's retry/backoff/DLQ logic kicks in rather than silently succeeding.
  // ---------------------------------------------------------------------------

  private async sendPayment(data: BlockchainJobData): Promise<void> {
    const { from, agreementId, amount, callerSecret } =
      data.data as SendPaymentData;

    if (!from || !agreementId || !amount || !callerSecret) {
      throw new Error(
        'send-payment job requires data.from, data.agreementId, data.amount, and data.callerSecret',
      );
    }

    this.logger.debug(
      `Sending payment for agreement ${agreementId} from ${from}`,
    );

    const callerKeypair = StellarSdk.Keypair.fromSecret(callerSecret);
    await this.paymentProcessingService.processRentPayment(
      from,
      agreementId,
      amount,
      callerKeypair,
    );
  }

  private async createEscrow(data: BlockchainJobData): Promise<void> {
    const { agreementId } = data.data as CreateEscrowData;

    if (!agreementId) {
      throw new Error('create-escrow job requires data.agreementId');
    }

    this.logger.debug(`Creating escrow for agreement ${agreementId}`);
    await this.escrowIntegrationService.createEscrowForAgreement(agreementId);
  }

  private async releaseEscrow(data: BlockchainJobData): Promise<void> {
    const { escrowId, releaseTo } = data.data as ReleaseEscrowData;

    if (escrowId == null || !releaseTo) {
      throw new Error(
        'release-escrow job requires data.escrowId and data.releaseTo',
      );
    }

    this.logger.debug(`Releasing escrow ${escrowId} to ${releaseTo}`);
    await this.escrowIntegrationService.approveEscrowRelease(
      escrowId,
      releaseTo,
    );
  }

  private async mintNft(data: BlockchainJobData): Promise<void> {
    const { agreementId, adminAddress } = data.data as MintNftData;

    if (!agreementId || !adminAddress) {
      throw new Error(
        'mint-nft job requires data.agreementId and data.adminAddress',
      );
    }

    this.logger.debug(
      `Minting rent-obligation NFT for agreement ${agreementId}`,
    );
    await this.rentObligationNftService.mintObligation({
      agreementId,
      adminAddress,
    });
  }

  private async syncTransaction(data: BlockchainJobData): Promise<void> {
    this.logger.debug(`Syncing transaction: ${JSON.stringify(data.data)}`);
    // Transaction sync logic — not stubbed in the original; left as a no-op
    // until the appropriate service method is identified.
  }

  private async processAnchorTransaction(
    data: BlockchainJobData,
  ): Promise<void> {
    this.logger.debug(
      `Processing anchor transaction: ${JSON.stringify(data.data)}`,
    );
    // Anchor transaction processing logic — not stubbed in the original; left
    // as a no-op until the appropriate service method is identified.
  }
}
