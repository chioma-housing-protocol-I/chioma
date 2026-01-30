import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { IpfsService, ProfileIpfsData } from './ipfs.service';

describe('IpfsService', () => {
  let service: IpfsService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockProfileData: ProfileIpfsData = {
    displayName: 'Test User',
    bio: 'Test bio',
    avatarUrl: 'https://example.com/avatar.jpg',
    metadata: { preferences: { notifications: true } },
    walletAddress: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
    timestamp: 1706745600000,
  };

  beforeEach(async () => {
    mockConfigService.get.mockImplementation(
      (key: string, defaultVal?: string) => {
        const config: Record<string, string> = {
          PINATA_JWT: 'test-jwt-token',
          IPFS_GATEWAY: 'https://gateway.pinata.cloud/ipfs',
        };
        return config[key] || defaultVal || '';
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpfsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<IpfsService>(IpfsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isConfigured', () => {
    it('should return true when PINATA_JWT is set', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when no credentials are set', async () => {
      mockConfigService.get.mockReturnValue('');

      const module = await Test.createTestingModule({
        providers: [
          IpfsService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const svc = module.get<IpfsService>(IpfsService);
      expect(svc.isConfigured()).toBe(false);
    });
  });

  describe('computeDataHashHex', () => {
    it('should compute deterministic hash', () => {
      const hash1 = service.computeDataHashHex(mockProfileData);
      const hash2 = service.computeDataHashHex(mockProfileData);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should produce different hashes for different data', () => {
      const hash1 = service.computeDataHashHex(mockProfileData);
      const hash2 = service.computeDataHashHex({
        ...mockProfileData,
        displayName: 'Different Name',
      });

      expect(hash1).not.toBe(hash2);
    });

    it('should handle null values', () => {
      const dataWithNulls: ProfileIpfsData = {
        displayName: null,
        bio: null,
        avatarUrl: null,
        metadata: null,
        walletAddress:
          'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
        timestamp: 1706745600000,
      };

      const hash = service.computeDataHashHex(dataWithNulls);
      expect(hash).toHaveLength(64);
    });
  });

  describe('computeDataHashBuffer', () => {
    it('should return a 32-byte buffer', () => {
      const buffer = service.computeDataHashBuffer(mockProfileData);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBe(32);
    });

    it('should match hex hash when converted', () => {
      const buffer = service.computeDataHashBuffer(mockProfileData);
      const hex = service.computeDataHashHex(mockProfileData);

      expect(buffer.toString('hex')).toBe(hex);
    });
  });

  describe('getGatewayUrl', () => {
    it('should return correct gateway URL', () => {
      const cid = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
      const url = service.getGatewayUrl(cid);

      expect(url).toBe(`https://gateway.pinata.cloud/ipfs/${cid}`);
    });
  });

  describe('uploadProfileData', () => {
    it('should throw BadRequestException when not configured', async () => {
      mockConfigService.get.mockReturnValue('');

      const module = await Test.createTestingModule({
        providers: [
          IpfsService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const svc = module.get<IpfsService>(IpfsService);

      await expect(svc.uploadProfileData(mockProfileData)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getProfileData', () => {
    it('should return null for empty CID', async () => {
      const result = await service.getProfileData('');
      expect(result).toBeNull();
    });
  });

  describe('verifyDataIntegrity', () => {
    it('should return false when profile data cannot be fetched', async () => {
      jest.spyOn(service, 'getProfileData').mockResolvedValue(null);

      const result = await service.verifyDataIntegrity('somecid', 'somehash');

      expect(result).toBe(false);
    });
  });
});
