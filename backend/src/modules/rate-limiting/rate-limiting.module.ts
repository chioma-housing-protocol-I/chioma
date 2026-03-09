import { Module } from '@nestjs/common';
import { RateLimitService } from './services/rate-limit.service';
import { AbuseDetectionService } from './services/abuse-detection.service';
import { RateLimitAnalyticsService } from './services/rate-limit-analytics.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RateLimitController } from './controllers/rate-limit.controller';

@Module({
  controllers: [RateLimitController],
  providers: [
    RateLimitService,
    AbuseDetectionService,
    RateLimitAnalyticsService,
    RateLimitGuard,
  ],
  exports: [
    RateLimitService,
    AbuseDetectionService,
    RateLimitAnalyticsService,
    RateLimitGuard,
  ],
})
export class RateLimitingModule {}
