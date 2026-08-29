import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AdminUsersController } from './admin-users.controller';
import { User } from './entities/user.entity';
import { UserNotificationPreference } from './entities/user-notification-preference.entity';
import { AuditModule } from '../audit/audit.module';
import { UserKycStatusService } from './user-kyc-status.service';
import { EncryptionModule } from '../../common/services/encryption.module';
import { Review } from '../reviews/review.entity';
import { GuestReview } from '../reviews/entities/guest-review.entity';
import { HostReview } from '../reviews/entities/host-review.entity';
import { Message } from '../messaging/entities/message.entity';
import { Participant } from '../messaging/entities/participant.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentSchedule } from '../payments/entities/payment-schedule.entity';
import { PaymentMethod } from '../payments/entities/payment-method.entity';
import { Kyc } from '../kyc/kyc.entity';
import { PropertyInquiry } from '../inquiries/entities/property-inquiry.entity';
import { SecurityEvent } from '../security/entities/security-event.entity';
import { ApiKey } from '../developer/entities/api-key.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserNotificationPreference,
      Review,
      GuestReview,
      HostReview,
      Message,
      Participant,
      Payment,
      PaymentSchedule,
      PaymentMethod,
      Kyc,
      PropertyInquiry,
      SecurityEvent,
      ApiKey,
    ]),
    AuditModule,
    EncryptionModule,
  ],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService, UserKycStatusService],
  exports: [UsersService, UserKycStatusService],
})
export class UsersModule {}
