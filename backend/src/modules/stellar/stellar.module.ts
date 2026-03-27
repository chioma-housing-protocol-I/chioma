import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { StellarAccount } from './entities/stellar-account.entity';
import { StellarTransaction } from './entities/stellar-transaction.entity';
import { StellarEscrow } from './entities/stellar-escrow.entity';
import { EscrowSignature } from './entities/escrow-signature.entity';
import { EscrowCondition } from './entities/escrow-condition.entity';
import { AgentTransaction } from './entities/agent-transaction.entity';
import { Arbiter } from '../disputes/entities/arbiter.entity';
import { DisputeVote } from '../disputes/entities/dispute-vote.entity';
import { DisputeEvent } from '../disputes/entities/dispute-event.entity';
import { RentObligationNft } from '../agreements/entities/rent-obligation-nft.entity';
import { AnchorTransaction } from '../transactions/entities/anchor-transaction.entity';
import { SupportedCurrency } from '../transactions/entities/supported-currency.entity';
import { StellarPayment } from './entities/stellar-payment.entity';
import { Dispute } from '../disputes/entities/dispute.entity';
import { StellarController } from './controllers/stellar.controller';
import { AnchorController } from './controllers/anchor.controller';
import { AgentRegistryController } from './controllers/agent-registry.controller';
import { DisputeController } from './controllers/dispute.controller';
import { AgentRegistryService } from './services/agent-registry.service';
import { StellarService } from './services/stellar.service';
import { EncryptionService } from './services/encryption.service';
import { AnchorService } from './services/anchor.service';
import { ChiomaContractService } from './services/chioma-contract.service';
import { BlockchainEventService } from './services/blockchain-event.service';
import { EscrowContractService } from './services/escrow-contract.service';
import { DisputeContractService } from './services/dispute-contract.service';
import { DisputeContractEnhancedService } from './services/dispute-contract-enhanced.service';
import { RentObligationNftService } from './services/rent-obligation-nft.service';
import { NftEventProcessor } from './services/nft-event-processor.service';
import { PaymentProcessingService } from './services/payment-processing.service';
import { PaymentProcessingController } from './controllers/payment-processing.controller';
import stellarConfig from './config/stellar.config';
import { WebhooksModule } from '../webhooks/webhooks.module';
import {
  PropertyRegistry,
  PropertyHistory,
} from './entities/property-registry.entity';
import { PropertyRegistryController } from './controllers/property-registry.controller';
import { PropertyRegistryService } from './services/property-registry.service';

@Module({
  imports: [
    ConfigModule.forFeature(stellarConfig),
    TypeOrmModule.forFeature([
      StellarAccount,
      StellarTransaction,
      StellarEscrow,
      EscrowSignature,
      EscrowCondition,
      AgentTransaction,
      Arbiter,
      DisputeVote,
      DisputeEvent,
      Dispute,
      RentObligationNft,
      AnchorTransaction,
      SupportedCurrency,
      StellarPayment,
      PropertyRegistry,
      PropertyHistory,
    ]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    WebhooksModule,
  ],
  controllers: [
    StellarController,
    AnchorController,
    AgentRegistryController,
    DisputeController,
    PaymentProcessingController,
    PropertyRegistryController,
  ],
  providers: [
    StellarService,
    EncryptionService,
    AnchorService,
    ChiomaContractService,
    BlockchainEventService,
    EscrowContractService,
    DisputeContractService,
    DisputeContractEnhancedService,
    RentObligationNftService,
    NftEventProcessor,
    AgentRegistryService,
    PaymentProcessingService,
    PropertyRegistryService,
  ],
  exports: [
    StellarService,
    EncryptionService,
    AnchorService,
    ChiomaContractService,
    BlockchainEventService,
    EscrowContractService,
    DisputeContractService,
    DisputeContractEnhancedService,
    RentObligationNftService,
    NftEventProcessor,
    AgentRegistryService,
    PaymentProcessingService,
    PropertyRegistryService,
  ],
})
export class StellarModule {}
