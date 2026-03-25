import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  StellarEscrow,
  EscrowStatus,
} from '../stellar/entities/stellar-escrow.entity';
import { EscrowContractService } from '../stellar/services/escrow-contract.service';
import { RentAgreement } from '../rent/entities/rent-contract.entity';

@Injectable()
export class EscrowIntegrationService {
  private readonly logger = new Logger(EscrowIntegrationService.name);

  constructor(
    @InjectRepository(StellarEscrow)
    private readonly escrowRepository: Repository<StellarEscrow>,
    @InjectRepository(RentAgreement)
    private readonly agreementRepository: Repository<RentAgreement>,
    private readonly escrowContract: EscrowContractService,
    private readonly dataSource: DataSource,
  ) {}

  async createEscrowForAgreement(agreementId: string): Promise<StellarEscrow> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const agreement = await queryRunner.manager.findOne(RentAgreement, {
        where: { id: agreementId },
      });

      if (!agreement) {
        throw new Error(`Agreement ${agreementId} not found`);
      }

      // Create escrow record
      const escrow = queryRunner.manager.create(StellarEscrow, {
        amount: agreement.securityDeposit.toString(),
        status: EscrowStatus.PENDING,
        rentAgreementId: agreementId,
        arbiterAddress: this.getDefaultArbiter(),
      });

      const savedEscrow = await queryRunner.manager.save(escrow);

      // Create on-chain escrow
      try {
        const txHash = await this.escrowContract.createEscrow({
          depositor: agreement.tenantStellarPubKey || '',
          beneficiary: agreement.landlordStellarPubKey || '',
          arbiter: this.getDefaultArbiter(),
          amount: agreement.securityDeposit.toString(),
          token: 'NATIVE',
        });

        savedEscrow.blockchainEscrowId = txHash;
        savedEscrow.blockchainSyncedAt = new Date();
        await queryRunner.manager.save(savedEscrow);

        await queryRunner.commitTransaction();
        this.logger.log(
          `Created escrow for agreement ${agreementId}, tx: ${txHash}`,
        );

        return savedEscrow;
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw new Error(`Failed to create on-chain escrow: ${error.message}`);
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to create escrow for agreement ${agreementId}: ${error.message}`,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async approveEscrowRelease(
    escrowId: number,
    releaseTo: string,
  ): Promise<void> {
    try {
      const escrow = await this.escrowRepository.findOne({
        where: { id: escrowId },
      });

      if (!escrow || !escrow.blockchainEscrowId) {
        throw new Error('Escrow not found or not on-chain');
      }

      escrow.approvalCount += 1;
      escrow.blockchainSyncedAt = new Date();

      if (escrow.approvalCount >= 2) {
        escrow.status = EscrowStatus.RELEASED;
        escrow.releasedAt = new Date();
      }

      await this.escrowRepository.save(escrow);

      this.logger.log(`Approved release for escrow ${escrowId}`);
    } catch (error) {
      this.logger.error(
        `Failed to approve release for escrow ${escrowId}: ${error.message}`,
      );
      throw error;
    }
  }

  async raiseDispute(
    escrowId: number,
    reason: string,
    disputeId: string,
  ): Promise<void> {
    try {
      const escrow = await this.escrowRepository.findOne({
        where: { id: escrowId },
      });

      if (!escrow) {
        throw new Error('Escrow not found');
      }

      escrow.status = EscrowStatus.DISPUTED;
      escrow.disputeId = disputeId;
      escrow.disputeReason = reason;
      escrow.blockchainSyncedAt = new Date();

      await this.escrowRepository.save(escrow);

      this.logger.log(`Raised dispute for escrow ${escrowId}`);
    } catch (error) {
      this.logger.error(
        `Failed to raise dispute for escrow ${escrowId}: ${error.message}`,
      );
      throw error;
    }
  }

  async syncEscrowWithBlockchain(escrowId: number): Promise<void> {
    try {
      const escrow = await this.escrowRepository.findOne({
        where: { id: escrowId },
      });

      if (!escrow || !escrow.blockchainEscrowId) {
        return;
      }

      const onChainData = await this.escrowContract.getEscrow(
        escrow.blockchainEscrowId,
      );

      if (onChainData) {
        escrow.onChainStatus = onChainData.status;
        escrow.blockchainSyncedAt = new Date();
        await this.escrowRepository.save(escrow);
      }
    } catch (error) {
      this.logger.error(`Failed to sync escrow ${escrowId}: ${error.message}`);
    }
  }

  private getDefaultArbiter(): string {
    // In production, this would be determined by business logic
    return process.env.DEFAULT_ARBITER_ADDRESS || '';
  }
}
