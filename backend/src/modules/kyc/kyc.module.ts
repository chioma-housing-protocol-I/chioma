import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([Kyc, User]),
    UsersModule,
    SecurityModule,
    AuditModule,
    NotificationsModule,
    WebhooksModule,
  ],
  providers: [KycService],
  controllers: [KycController, AdminKycController],
  exports: [KycService],
})
export class KycModule {}
