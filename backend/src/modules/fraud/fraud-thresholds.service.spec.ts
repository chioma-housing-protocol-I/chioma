import { BadRequestException } from '@nestjs/common';
import { FraudThresholdsService } from './fraud-thresholds.service';
import { DEFAULT_FRAUD_THRESHOLDS } from './fraud-thresholds.defaults';
import { AuditAction } from '../audit/entities/audit-log.entity';

describe('FraudThresholdsService', () => {
  const repository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const auditService = { log: jest.fn().mockResolvedValue(undefined) };

  let service: FraudThresholdsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FraudThresholdsService(
      repository as never,
      auditService as never,
    );
  });

  describe('onModuleInit / refreshCache', () => {
    it('seeds the default row when none exists', async () => {
      repository.findOne.mockResolvedValue(null);
      const seeded = {
        id: 'row-1',
        key: 'default',
        ...DEFAULT_FRAUD_THRESHOLDS,
      };
      repository.create.mockReturnValue(seeded);
      repository.save.mockResolvedValue(seeded);

      await service.onModuleInit();

      expect(repository.create).toHaveBeenCalledWith({
        key: 'default',
        ...DEFAULT_FRAUD_THRESHOLDS,
      });
      expect(service.getThresholds()).toEqual(DEFAULT_FRAUD_THRESHOLDS);
    });

    it('loads existing configured thresholds', async () => {
      repository.findOne.mockResolvedValue({
        id: 'row-1',
        key: 'default',
        thresholdReview: 30,
        thresholdBlock: 60,
      });

      await service.onModuleInit();

      expect(service.getThresholds()).toEqual({
        thresholdReview: 30,
        thresholdBlock: 60,
      });
    });

    it('falls back to safe defaults if the DB read fails', async () => {
      repository.findOne.mockRejectedValue(new Error('connection refused'));

      await service.onModuleInit();

      expect(service.getThresholds()).toEqual(DEFAULT_FRAUD_THRESHOLDS);
    });
  });

  describe('getThresholds', () => {
    it('returns safe defaults before any cache refresh', () => {
      expect(service.getThresholds()).toEqual(DEFAULT_FRAUD_THRESHOLDS);
    });
  });

  describe('updateThresholds', () => {
    it('updates and caches new valid thresholds, and audits the change', async () => {
      const row = {
        id: 'row-1',
        key: 'default',
        thresholdReview: 45,
        thresholdBlock: 75,
      };
      repository.findOne.mockResolvedValue(row);
      repository.save.mockImplementation(async (value: any) => value);

      const result = await service.updateThresholds(
        { thresholdReview: 40, thresholdBlock: 80 },
        'admin-1',
      );

      expect(result).toEqual({ thresholdReview: 40, thresholdBlock: 80 });
      expect(service.getThresholds()).toEqual(result);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.FRAUD_THRESHOLDS_UPDATED,
          performedBy: 'admin-1',
          oldValues: { thresholdReview: 45, thresholdBlock: 75 },
          newValues: { thresholdReview: 40, thresholdBlock: 80 },
        }),
      );
    });

    it('allows a partial update, keeping the other threshold unchanged', async () => {
      const row = {
        id: 'row-1',
        key: 'default',
        thresholdReview: 45,
        thresholdBlock: 75,
      };
      repository.findOne.mockResolvedValue(row);
      repository.save.mockImplementation(async (value: any) => value);

      const result = await service.updateThresholds(
        { thresholdReview: 50 },
        'admin-1',
      );

      expect(result).toEqual({ thresholdReview: 50, thresholdBlock: 75 });
    });

    it('rejects an update where review >= block', async () => {
      repository.findOne.mockResolvedValue({
        id: 'row-1',
        key: 'default',
        thresholdReview: 45,
        thresholdBlock: 75,
      });

      await expect(
        service.updateThresholds(
          { thresholdReview: 90, thresholdBlock: 80 },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(repository.save).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('rejects out-of-range values', async () => {
      repository.findOne.mockResolvedValue({
        id: 'row-1',
        key: 'default',
        thresholdReview: 45,
        thresholdBlock: 75,
      });

      await expect(
        service.updateThresholds({ thresholdBlock: 150 }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('does not mutate the cache when the update is rejected', async () => {
      repository.findOne.mockResolvedValue({
        id: 'row-1',
        key: 'default',
        thresholdReview: 45,
        thresholdBlock: 75,
      });
      await service.onModuleInit();
      const before = service.getThresholds();

      await expect(
        service.updateThresholds(
          { thresholdReview: 90, thresholdBlock: 10 },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(service.getThresholds()).toEqual(before);
    });
  });
});
