import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import { DisputeBlockchainService } from './dispute-blockchain.service';
import { Dispute, DisputeStatus, DisputeType } from './entities/dispute.entity';
import { DisputeEvidence } from './entities/dispute-evidence.entity';
import { DisputeComment } from './entities/dispute-comment.entity';
import { RentAgreement, AgreementStatus } from '../rent/entities/rent-contract.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Arbiter } from '../stellar/entities/arbiter.entity';
import { DisputeVote } from '../stellar/entities/dispute-vote.entity';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { UpdateDisputeDto } from './dto/update-dispute.dto';
import { QueryDisputesDto } from './dto/query-disputes.dto';
import { AuditModule } from '../audit/audit.module';
import { StellarModule } from '../stellar/stellar.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Dispute,
      DisputeEvidence,
      DisputeComment,
      Arbiter,
      DisputeVote,
      RentAgreement,
      User,
    ]),
    AuditModule,
    StellarModule,
  ],
  controllers: [DisputesController],
  providers: [DisputesService, DisputeBlockchainService],
  exports: [DisputesService, DisputeBlockchainService],
})
export class DisputesModule {}
