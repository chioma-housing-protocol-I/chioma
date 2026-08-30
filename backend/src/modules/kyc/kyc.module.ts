import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Kyc } from './kyc.entity';
import { User } from '../users/entities/user.entity';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';
import { AdminKycController } from './admin-kyc.controller';
import { UsersModule } from '../users/users.module';
import { SecurityModule } from '../security/security.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { KycRetentionService } from './kyc-retention.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Kyc, User]),
    UsersModule,
    SecurityModule,
    AuditModule,
    NotificationsModule,
    WebhooksModule,
    ScheduleModule.forRoot(),
  ],
  providers: [KycService, KycRetentionService],
  controllers: [KycController, AdminKycController],
  exports: [KycService, KycRetentionService],
})
export class KycModule {}
