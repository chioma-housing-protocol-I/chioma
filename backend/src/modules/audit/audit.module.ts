import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditLog } from './entities/audit-log.entity';
import { AuditInterceptor } from './audit.interceptor';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';
import { AuditRetentionService } from './audit-retention.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), ScheduleModule.forRoot()],
  controllers: [AuditController],
  providers: [
    AuditService,
    AuditInterceptor,
    AuditLogInterceptor,
    AuditRetentionService,
  ],
  exports: [
    AuditService,
    AuditInterceptor,
    AuditLogInterceptor,
    AuditRetentionService,
  ],
})
export class AuditModule {}
