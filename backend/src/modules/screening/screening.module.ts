import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScreeningController } from './screening.controller';
import { ScreeningService } from './screening.service';
import { TenantScreeningRequest } from './entities/tenant-screening-request.entity';
import { TenantScreeningConsent } from './entities/tenant-screening-consent.entity';
import { TenantScreeningReport } from './entities/tenant-screening-report.entity';
import { SecurityModule } from '../security/security.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TenantScreeningRequest,
      TenantScreeningConsent,
      TenantScreeningReport,
    ]),
    SecurityModule,
    NotificationsModule,
    AuditModule,
    WebhooksModule,
  ],
  controllers: [ScreeningController],
  providers: [ScreeningService],
  exports: [ScreeningService],
})
export class ScreeningModule {}
