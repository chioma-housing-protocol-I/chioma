import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { MetricsService } from './metrics.service';
import { MetricsMiddleware } from './metrics.middleware';
import { MonitoringController } from './monitoring.controller';
import { AlertService } from './alert.service';
import { ErrorNotificationService } from './error-notification.service';
import { ErrorEscalationService } from './error-escalation.service';
import { StructuredLoggerService } from './structured-logger.service';
import { WebhookSignatureService } from '../webhooks/webhook-signature.service';
import { WebhookSignatureGuard } from '../webhooks/guards/webhook-signature.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [HttpModule, ScheduleModule.forRoot(), NotificationsModule],
  controllers: [MonitoringController],
  providers: [
    MetricsService,
    AlertService,
    ErrorNotificationService,
    ErrorEscalationService,
    StructuredLoggerService,
    WebhookSignatureService,
    WebhookSignatureGuard,
  ],
  exports: [
    MetricsService,
    StructuredLoggerService,
    ErrorNotificationService,
    ErrorEscalationService,
    AlertService,
  ],
})
export class MonitoringModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MetricsMiddleware).forRoutes('*');
  }
}
