import { Global, Module } from '@nestjs/common';
import { CompressionService } from './compression.service';

/**
 * `@Global()` so `CompressionMiddleware` (applied app-wide in AppModule) and
 * any module that wants to read compression metrics (e.g. MonitoringController's
 * GET /compression/stats, #2075) share the exact same CompressionService
 * instance, not two separately-instantiated ones with independent counters.
 */
@Global()
@Module({
  providers: [CompressionService],
  exports: [CompressionService],
})
export class CompressionModule {}
