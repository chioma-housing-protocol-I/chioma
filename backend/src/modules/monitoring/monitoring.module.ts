import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsService } from './metrics.service';
import { MetricsMiddleware } from './metrics.middleware';
import { PerformanceMiddleware } from './performance.middleware';
import { MonitoringController } from './monitoring.controller';
import { PerformanceController } from './performance.controller';
import { AlertService } from './alert.service';
import { ErrorNotificationService } from './error-notification.service';
import { ErrorEscalationService } from './error-escalation.service';
import { StructuredLoggerService } from './structured-logger.service';
import { PerformanceMonitorService } from './performance-monitor.service';
import { DatabaseMonitorService } from './database-monitor.service';
import { DatabaseReplicationService } from './database-replication.service';
import { WebhookSignatureService } from '../webhooks/webhook-signature.service';
import { WebhookSignatureGuard } from '../webhooks/guards/webhook-signature.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    NotificationsModule,
    TypeOrmModule.forFeature([]),
  ],
  controllers: [MonitoringController, PerformanceController],
  providers: [
    MetricsService,
    AlertService,
    ErrorNotificationService,
    ErrorEscalationService,
    StructuredLoggerService,
    PerformanceMonitorService,
    PerformanceMiddleware,
    DatabaseMonitorService,
    DatabaseReplicationService,
    WebhookSignatureService,
    WebhookSignatureGuard,
  ],
  exports: [
    MetricsService,
    StructuredLoggerService,
    ErrorNotificationService,
    ErrorEscalationService,
    AlertService,
    PerformanceMonitorService,
    PerformanceMiddleware,
    DatabaseMonitorService,
    DatabaseReplicationService,
  ],
})
export class MonitoringModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MetricsMiddleware, PerformanceMiddleware).forRoutes('*');
  }
}
