import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgreementsController } from './agreements.controller';
import { AgreementNftController } from './agreement-nft.controller';
import { AgreementsService } from './agreements.service';
import { AgreementNftService } from './agreement-nft.service';
import { NftAnalyticsService } from './nft-analytics.service';
import { BlockchainSyncService } from './blockchain-sync.service';
import { EscrowIntegrationService } from './escrow-integration.service';
import { RentAgreement } from '../rent/entities/rent-contract.entity';
import { Payment } from '../rent/entities/payment.entity';
import { StellarEscrow } from '../stellar/entities/stellar-escrow.entity';
import { RentObligationNft } from './entities/rent-obligation-nft.entity';

import { AuditModule } from '../audit/audit.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { StellarModule } from '../stellar/stellar.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RentAgreement,
      Payment,
      StellarEscrow,
      RentObligationNft,
    ]),
    AuditModule,
    forwardRef(() => ReviewsModule),
    StellarModule,
  ],
  controllers: [AgreementsController, AgreementNftController],
  providers: [
    AgreementsService,
    AgreementNftService,
    NftAnalyticsService,
    BlockchainSyncService,
    EscrowIntegrationService,
  ],
  exports: [
    AgreementsService,
    AgreementNftService,
    NftAnalyticsService,
    BlockchainSyncService,
    EscrowIntegrationService,
  ],
})
export class AgreementsModule {}
