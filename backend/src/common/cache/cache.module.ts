import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheMaintenanceService } from './cache-maintenance.service';
import { EncryptedCacheService } from './encrypted-cache.service';
import { SecurityModule } from '../../modules/security/security.module';

@Global()
@Module({
  imports: [SecurityModule],
  providers: [CacheService, CacheMaintenanceService, EncryptedCacheService],
  exports: [CacheService, EncryptedCacheService],
})
export class AppCacheModule {}
