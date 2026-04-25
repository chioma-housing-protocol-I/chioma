import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import * as StellarSdk from '@stellar/stellar-sdk';
import { RentAgreement } from './entities/rent-contract.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { StellarEscrow } from '../stellar/entities/stellar-escrow.entity';
import { Dispute, DisputeStatus } from '../disputes/entities/dispute.entity';
import { EscrowContractService } from '../stellar/services/escrow-contract.service';

export interface ReconciliationResult {
  processed: number;
  verified: number;
  underpayments: number;
  orphans: number;
  errors: number;
}

type ReconciliationOutcome = 'verified' | 'underpayment' | 'orphan' | 'skip';

@Injectable()
export class RentReconciliationService {
  private readonly logger = new Logger(RentReconciliationService.name);
  private readonly horizonServer: StellarSdk.Horizon.Server;
  private readonly protocolWallet: string;
  private pagingToken = 'now';

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(RentAgreement)
    private readonly agreementRepository: Repository<RentAgreement>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(StellarEscrow)
    private readonly escrowRepository: Repository<StellarEscrow>,
    @InjectRepository(Dispute)
    private readonly disputeRepository: Repository<Dispute>,
    private readonly escrowContractService: EscrowContractService,
  ) {
    const network = configService.get<string>('STELLAR_NETWORK', 'testnet');
    const horizonUrl =
      configService.get<string>('HORIZON_URL') ??
      (network === 'mainnet'
        ? 'https://horizon.stellar.org'
        : 'https://horizon-testnet.stellar.org');

    this.horizonServer = new StellarSdk.Horizon.Server(horizonUrl);
    this.protocolWallet =
      configService.get<string>('PROTOCOL_WALLET_ADDRESS') ?? '';
  }

  @Cron('*/2 * * * *')
  async runReconciliation(): Promise<ReconciliationResult> {
    if (!this.protocolWallet) {
      this.logger.warn(
        'PROTOCOL_WALLET_ADDRESS not configured — skipping reconciliation',
      );
      return {
        processed: 0,
        verified: 0,
        underpayments: 0,
        orphans: 0,
        errors: 0,
      };
    }
    return this.reconcile();
  }

  async reconcile(): Promise<ReconciliationResult> {
    const result: ReconciliationResult = {
      processed: 0,
      verified: 0,
      underpayments: 0,
      orphans: 0,
      errors: 0,
    };

    try {
      const txPage = await this.horizonServer
        .transactions()
        .forAccount(this.protocolWallet)
        .order('asc')
        .cursor(this.pagingToken)
        .limit(50)
        .call();

      for (const tx of txPage.records) {
        try {
          const outcome = await this.processTransaction(tx);
          if (outcome !== 'skip') {
            result.processed++;
            if (outcome === 'verified') result.verified++;
            else if (outcome === 'underpayment') result.underpayments++;
            else if (outcome === 'orphan') result.orphans++;
          }
        } catch (error) {
          result.errors++;
          this.logger.error(
            `Error processing tx ${tx.hash}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
        this.pagingToken = tx.paging_token;
      }
    } catch (error) {
      this.logger.error(
        `Reconciliation poll failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (result.processed > 0) {
      this.logger.log(
        `Reconciliation: ${result.verified} verified, ` +
          `${result.underpayments} underpayments, ` +
          `${result.orphans} orphans, ${result.errors} errors`,
      );
    }

    return result;
  }

  private async processTransaction(
    tx: StellarSdk.Horizon.ServerApi.TransactionRecord,
  ): Promise<ReconciliationOutcome> {
    if (tx.memo_type !== 'text' || !tx.memo) {
      return 'skip';
    }

    const agreementId = tx.memo.trim();

    const alreadyProcessed = await this.paymentRepository.findOne({
      where: { referenceNumber: tx.hash },
    });
    if (alreadyProcessed) {
      return 'skip';
    }

    const totalReceived = await this.sumXlmReceived(tx);
    if (totalReceived <= 0) {
      return 'skip';
    }

    const agreement = await this.agreementRepository.findOne({
      where: { id: agreementId },
    });

    if (!agreement) {
      this.logger.warn(
        `Orphan tx ${tx.hash}: no agreement for memo "${agreementId}"`,
      );
      await this.recordOrphanPayment(tx.hash, agreementId, totalReceived);
      return 'orphan';
    }

    const expectedRent = Number(agreement.monthlyRent);

    if (totalReceived < expectedRent - 0.000001) {
      this.logger.warn(
        `Under-payment for agreement ${agreementId}: ` +
          `received ${totalReceived} XLM, expected ${expectedRent} XLM (tx: ${tx.hash})`,
      );
      await this.recordPayment(
        tx.hash,
        agreement.id,
        totalReceived,
        PaymentStatus.FAILED,
        `Under-payment: received ${totalReceived} XLM, expected ${expectedRent} XLM`,
      );
      return 'underpayment';
    }

    await this.recordPayment(
      tx.hash,
      agreement.id,
      totalReceived,
      PaymentStatus.VERIFIED,
      `Blockchain payment verified. Tx: ${tx.hash}`,
    );

    this.logger.log(
      `Payment verified for agreement ${agreementId}: ${totalReceived} XLM (tx: ${tx.hash})`,
    );

    await this.maybeReleaseEscrow(agreement, totalReceived);

    return 'verified';
  }

  private async sumXlmReceived(
    tx: StellarSdk.Horizon.ServerApi.TransactionRecord,
  ): Promise<number> {
    try {
      const opsPage = await (
        tx as StellarSdk.Horizon.ServerApi.TransactionRecord & {
          operations: () => Promise<
            StellarSdk.Horizon.ServerApi.CollectionPage<StellarSdk.Horizon.ServerApi.OperationRecord>
          >;
        }
      ).operations();

      return opsPage.records.reduce((sum, op) => {
        const payment =
          op as StellarSdk.Horizon.ServerApi.PaymentOperationRecord;
        if (
          (payment.type as string) === 'payment' &&
          payment.to === this.protocolWallet &&
          payment.asset_type === 'native'
        ) {
          return sum + parseFloat(payment.amount);
        }
        return sum;
      }, 0);
    } catch {
      return 0;
    }
  }

  private async recordPayment(
    txHash: string,
    agreementId: string,
    amount: number,
    status: PaymentStatus,
    notes: string,
  ): Promise<Payment> {
    const payment = this.paymentRepository.create({
      agreementId,
      amount,
      paymentDate: new Date(),
      paymentMethod: 'stellar',
      referenceNumber: txHash,
      status,
      notes,
    });
    return this.paymentRepository.save(payment);
  }

  private async recordOrphanPayment(
    txHash: string,
    memo: string,
    amount: number,
  ): Promise<void> {
    await this.recordPayment(
      txHash,
      memo,
      amount,
      PaymentStatus.FAILED,
      `Orphan tx: no agreement found for memo "${memo}"`,
    );
  }

  private async maybeReleaseEscrow(
    agreement: RentAgreement,
    paidAmount: number,
  ): Promise<void> {
    const activeDispute = await this.disputeRepository.findOne({
      where: {
        blockchainAgreementId: agreement.id,
        status: DisputeStatus.OPEN,
      },
    });

    if (activeDispute) {
      this.logger.log(
        `Skipping escrow release for agreement ${agreement.id}: active dispute (${activeDispute.id})`,
      );
      return;
    }

    const escrow = await this.escrowRepository.findOne({
      where: { rentAgreementId: agreement.id },
    });

    if (!escrow?.blockchainEscrowId) {
      this.logger.warn(
        `No on-chain escrow for agreement ${agreement.id} — skipping release`,
      );
      return;
    }

    const agentRate = Number(agreement.agentCommissionRate) / 100;
    const agentShare = (paidAmount * agentRate).toFixed(7);
    const adminShare = (paidAmount * (1 - agentRate)).toFixed(7);

    this.logger.log(
      `Releasing escrow for agreement ${agreement.id}: ` +
        `admin=${adminShare} XLM, agent=${agentShare} XLM`,
    );

    try {
      await this.escrowContractService.releaseRent(escrow.blockchainEscrowId);
      this.logger.log(`Escrow released for agreement ${agreement.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to release escrow for agreement ${agreement.id}: ` +
          `${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
