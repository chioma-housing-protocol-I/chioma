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
  providers: [StellarService, EncryptionService],
  exports: [StellarService, EncryptionService],
})
export class StellarAccountsModule {}
