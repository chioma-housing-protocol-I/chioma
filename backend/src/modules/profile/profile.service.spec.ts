import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  ProfileService,
  profileCacheDependencyTag,
  profileCacheKey,
} from './profile.service';
import { ProfileMetadata } from './entities/profile-metadata.entity';
import { SorobanClientService } from '../../common/services/soroban-client.service';
import { ProfileContractService } from '../../blockchain/profile/profile.service';
import { IpfsService } from './services/ipfs.service';
import { User, UserRole, AuthMethod } from '../users/entities/user.entity';
import { KycStatus } from '../kyc/kyc-status.enum';
import { AccountTypeDto } from './dto/create-profile.dto';
import { CacheService } from '../../common/cache/cache.service';

/**
 * A minimal in-memory stand-in for CacheService that exercises the same
 * get/set/getOrSet/dependency-invalidation contract the real
 * Redis-backed implementation provides, without requiring a real cache
 * manager in unit tests.
 */
class FakeCacheService {
  private readonly store = new Map<string, unknown>();
  private readonly depToKeys = new Map<string, Set<string>>();

  async get<T>(key: string): Promise<T | null> {
    return (this.store.get(key) as T) ?? null;
  }

  async set<T>(
    key: string,
    value: T,
    _ttlMs?: number,
    dependencies?: string[],
  ): Promise<void> {
    this.store.set(key, value);
    for (const dep of dependencies ?? []) {
      if (!this.depToKeys.has(dep)) {
        this.depToKeys.set(dep, new Set());
      }
      this.depToKeys.get(dep)!.add(key);
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs?: number,
    options?: { dependencies?: string[] },
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const value = await factory();
    await this.set(key, value, ttlMs, options?.dependencies);
    return value;
  }

  async invalidateDependencies(dependencies: string[]): Promise<void> {
    for (const dep of dependencies) {
      const keys = this.depToKeys.get(dep);
      if (!keys) {
        continue;
      }
      for (const key of keys) {
        this.store.delete(key);
      }
      this.depToKeys.delete(dep);
    }
  }

  has(key: string): boolean {
    return this.store.has(key);
  }
}

describe('ProfileService', () => {
  let service: ProfileService;
  let fakeCache: FakeCacheService;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedPassword',
    firstName: 'Test',
    lastName: 'User',
    phoneNumber: null,
    avatarUrl: null,
    role: UserRole.USER,
    emailVerified: true,
    verificationToken: null,
    verificationTokenExpires: null,
    resetToken: null,
    resetTokenExpires: null,
    failedLoginAttempts: 0,
    accountLockedUntil: null,
    lastLoginAt: new Date(),
    isActive: true,
    walletAddress: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
    authMethod: AuthMethod.STELLAR,
    refreshToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    kycStatus: KycStatus.PENDING,
    loginCount: 0,
    preferredLanguage: 'en',
    timezone: 'UTC',
    twoFactorEnabled: false,
    emailNotifications: true,
    smsNotifications: false,
    marketingOptIn: false,
  };

  const mockProfileMetadata: ProfileMetadata = {
    id: 'profile-123',
    userId: 'user-123',
    user: mockUser,
    walletAddress: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
    displayName: 'Test User',
    bio: 'Test bio',
    avatarUrl: 'https://example.com/avatar.jpg',
    metadata: { preferences: { notifications: true } },
    dataHash: 'a'.repeat(64),
    ipfsCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
    lastSyncedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProfileMetadataRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockSorobanClient = {
    verifyStellarAddress: jest.fn(),
  };

  const mockProfileContract = {
    createProfile: jest.fn(),
    updateProfile: jest.fn(),
    getProfile: jest.fn(),
  };

  const mockIpfsService = {
    isConfigured: jest.fn(),
    uploadProfileData: jest.fn(),
    computeDataHashHex: jest.fn(),
    getGatewayUrl: jest.fn(),
    verifyDataIntegrity: jest.fn(),
  };

  beforeEach(async () => {
    fakeCache = new FakeCacheService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: getRepositoryToken(ProfileMetadata),
          useValue: mockProfileMetadataRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: SorobanClientService,
          useValue: mockSorobanClient,
        },
        {
          provide: ProfileContractService,
          useValue: mockProfileContract,
        },
        {
          provide: IpfsService,
          useValue: mockIpfsService,
        },
        {
          provide: CacheService,
          useValue: fakeCache,
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProfile', () => {
    const createDto = {
      accountType: AccountTypeDto.User,
      displayName: 'Test User',
      bio: 'Test bio',
    };

    it('should create a profile successfully with IPFS', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockProfileMetadataRepository.findOne.mockResolvedValue(null);
      mockIpfsService.isConfigured.mockReturnValue(true);
      mockIpfsService.uploadProfileData.mockResolvedValue({
        cid: 'bafytest123',
        dataHash: 'a'.repeat(64),
        size: 1024,
        url: 'https://gateway.pinata.cloud/ipfs/bafytest123',
      });
      mockProfileContract.createProfile.mockResolvedValue('tx123');
      mockProfileMetadataRepository.create.mockReturnValue(mockProfileMetadata);
      mockProfileMetadataRepository.save.mockResolvedValue(mockProfileMetadata);

      const result = await service.createProfile('user-123', createDto);

      expect(result.message).toBe('Profile created successfully');
      expect(result.transactionHash).toBe('tx123');
      expect(result.ipfsCid).toBe('bafytest123');
      expect(mockIpfsService.uploadProfileData).toHaveBeenCalled();
      expect(mockProfileContract.createProfile).toHaveBeenCalled();
    });

    it('should create a profile without IPFS when not configured', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockProfileMetadataRepository.findOne.mockResolvedValue(null);
      mockIpfsService.isConfigured.mockReturnValue(false);
      mockIpfsService.computeDataHashHex.mockReturnValue('b'.repeat(64));
      mockProfileContract.createProfile.mockResolvedValue('tx456');
      mockProfileMetadataRepository.create.mockReturnValue(mockProfileMetadata);
      mockProfileMetadataRepository.save.mockResolvedValue(mockProfileMetadata);

      const result = await service.createProfile('user-123', createDto);

      expect(result.message).toBe('Profile created successfully');
      expect(result.ipfsCid).toBeUndefined();
      expect(mockIpfsService.uploadProfileData).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createProfile('user-999', createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if wallet not connected', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        walletAddress: null,
      });

      await expect(
        service.createProfile('user-123', createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if profile already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockProfileMetadataRepository.findOne.mockResolvedValue(
        mockProfileMetadata,
      );

      await expect(
        service.createProfile('user-123', createDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateProfile', () => {
    const updateDto = {
      displayName: 'Updated Name',
      bio: 'Updated bio',
    };

    it('should update profile and upload to IPFS when hash changes', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockProfileMetadataRepository.findOne.mockResolvedValue(
        mockProfileMetadata,
      );
      mockIpfsService.isConfigured.mockReturnValue(true);
      mockIpfsService.computeDataHashHex.mockReturnValue('c'.repeat(64));
      mockIpfsService.uploadProfileData.mockResolvedValue({
        cid: 'bafynewcid',
        dataHash: 'c'.repeat(64),
        size: 2048,
        url: 'https://gateway.pinata.cloud/ipfs/bafynewcid',
      });
      mockProfileContract.updateProfile.mockResolvedValue('tx789');
      mockProfileMetadataRepository.save.mockResolvedValue({
        ...mockProfileMetadata,
        ...updateDto,
      });

      const result = await service.updateProfile('user-123', updateDto);

      expect(result.message).toBe('Profile updated successfully');
      expect(result.onChainUpdated).toBe(true);
      expect(result.ipfsCid).toBe('bafynewcid');
    });

    it('should not update on-chain if hash unchanged', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockProfileMetadataRepository.findOne.mockResolvedValue(
        mockProfileMetadata,
      );
      mockIpfsService.computeDataHashHex.mockReturnValue(
        mockProfileMetadata.dataHash,
      );
      mockIpfsService.getGatewayUrl.mockReturnValue('https://gateway/ipfs/cid');
      mockProfileMetadataRepository.save.mockResolvedValue(mockProfileMetadata);

      const result = await service.updateProfile('user-123', {});

      expect(result.onChainUpdated).toBe(false);
      expect(mockProfileContract.updateProfile).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if profile not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockProfileMetadataRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateProfile('user-123', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProfile', () => {
    it('should return profile for user', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockSorobanClient.verifyStellarAddress.mockReturnValue(true);
      mockProfileContract.getProfile.mockResolvedValue({
        owner: mockUser.walletAddress,
        version: 1,
        accountType: 0,
        lastUpdated: Date.now(),
        dataHash: 'a'.repeat(64),
        isVerified: false,
      });
      mockProfileMetadataRepository.findOne.mockResolvedValue(
        mockProfileMetadata,
      );
      mockIpfsService.getGatewayUrl.mockReturnValue('https://gateway/ipfs/cid');

      const result = await service.getProfile('user-123');

      expect(result.walletAddress).toBe(mockUser.walletAddress);
      expect(result.onChain).toBeDefined();
      expect(result.offChain).toBeDefined();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getProfile('user-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getProfileByWallet', () => {
    it('should return profile by wallet address', async () => {
      const testHash =
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

      mockSorobanClient.verifyStellarAddress.mockReturnValue(true);
      mockProfileContract.getProfile.mockResolvedValue({
        owner: mockUser.walletAddress,
        version: 1,
        accountType: 0,
        lastUpdated: Date.now(),
        dataHash: testHash,
        isVerified: true,
      });
      mockProfileMetadataRepository.findOne.mockResolvedValue({
        ...mockProfileMetadata,
        dataHash: testHash,
      });
      mockIpfsService.getGatewayUrl.mockReturnValue('https://gateway/ipfs/cid');

      const result = await service.getProfileByWallet(mockUser.walletAddress!);

      expect(result.walletAddress).toBe(mockUser.walletAddress);
      expect(result.onChain).not.toBeNull();
      expect(result.offChain).not.toBeNull();
      expect(result.onChain?.dataHash).toBe(testHash);
      expect(result.offChain?.dataHash).toBe(testHash);
      expect(result.dataIntegrityValid).toBe(true);
    });

    it('should throw BadRequestException for invalid wallet', async () => {
      mockSorobanClient.verifyStellarAddress.mockReturnValue(false);

      await expect(service.getProfileByWallet('invalid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('serves a cached result on a repeat read without re-querying the chain', async () => {
      mockSorobanClient.verifyStellarAddress.mockReturnValue(true);
      mockProfileContract.getProfile.mockResolvedValue({
        owner: mockUser.walletAddress,
        version: 1,
        accountType: 0,
        lastUpdated: Date.now(),
        dataHash: mockProfileMetadata.dataHash,
        isVerified: true,
      });
      mockProfileMetadataRepository.findOne.mockResolvedValue(
        mockProfileMetadata,
      );
      mockIpfsService.getGatewayUrl.mockReturnValue('https://gateway/ipfs/cid');

      await service.getProfileByWallet(mockUser.walletAddress!);
      await service.getProfileByWallet(mockUser.walletAddress!);

      expect(mockProfileContract.getProfile).toHaveBeenCalledTimes(1);
      expect(mockProfileMetadataRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('populates the cache under the documented key for the wallet', async () => {
      mockSorobanClient.verifyStellarAddress.mockReturnValue(true);
      mockProfileContract.getProfile.mockResolvedValue(null);
      mockProfileMetadataRepository.findOne.mockResolvedValue(null);

      await service.getProfileByWallet(mockUser.walletAddress!);

      expect(fakeCache.has(profileCacheKey(mockUser.walletAddress!))).toBe(
        true,
      );
    });
  });

  describe('cache invalidation on profile write (#1597)', () => {
    async function primeCachedRead(displayName: string): Promise<void> {
      mockSorobanClient.verifyStellarAddress.mockReturnValue(true);
      mockProfileContract.getProfile.mockResolvedValue(null);
      mockProfileMetadataRepository.findOne.mockResolvedValue({
        ...mockProfileMetadata,
        displayName,
      });
      await service.getProfileByWallet(mockUser.walletAddress!);
    }

    it('updateProfile invalidates the cached public read so it reflects the new data next time', async () => {
      await primeCachedRead('Stale Name');
      expect(fakeCache.has(profileCacheKey(mockUser.walletAddress!))).toBe(
        true,
      );

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockProfileMetadataRepository.findOne.mockResolvedValue(
        mockProfileMetadata,
      );
      mockIpfsService.computeDataHashHex.mockReturnValue('c'.repeat(64));
      mockIpfsService.isConfigured.mockReturnValue(false);
      mockProfileMetadataRepository.save.mockResolvedValue({
        ...mockProfileMetadata,
        displayName: 'Fresh Name',
        dataHash: 'c'.repeat(64),
      });

      await service.updateProfile('user-123', { displayName: 'Fresh Name' });

      // The write must clear the entry registered under this wallet's tag.
      expect(fakeCache.has(profileCacheKey(mockUser.walletAddress!))).toBe(
        false,
      );

      // The next read is visible immediately (re-fetches instead of
      // serving the stale cached value).
      mockSorobanClient.verifyStellarAddress.mockReturnValue(true);
      mockProfileContract.getProfile.mockResolvedValue(null);
      mockProfileMetadataRepository.findOne.mockResolvedValue({
        ...mockProfileMetadata,
        displayName: 'Fresh Name',
      });

      const result = await service.getProfileByWallet(mockUser.walletAddress!);
      expect(result.offChain?.displayName).toBe('Fresh Name');
    });

    it('invalidation is scoped to the written wallet and does not clear other wallets', async () => {
      const otherWallet =
        'GDIFFERENTWALLETADDRESSFORTESTINGABCDEFGHIJKLMNOPQRSTUV';

      mockSorobanClient.verifyStellarAddress.mockReturnValue(true);
      mockProfileContract.getProfile.mockResolvedValue(null);
      mockProfileMetadataRepository.findOne.mockResolvedValue(
        mockProfileMetadata,
      );
      await service.getProfileByWallet(otherWallet);
      await service.getProfileByWallet(mockUser.walletAddress!);

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockIpfsService.computeDataHashHex.mockReturnValue('c'.repeat(64));
      mockIpfsService.isConfigured.mockReturnValue(false);
      mockProfileMetadataRepository.save.mockResolvedValue(mockProfileMetadata);

      await service.updateProfile('user-123', { displayName: 'Fresh Name' });

      expect(fakeCache.has(profileCacheKey(otherWallet))).toBe(true);
      expect(fakeCache.has(profileCacheKey(mockUser.walletAddress!))).toBe(
        false,
      );
    });

    it('createProfile invalidates any cached (e.g. not-found) read for the wallet', async () => {
      mockSorobanClient.verifyStellarAddress.mockReturnValue(true);
      mockProfileContract.getProfile.mockResolvedValue(null);
      mockProfileMetadataRepository.findOne.mockResolvedValueOnce(null); // pre-create read
      await service.getProfileByWallet(mockUser.walletAddress!);
      expect(fakeCache.has(profileCacheKey(mockUser.walletAddress!))).toBe(
        true,
      );

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockProfileMetadataRepository.findOne.mockResolvedValueOnce(null); // no existing profile
      mockIpfsService.isConfigured.mockReturnValue(false);
      mockIpfsService.computeDataHashHex.mockReturnValue('d'.repeat(64));
      mockProfileContract.createProfile.mockResolvedValue('tx-create');
      mockProfileMetadataRepository.create.mockReturnValue(mockProfileMetadata);
      mockProfileMetadataRepository.save.mockResolvedValue(mockProfileMetadata);

      await service.createProfile('user-123', {
        displayName: 'New User',
        accountType: AccountTypeDto.User,
      });

      expect(fakeCache.has(profileCacheKey(mockUser.walletAddress!))).toBe(
        false,
      );
    });

    it('the dependency tag is derived from the wallet address', () => {
      expect(profileCacheDependencyTag('GABC')).toContain('GABC');
      expect(profileCacheDependencyTag('GABC')).not.toBe(
        profileCacheDependencyTag('GXYZ'),
      );
    });
  });

  describe('verifyDataIntegrity', () => {
    it('should verify data integrity successfully', async () => {
      const testHash =
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockProfileMetadataRepository.findOne.mockResolvedValue({
        ...mockProfileMetadata,
        dataHash: testHash,
      });
      mockIpfsService.computeDataHashHex.mockReturnValue(testHash);
      mockIpfsService.verifyDataIntegrity.mockResolvedValue(true);
      mockProfileContract.getProfile.mockResolvedValue({
        owner: mockUser.walletAddress,
        version: 1,
        accountType: 0,
        lastUpdated: Date.now(),
        dataHash: testHash,
        isVerified: true,
      });

      const result = await service.verifyDataIntegrity('user-123');

      expect(result.valid).toBe(true);
      expect(result.message).toContain('verified');
    });

    it('should detect data integrity mismatch', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockProfileMetadataRepository.findOne.mockResolvedValue(
        mockProfileMetadata,
      );
      mockIpfsService.computeDataHashHex.mockReturnValue('b'.repeat(64));
      mockProfileContract.getProfile.mockResolvedValue({
        dataHash: 'a'.repeat(64),
      });

      const result = await service.verifyDataIntegrity('user-123');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('mismatch');
    });

    it('should handle missing on-chain profile', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockProfileMetadataRepository.findOne.mockResolvedValue(
        mockProfileMetadata,
      );
      mockIpfsService.computeDataHashHex.mockReturnValue('a'.repeat(64));
      mockProfileContract.getProfile.mockResolvedValue(null);

      const result = await service.verifyDataIntegrity('user-123');

      expect(result.valid).toBe(false);
      expect(result.onChainHash).toBeNull();
    });
  });
});
