import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Arbiter } from '../../disputes/entities/arbiter.entity';
import { DisputeVote } from '../../disputes/entities/dispute-vote.entity';
import { DisputeEvent } from '../../disputes/entities/dispute-event.entity';
import { Dispute } from '../../disputes/entities/dispute.entity';
import { RentObligationNft } from '../../agreements/entities/rent-obligation-nft.entity';
import {
  PropertyRegistry,
  PropertyHistory,
} from '../entities/property-registry.entity';
import { ChiomaContractService } from '../services/chioma-contract.service';
import { EscrowContractService } from '../services/escrow-contract.service';
import { DisputeContractService } from '../services/dispute-contract.service';
import { DisputeContractEnhancedService } from '../services/dispute-contract-enhanced.service';
import { RentObligationNftService } from '../services/rent-obligation-nft.service';
import { NftEventProcessor } from '../services/nft-event-processor.service';
import { AgentRegistryService } from '../services/agent-registry.service';
import { PropertyRegistryService } from '../services/property-registry.service';
import { AgentRegistryController } from '../controllers/agent-registry.controller';
import { DisputeController } from '../controllers/dispute.controller';
import { PropertyRegistryController } from '../controllers/property-registry.controller';
import { StellarAccountsModule } from './stellar-accounts.module';
import { WebhooksModule } from '../../webhooks/webhooks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Arbiter,
      DisputeVote,
      DisputeEvent,
      Dispute,
      RentObligationNft,
      PropertyRegistry,
      PropertyHistory,
    ]),
    StellarAccountsModule,
    WebhooksModule,
  ],
  controllers: [
    AgentRegistryController,
    DisputeController,
    PropertyRegistryController,
  ],
  providers: [
    ChiomaContractService,
    EscrowContractService,
    DisputeContractService,
    DisputeContractEnhancedService,
    RentObligationNftService,
    NftEventProcessor,
    AgentRegistryService,
    PropertyRegistryService,
  ],
  exports: [
    ChiomaContractService,
    EscrowContractService,
    DisputeContractService,
    DisputeContractEnhancedService,
    RentObligationNftService,
    NftEventProcessor,
    AgentRegistryService,
    PropertyRegistryService,
  ],
})
export class StellarContractsModule {}
