import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileService } from '../profile.service';
import { ProfileMetadata } from '../entities/profile-metadata.entity';
import { User } from '../../users/entities/user.entity';
import { SorobanClientService } from '../../../common/services/soroban-client.service';
import { ProfileContractService, AccountType } from '../../../blockchain/profile/profile.service';
import { IpfsService } from '../services/ipfs.service';
import { CreateProfileDto, AccountTypeDto } from '../dto/create-profile.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

describe('ProfileService Integration Tests', () => {
  let service: ProfileService;
  let profileMetadataRepository: Repository<ProfileMetadata>;
  let userRepository: Repository<User>;
  let profileContract: ProfileContractService;
  let ipfsService: IpfsService;

  const mockUser = {
    id: 'user-123',
    walletAddress: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
  };

  const mockProfileMetadata = {
    id: 'profile-123',
    userId: 'user-123',
    walletAddress: mockUser.walletAddress,
    displayName: 'John Doe',
    bio: 'Test bio',
    avatarUrl: 'https://example.com/avatar.jpg',
    metadata: { preferences: { notifications: true } },
    dataHash: 'abc123',
    ipfsCid: 'QmXyz',
    lastSyncedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: getRepositoryToken(ProfileMetadata),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: SorobanClientService,
          useValue: {
            verifyStellarAddress: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: ProfileContractService,
          useValue: {
            createProfile: jest.fn().mockResolvedValue('tx-hash-123'),
            updateProfile: jest.fn().mockResolvedValue('tx-hash-456'),
            getProfile: jest.fn(),
          },
        },
        {
          provide: IpfsService,
          useValue: {
            isConfigured: jest.fn().mockReturnValue(true),
            uploadProfileData: jest.fn().mockResolvedValue({
              cid: 'QmXyz',
              url: 'https://gateway.pinata.cloud/ipfs/QmXyz',
              dataHash: 'abc123',
              size: 1024,
            }),
            computeDataHashHex: jest.fn().mockReturnValue('abc123'),
            getGatewayUrl: jest.fn().mockReturnValue('https://gateway.pinata.cloud/ipfs/QmXyz'),
            verifyDataIntegrity: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    profileMetadataRepository = module.get<Repository<ProfileMetadata>>(
      getRepositoryToken(ProfileMetadata),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    profileContract = module.get<ProfileContractService>(ProfileContractService);
    ipfsService = module.get<IpfsService>(IpfsService);
  });

  describe('createProfile', () => {
    const createDto: CreateProfileDto = {
      accountType: AccountTypeDto.Tenant,
      displayName: 'John Doe',
      bio: 'Test bio',
      avatarUrl: 'https://example.com/avatar.jpg',
      metadata: { preferences: { notifications: true } },
    };

    it('should create a profile successfully with IPFS', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(profileMetadataRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(profileMetadataRepository, 'create').mockReturnValue(mockProfileMetadata as any);
      jest.spyOn(profileMetadataRepository, 'save').mockResolvedValue(mockProfileMetadata as any);

      const result = await service.createProfile(mockUser.id, createDto);

      expect(result).toEqual({
        message: 'Profile created successfully',
        transactionHash: 'tx-hash-123',
        dataHash: 'abc123',
        ipfsCid: 'QmXyz',
        ipfsUrl: 'https://gateway.pinata.cloud/ipfs/QmXyz',
      });

      expect(ipfsService.uploadProfileData).toHaveBeenCalled();
      expect(profileContract.createProfile).toHaveBeenCalledWith(
        mockUser.walletAddress,
        AccountType.Tenant,
        expect.any(Buffer),
      );
      expect(profileMetadataRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createProfile('invalid-id', createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when wallet not connected', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue({
        id: 'user-123',
        walletAddress: null,
      } as any);

      await expect(service.createProfile('user-123', createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException when profile already exists', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(profileMetadataRepository, 'findOne').mockResolvedValue(mockProfileMetadata as any);

      await expect(service.createProfile(mockUser.id, createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should handle IPFS unavailability gracefully', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(profileMetadataRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(profileMetadataRepository, 'create').mockReturnValue(mockProfileMetadata as any);
      jest.spyOn(profileMetadataRepository, 'save').mockResolvedValue(mockProfileMetadata as any);
      jest.spyOn(ipfsService, 'isConfigured').mockReturnValue(false);

      const result = await service.createProfile(mockUser.id, createDto);

      expect(result.ipfsCid).toBeUndefined();
      expect(result.dataHash).toBe('abc123');
      expect(ipfsService.uploadProfileData).not.toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    const updateDto: UpdateProfileDto = {
      displayName: 'Jane Doe',
      accountType: AccountTypeDto.Landlord,
    };

    it('should update profile successfully', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(profileMetadataRepository, 'findOne').mockResolvedValue(mockProfileMetadata as any);
      jest.spyOn(profileMetadataRepository, 'save').mockResolvedValue({
        ...mockProfileMetadata,
        displayName: 'Jane Doe',
      } as any);
      jest.spyOn(ipfsService, 'computeDataHashHex').mockReturnValue('def456');

      const result = await service.updateProfile(mockUser.id, updateDto);

      expect(result.message).toBe('Profile updated successfully');
      expect(result.onChainUpdated).toBe(true);
      expect(profileContract.updateProfile).toHaveBeenCalled();
    });

    it('should not update on-chain if hash unchanged and no account type change', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(profileMetadataRepository, 'findOne').mockResolvedValue(mockProfileMetadata as any);
      jest.spyOn(profileMetadataRepository, 'save').mockResolvedValue(mockProfileMetadata as any);
      jest.spyOn(ipfsService, 'computeDataHashHex').mockReturnValue('abc123'); // Same hash

      const result = await service.updateProfile(mockUser.id, { bio: 'Same hash bio' });

      expect(result.onChainUpdated).toBe(false);
      expect(result.transactionHash).toBeUndefined();
    });

    it('should throw NotFoundException when profile not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(profileMetadataRepository, 'findOne').mockResolvedValue(null);

      await expect(service.updateProfile(mockUser.id, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getProfile', () => {
    it('should return profile with on-chain and off-chain data', async () => {
      const onChainProfile = {
        owner: mockUser.walletAddress,
        version: 1,
        accountType: AccountType.Tenant,
        lastUpdated: Date.now(),
        dataHash: 'abc123',
        isVerified: false,
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(profileContract, 'getProfile').mockResolvedValue(onChainProfile);
      jest.spyOn(profileMetadataRepository, 'findOne').mockResolvedValue(mockProfileMetadata as any);

      const result = await service.getProfile(mockUser.id);

      expect(result.walletAddress).toBe(mockUser.walletAddress);
      expect(result.onChain).toBeDefined();
      expect(result.offChain).toBeDefined();
      expect(result.dataIntegrityValid).toBe(true);
    });

    it('should detect data integrity mismatch', async () => {
      const onChainProfile = {
        owner: mockUser.walletAddress,
        version: 1,
        accountType: AccountType.Tenant,
        lastUpdated: Date.now(),
        dataHash: 'different-hash',
        isVerified: false,
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(profileContract, 'getProfile').mockResolvedValue(onChainProfile);
      jest.spyOn(profileMetadataRepository, 'findOne').mockResolvedValue(mockProfileMetadata as any);

      const result = await service.getProfile(mockUser.id);

      expect(result.dataIntegrityValid).toBe(false);
    });
  });

  describe('verifyDataIntegrity', () => {
    it('should verify data integrity successfully', async () => {
      const onChainProfile = {
        owner: mockUser.walletAddress,
        version: 1,
        accountType: AccountType.Tenant,
        lastUpdated: Date.now(),
        dataHash: 'abc123',
        isVerified: false,
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(profileMetadataRepository, 'findOne').mockResolvedValue(mockProfileMetadata as any);
      jest.spyOn(profileContract, 'getProfile').mockResolvedValue(onChainProfile);

      const result = await service.verifyDataIntegrity(mockUser.id);

      expect(result.valid).toBe(true);
      expect(result.message).toContain('Data integrity verified');
    });

    it('should detect integrity mismatch', async () => {
      const onChainProfile = {
        owner: mockUser.walletAddress,
        version: 1,
        accountType: AccountType.Tenant,
        lastUpdated: Date.now(),
        dataHash: 'wrong-hash',
        isVerified: false,
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(profileMetadataRepository, 'findOne').mockResolvedValue(mockProfileMetadata as any);
      jest.spyOn(profileContract, 'getProfile').mockResolvedValue(onChainProfile);

      const result = await service.verifyDataIntegrity(mockUser.id);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Data integrity mismatch');
    });
  });
});
