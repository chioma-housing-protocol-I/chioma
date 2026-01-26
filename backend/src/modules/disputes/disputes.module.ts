import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import { Dispute } from './entities/dispute.entity';
import { DisputeEvidence } from './entities/dispute-evidence.entity';
import { DisputeComment } from './entities/dispute-comment.entity';
import { RentAgreement } from '../rent/entities/rent-contract.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { FileService } from './services/file.service';
import { NotificationService } from './services/notification.service';
import { AgreementsModule } from '../agreements/agreements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dispute, DisputeEvidence, DisputeComment, RentAgreement, Notification, User]),
    forwardRef(() => AgreementsModule),
  ],
  controllers: [DisputesController],
  providers: [DisputesService, FileService, NotificationService],
  exports: [DisputesService],
})
export class DisputesModule {}
