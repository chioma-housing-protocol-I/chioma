import { CacheMaintenanceService } from './cache-maintenance.service';
import { CacheService } from './cache.service';

describe('CacheMaintenanceService', () => {
  it('runs expired dependency metadata cleanup', async () => {
    const cacheService = {
      cleanupExpiredDependencies: jest.fn().mockResolvedValue(2),
    } as unknown as CacheService;
    const service = new CacheMaintenanceService(cacheService);

    await service.cleanupExpiredDependencyMetadata();

    expect(cacheService.cleanupExpiredDependencies).toHaveBeenCalled();
  });
});
