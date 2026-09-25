import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsService } from './metrics.service';
import { PerformanceController } from './performance.controller';
import { PerformanceAlertService } from './performance-alert.service';
import { PerformanceAlert } from './entities/performance-alert.entity';
import { MetricsMiddleware } from './metrics.middleware';
import { MonitoringController } from './monitoring.controller';
import { AlertService } from './alert.service';
import { StructuredLoggerService } from './structured-logger.service';
import { WebhookSignatureService } from '../webhooks/webhook-signature.service';
import { WebhookSignatureGuard } from '../webhooks/guards/webhook-signature.guard';

@Module({
  imports: [TypeOrmModule.forFeature([PerformanceAlert])],
  controllers: [MonitoringController, PerformanceController],
  providers: [
    MetricsService,
    PerformanceAlertService,
    AlertService,
    StructuredLoggerService,
    WebhookSignatureService,
    WebhookSignatureGuard,
  ],
  exports: [MetricsService, StructuredLoggerService, PerformanceAlertService],
})
export class MonitoringModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MetricsMiddleware).forRoutes('*');
  }
}
