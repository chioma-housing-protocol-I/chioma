import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringController } from './monitoring.controller';
import { MetricsService } from './metrics.service';
import { AlertService } from './alert.service';
import { CacheService } from '../../common/cache/cache.service';
import { DatabaseMonitorService } from './database-monitor.service';
import { ImageProcessingService } from '../storage/image-processing.service';
import { CompressionService } from '../../common/middleware/compression.service';
import { WebhookSignatureGuard } from '../webhooks/guards/webhook-signature.guard';

describe('MonitoringController', () => {
  let controller: MonitoringController;
  let compressionService: jest.Mocked<Pick<CompressionService, 'getMetrics'>>;

  beforeEach(async () => {
    compressionService = {
      getMetrics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonitoringController],
      providers: [
        { provide: MetricsService, useValue: { getMetrics: jest.fn() } },
        { provide: AlertService, useValue: {} },
        { provide: CacheService, useValue: { getStats: jest.fn() } },
        { provide: DatabaseMonitorService, useValue: {} },
        {
          provide: ImageProcessingService,
          useValue: { getCacheMetrics: jest.fn() },
        },
        { provide: CompressionService, useValue: compressionService },
      ],
    })
      .overrideGuard(WebhookSignatureGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(MonitoringController);
  });

  describe('getCompressionStats', () => {
    it('reports the byte reduction percentage achieved by compression (#2075)', () => {
      compressionService.getMetrics.mockReturnValue({
        totalResponses: 100,
        compressedResponses: 80,
        bypassedByThreshold: 15,
        bypassedByNegotiation: 5,
        bytesBeforeCompression: 1_000_000,
        bytesAfterCompression: 300_000,
      });

      const result = controller.getCompressionStats();

      expect(result.reductionPercent).toBe(70);
      expect(result.totalResponses).toBe(100);
      expect(result.compressedResponses).toBe(80);
    });

    it('reports 0% reduction when nothing has been measured yet', () => {
      compressionService.getMetrics.mockReturnValue({
        totalResponses: 0,
        compressedResponses: 0,
        bypassedByThreshold: 0,
        bypassedByNegotiation: 0,
        bytesBeforeCompression: 0,
        bytesAfterCompression: 0,
      });

      const result = controller.getCompressionStats();

      expect(result.reductionPercent).toBe(0);
    });

    it('rounds the reduction percentage to two decimal places', () => {
      compressionService.getMetrics.mockReturnValue({
        totalResponses: 3,
        compressedResponses: 3,
        bypassedByThreshold: 0,
        bypassedByNegotiation: 0,
        bytesBeforeCompression: 3,
        bytesAfterCompression: 1,
      });

      const result = controller.getCompressionStats();

      // (1 - 1/3) * 100 = 66.666... -> rounded to 66.67
      expect(result.reductionPercent).toBe(66.67);
    });
  });
});
