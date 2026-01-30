import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { StellarAccount } from './entities/stellar-account.entity';
import { StellarTransaction } from './entities/stellar-transaction.entity';
import { StellarEscrow } from './entities/stellar-escrow.entity';
import { StellarController } from './controllers/stellar.controller';
import { StellarService } from './services/stellar.service';
import { EncryptionService } from './services/encryption.service';
import stellarConfig from './config/stellar.config';

@Module({
  imports: [
    ConfigModule.forFeature(stellarConfig),
    TypeOrmModule.forFeature([
      StellarAccount,
      StellarTransaction,
      StellarEscrow,
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [StellarController],
  providers: [StellarService, EncryptionService],
  exports: [StellarService, EncryptionService],
})
export class StellarModule {}
