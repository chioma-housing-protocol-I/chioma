import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { StellarAccount } from '../entities/stellar-account.entity';
import { StellarTransaction } from '../entities/stellar-transaction.entity';
import { StellarEscrow } from '../entities/stellar-escrow.entity';
import { EscrowSignature } from '../entities/escrow-signature.entity';
import { EscrowCondition } from '../entities/escrow-condition.entity';
import { StellarService } from '../services/stellar.service';
import { EncryptionService } from '../services/encryption.service';
import { TransactionSubmissionPoolService } from '../services/transaction-submission-pool.service';
import { StellarController } from '../controllers/stellar.controller';
import stellarConfig from '../config/stellar.config';

@Module({
  imports: [
    ConfigModule.forFeature(stellarConfig),
    TypeOrmModule.forFeature([
      StellarAccount,
      StellarTransaction,
      StellarEscrow,
      EscrowSignature,
      EscrowCondition,
    ]),
  ],
  controllers: [StellarController],
  providers: [StellarService, EncryptionService, TransactionSubmissionPoolService],
  exports: [StellarService, EncryptionService, TransactionSubmissionPoolService],
})
export class StellarAccountsModule {}
