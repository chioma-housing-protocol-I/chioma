import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { FeatureFlagsService } from '../feature-flags.service';
import { FeatureFlag } from '../entities/feature-flag.entity';

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;
  let repository: jest.Mocked<Repository<FeatureFlag>>;

  const mockFlag: FeatureFlag = {
    id: 'uuid-1',
    key: 'test_feature',
    description: 'Test feature flag',
    enabled: true,
    rolloutPercentage: 50,
    metadata: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const repositoryMock = {
      find: jest.fn().mockResolvedValue([mockFlag]),
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (where.key === mockFlag.key) {
          return Promise.resolve({ ...mockFlag });
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation((dto) => ({
        id: 'new-uuid',
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      save: jest.fn().mockImplementation((flag) => Promise.resolve(flag)),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagsService,
        {
          provide: getRepositoryToken(FeatureFlag),
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = module.get<FeatureFlagsService>(FeatureFlagsService);
    repository = module.get(getRepositoryToken(FeatureFlag));
    await service.onModuleInit();
  });

  describe('isFeatureEnabled', () => {
    it('should return false for unknown feature flag key', async () => {
      repository.findOne.mockResolvedValueOnce(null);
      const isEnabled = await service.isFeatureEnabled(
        'non_existent_key',
        'user-1',
      );
      expect(isEnabled).toBe(false);
    });

    it('should evaluate known flag correctly using cached values', async () => {
      const isEnabled = await service.isFeatureEnabled(
        'test_feature',
        'user-1',
      );
      expect(typeof isEnabled).toBe('boolean');
    });
  });

  describe('createFlag', () => {
    it('should throw ConflictException if flag key already exists', async () => {
      await expect(service.createFlag({ key: 'test_feature' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create and save a new feature flag', async () => {
      repository.findOne.mockResolvedValueOnce(null);
      const created = await service.createFlag({
        key: 'brand_new_feature',
        description: 'New feature description',
        rolloutPercentage: 25,
      });

      expect(created.key).toBe('brand_new_feature');
      expect(created.rolloutPercentage).toBe(25);
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('updateFlag & setRolloutPercentage', () => {
    it('should update rollout percentage of existing flag', async () => {
      const updated = await service.setRolloutPercentage('test_feature', 75);
      expect(updated.rolloutPercentage).toBe(75);
    });

    it('should throw NotFoundException when updating non-existent flag', async () => {
      repository.findOne.mockResolvedValueOnce(null);
      await expect(
        service.updateFlag('unknown', { enabled: false }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('killSwitch', () => {
    it('should immediately disable flag and set rolloutPercentage to 0', async () => {
      const result = await service.killSwitch('test_feature');

      expect(result.enabled).toBe(false);
      expect(result.rolloutPercentage).toBe(0);

      // Verify that flag evaluation now returns false for all users
      const isEnabled = await service.isFeatureEnabled(
        'test_feature',
        'user-1',
      );
      expect(isEnabled).toBe(false);
    });
  });

  describe('evaluateAllFlagsForUser', () => {
    it('should return evaluated status for all flags in system', async () => {
      const result = await service.evaluateAllFlagsForUser('user-100');
      expect(result).toHaveProperty('test_feature');
      expect(result.test_feature).toHaveProperty('isEnabledForUser');
      expect(result.test_feature).toHaveProperty('rolloutPercentage', 50);
    });
  });
});
