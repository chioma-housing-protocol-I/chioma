import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { RateLimitService } from './services/rate-limit.service';
import { AbuseDetectionService } from './services/abuse-detection.service';
import { RateLimitAnalyticsService } from './services/rate-limit-analytics.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RateLimitController } from './controllers/rate-limit.controller';

@Module({
  imports: [CacheModule],
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
