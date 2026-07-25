import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheMaintenanceService } from './cache-maintenance.service';

@Global()
@Module({
  providers: [CacheService, CacheMaintenanceService],
  exports: [CacheService],
})
export class AppCacheModule {}
