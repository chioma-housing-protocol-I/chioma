import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { RentAgreement } from '../rent/entities/rent-contract.entity';
import { ChiomaContractService } from '../stellar/services/chioma-contract.service';

@Injectable()
export class BlockchainSyncService {
  private readonly logger = new Logger(BlockchainSyncService.name);

  constructor(
    @InjectRepository(RentAgreement)
    private readonly agreementRepository: Repository<RentAgreement>,
    private readonly chiomaContract: ChiomaContractService,
    private readonly dataSource: DataSource,
  ) {}

  async syncAgreementWithBlockchain(agreementId: string): Promise<void> {
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

      const onChainData = await this.chiomaContract.getAgreement(
        agreement.agreementNumber || '',
      );

      if (agreement.blockchainSyncedAt) {
        agreement.blockchainSyncedAt = new Date();
      }
      if (agreement.onChainStatus) {
        agreement.onChainStatus = onChainData.status;
      }

      await queryRunner.manager.save(agreement);
      await queryRunner.commitTransaction();

      this.logger.log(`Synced agreement ${agreementId} with blockchain`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to sync agreement ${agreementId}: ${error.message}`,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async verifyConsistency(agreementId: string): Promise<boolean> {
    try {
      const agreement = await this.agreementRepository.findOne({
        where: { id: agreementId },
      });

      if (!agreement || !agreement.agreementNumber) return false;

      const exists = await this.chiomaContract.hasAgreement(
        agreement.agreementNumber,
      );
      return exists;
    } catch (error) {
      this.logger.error(
        `Failed to verify consistency for ${agreementId}: ${error.message}`,
      );
      return false;
    }
  }
}
