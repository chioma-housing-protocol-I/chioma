import {
  Module,
  MiddlewareConsumer,
  NestModule,
  forwardRef,
} from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PooledHttpModule } from '../../common/http/pooled-http.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsService } from './metrics.service';
import { PerformanceAlertService } from './performance-alert.service';
import { PerformanceAlert } from './entities/performance-alert.entity';
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
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    PooledHttpModule,
    ScheduleModule.forRoot(),
    forwardRef(() => NotificationsModule),
    StorageModule,
    TypeOrmModule.forFeature([PerformanceAlert]),
  ],
  controllers: [MonitoringController, PerformanceController],
  providers: [
    MetricsService,
    PerformanceAlertService,
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
    PerformanceAlertService,
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
