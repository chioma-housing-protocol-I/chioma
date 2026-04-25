import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgreementsController } from './agreements.controller';
import { AgreementNftController } from './agreement-nft.controller';
import { AgreementsService } from './agreements.service';
import { AgreementNftService } from './agreement-nft.service';
import { NftAnalyticsService } from './nft-analytics.service';
import { BlockchainSyncService } from './blockchain-sync.service';
import { EscrowIntegrationService } from './escrow-integration.service';
import { TemplateRenderingService } from './template-rendering.service';
import { PDFGenerationService } from './pdf-generation.service';
import { RentAgreement } from '../rent/entities/rent-contract.entity';
import { Payment } from '../rent/entities/payment.entity';
import { StellarEscrow } from '../stellar/entities/stellar-escrow.entity';
import { RentObligationNft } from './entities/rent-obligation-nft.entity';
import { NFTTransfer } from './entities/nft-transfer.entity';

import { AuditModule } from '../audit/audit.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { StellarModule } from '../stellar/stellar.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import { AgreementStateService } from './state-machines/agreement-state-machine.service';
import { AgreementsEventListener } from './listeners/agreement-event-listener';
import { AgreementCronService } from './cron/agreement-cron.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RentAgreement,
      Payment,
      StellarEscrow,
      RentObligationNft,
      NFTTransfer,
    ]),
    AuditModule,
    ReviewsModule,
    StellarModule,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
  ],
  controllers: [AgreementsController, AgreementNftController],
  providers: [
    AgreementsService,
    AgreementNftService,
    NftAnalyticsService,
    BlockchainSyncService,
    EscrowIntegrationService,
    TemplateRenderingService,
    PDFGenerationService,
    AgreementStateService,
    AgreementsEventListener,
    AgreementCronService,
  ],
  exports: [
    AgreementsService,
    AgreementNftService,
    NftAnalyticsService,
    BlockchainSyncService,
    EscrowIntegrationService,
    TemplateRenderingService,
    PDFGenerationService,
  ],
})
export class AgreementsModule {}
