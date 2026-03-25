import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileMetadata } from './entities/profile-metadata.entity';
import { SorobanClientService } from '../../common/services/soroban-client.service';
import { ProfileContractService } from '../../blockchain/profile/profile.service';
import { IpfsService } from './services/ipfs.service';
import { User, UserRole, AuthMethod } from '../users/entities/user.entity';
import { KycStatus } from '../kyc/kyc.entity';
import { AccountTypeDto } from './dto/create-profile.dto';

describe('ProfileService', () => {
  let service: ProfileService;

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
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProfile', () => {
    const createDto = {
      accountType: AccountTypeDto.Tenant,
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
