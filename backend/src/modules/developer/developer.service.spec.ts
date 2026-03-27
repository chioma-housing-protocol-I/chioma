import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { DeveloperService } from './developer.service';
import { ApiKey, ApiKeyStatus } from './entities/api-key.entity';
import { ApiKeyRotationHistory } from './entities/api-key-rotation-history.entity';

describe('DeveloperService', () => {
  let service: DeveloperService;
  let _apiKeyRepo: jest.Mocked<Repository<ApiKey>>;
  let _rotationHistoryRepo: jest.Mocked<Repository<ApiKeyRotationHistory>>;

  const mockApiKeyRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockRotationHistoryRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeveloperService,
        {
          provide: getRepositoryToken(ApiKey),
          useValue: mockApiKeyRepo,
        },
        {
          provide: getRepositoryToken(ApiKeyRotationHistory),
          useValue: mockRotationHistoryRepo,
        },
      ],
    }).compile();

    service = module.get<DeveloperService>(DeveloperService);
    _apiKeyRepo = module.get(getRepositoryToken(ApiKey));
    _rotationHistoryRepo = module.get(
      getRepositoryToken(ApiKeyRotationHistory),
    );

    jest.clearAllMocks();
  });

  describe('createKey', () => {
    it('should create an API key with default 90-day expiration', async () => {
      const userId = 'user-123';
      const name = 'Test Key';

      mockApiKeyRepo.create.mockReturnValue({
        userId,
        name,
        keyHash: 'hash',
        keyPrefix: 'chioma_sk_...',
        expiresAt: new Date(),
        status: ApiKeyStatus.ACTIVE,
      } as ApiKey);

      mockApiKeyRepo.save.mockResolvedValue({
        id: 'key-1',
        userId,
        name,
        keyHash: 'hash',
        keyPrefix: 'chioma_sk_...',
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status: ApiKeyStatus.ACTIVE,
      } as ApiKey);

      const result = await service.createKey(userId, name);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('expiresAt');
      expect(mockApiKeyRepo.create).toHaveBeenCalled();
      expect(mockApiKeyRepo.save).toHaveBeenCalled();
    });

    it('should create an API key with custom expiration', async () => {
      const userId = 'user-123';
      const name = 'Test Key';
      const customExpiration = new Date('2026-12-31');

      mockApiKeyRepo.create.mockReturnValue({
        userId,
        name,
        keyHash: 'hash',
        keyPrefix: 'chioma_sk_...',
        expiresAt: customExpiration,
        status: ApiKeyStatus.ACTIVE,
      } as ApiKey);

      mockApiKeyRepo.save.mockResolvedValue({
        id: 'key-1',
        userId,
        name,
        expiresAt: customExpiration,
        status: ApiKeyStatus.ACTIVE,
      } as ApiKey);

      const result = await service.createKey(userId, name, customExpiration);

      expect(result.expiresAt).toEqual(customExpiration);
    });
  });

  describe('rotateKey', () => {
    it('should rotate an active API key', async () => {
      const userId = 'user-123';
      const keyId = 'key-1';
      const oldKey = {
        id: keyId,
        userId,
        name: 'Test Key',
        keyHash: 'old-hash',
        keyPrefix: 'chioma_sk_old...',
        status: ApiKeyStatus.ACTIVE,
        isExpired: () => false,
        rotatedAt: null,
      } as ApiKey;

      mockApiKeyRepo.findOne.mockResolvedValue(oldKey);

      mockApiKeyRepo.create.mockReturnValue({
        userId,
        name: 'Test Key',
        keyHash: 'new-hash',
        keyPrefix: 'chioma_sk_new...',
        isRotated: true,
        previousKeyHash: 'old-hash',
        rotatedAt: new Date(),
        status: ApiKeyStatus.ACTIVE,
      } as ApiKey);

      mockApiKeyRepo.save
        .mockResolvedValueOnce({
          id: 'key-2',
          userId,
          name: 'Test Key',
          keyHash: 'new-hash',
          keyPrefix: 'chioma_sk_new...',
          isRotated: true,
          previousKeyHash: 'old-hash',
          rotatedAt: new Date(),
          status: ApiKeyStatus.ACTIVE,
        } as ApiKey)
        .mockResolvedValueOnce({
          ...oldKey,
          status: ApiKeyStatus.EXPIRED,
          rotatedAt: new Date(),
        } as ApiKey);

      mockRotationHistoryRepo.create.mockReturnValue({
        apiKeyId: 'key-2',
        userId,
        oldKeyHash: 'old-hash',
        newKeyHash: 'new-hash',
      } as ApiKeyRotationHistory);

      mockRotationHistoryRepo.save.mockResolvedValue({
        id: 'history-1',
        apiKeyId: 'key-2',
        userId,
        oldKeyHash: 'old-hash',
        newKeyHash: 'new-hash',
      } as ApiKeyRotationHistory);

      const result = await service.rotateKey(userId, keyId);

      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('id');
      expect(mockApiKeyRepo.create).toHaveBeenCalled();
      expect(mockRotationHistoryRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when rotating an inactive key', async () => {
      const userId = 'user-123';
      const keyId = 'key-1';
      const oldKey = {
        id: keyId,
        userId,
        status: ApiKeyStatus.REVOKED,
      } as ApiKey;

      mockApiKeyRepo.findOne.mockResolvedValue(oldKey);

      await expect(service.rotateKey(userId, keyId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateKey', () => {
    it('should return null for invalid key format', async () => {
      const result = await service.validateKey('invalid_key');
      expect(result).toBeNull();
    });

    it('should return null for non-existent key', async () => {
      mockApiKeyRepo.findOne.mockResolvedValue(null);
      const result = await service.validateKey(
        'chioma_sk_abcdefghijklmnopqrstuvwxyz',
      );
      expect(result).toBeNull();
    });

    it('should return null for expired key', async () => {
      const expiredKey = {
        id: 'key-1',
        keyHash: 'hash',
        status: ApiKeyStatus.ACTIVE,
        expiresAt: new Date(Date.now() - 1000),
        isExpired: () => true,
      } as ApiKey;

      mockApiKeyRepo.findOne.mockResolvedValue(expiredKey);
      mockApiKeyRepo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.validateKey(
        'chioma_sk_abcdefghijklmnopqrstuvwxyz',
      );
      expect(result).toBeNull();
    });

    it('should return the key for valid non-expired key', async () => {
      const validKey = {
        id: 'key-1',
        userId: 'user-123',
        keyHash: 'hash',
        status: ApiKeyStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        isExpired: () => false,
      } as ApiKey;

      mockApiKeyRepo.findOne.mockResolvedValue(validKey);
      mockApiKeyRepo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.validateKey(
        'chioma_sk_abcdefghijklmnopqrstuvwxyz',
      );
      expect(result).toEqual(validKey);
    });
  });

  describe('getKeysExpiringSoon', () => {
    it('should return keys expiring within 30 days', async () => {
      const userId = 'user-123';
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: 'key-1',
            name: 'Test Key',
            expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          },
        ]),
      };

      mockApiKeyRepo.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.getKeysExpiringSoon(userId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Key');
    });
  });

  describe('deactivateExpiredKeys', () => {
    it('should update expired keys to EXPIRED status', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      };

      mockApiKeyRepo.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.deactivateExpiredKeys();

      expect(result).toBe(5);
    });
  });
});
