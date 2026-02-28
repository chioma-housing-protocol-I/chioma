import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsMiddleware } from './metrics.middleware';
import { MonitoringController } from './monitoring.controller';
import { AlertService } from './alert.service';
import { StructuredLoggerService } from './structured-logger.service';

@Module({
  controllers: [MonitoringController],
  providers: [MetricsService, AlertService, StructuredLoggerService],
  exports: [MetricsService, StructuredLoggerService],
})
export class MonitoringModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MetricsMiddleware).forRoutes('*');
  }
}
