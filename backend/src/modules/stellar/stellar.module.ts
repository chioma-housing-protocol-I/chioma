import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { StellarAccount } from './entities/stellar-account.entity';
import { StellarTransaction } from './entities/stellar-transaction.entity';
import { StellarEscrow } from './entities/stellar-escrow.entity';
import { AnchorTransaction } from '../transactions/entities/anchor-transaction.entity';
import { SupportedCurrency } from '../transactions/entities/supported-currency.entity';
import { StellarController } from './controllers/stellar.controller';
import { AnchorController } from './controllers/anchor.controller';
import { StellarService } from './services/stellar.service';
import { EncryptionService } from './services/encryption.service';
import { AnchorService } from './services/anchor.service';
import { ChiomaContractService } from './services/chioma-contract.service';
import { BlockchainEventService } from './services/blockchain-event.service';
import stellarConfig from './config/stellar.config';

@Module({
  imports: [
    ConfigModule.forFeature(stellarConfig),
    TypeOrmModule.forFeature([
      StellarAccount,
      StellarTransaction,
      StellarEscrow,
      AnchorTransaction,
      SupportedCurrency,
    ]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
  ],
  controllers: [StellarController, AnchorController],
  providers: [
    StellarService,
    EncryptionService,
    AnchorService,
    ChiomaContractService,
    BlockchainEventService,
  ],
  exports: [
    StellarService,
    EncryptionService,
    AnchorService,
    ChiomaContractService,
    BlockchainEventService,
  ],
})
export class StellarModule {}
