import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgreementsController } from './agreements.controller';
import { AgreementsService } from './agreements.service';
import { BlockchainSyncService } from './blockchain-sync.service';
import { RentAgreement } from '../rent/entities/rent-contract.entity';
import { Payment } from '../rent/entities/payment.entity';

import { AuditModule } from '../audit/audit.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { StellarModule } from '../stellar/stellar.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RentAgreement, Payment]),
    AuditModule,
    ReviewsModule,
    StellarModule,
  ],
  controllers: [AgreementsController],
  providers: [AgreementsService, BlockchainSyncService],
  exports: [AgreementsService, BlockchainSyncService],
})
export class AgreementsModule {}
