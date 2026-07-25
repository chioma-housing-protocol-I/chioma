import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditLog } from './entities/audit-log.entity';
import { AuditInterceptor } from './audit.interceptor';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';
import { AuditRetentionService } from './audit-retention.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    ScheduleModule.forRoot(),
    ConfigModule,
  ],
  controllers: [AuditController],
  providers: [
    AuditService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    AuditLogInterceptor,
    AuditRetentionService,
  ],
  exports: [AuditService, AuditLogInterceptor, AuditRetentionService],
})
export class AuditModule {}
