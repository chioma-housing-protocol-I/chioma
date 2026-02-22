import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ProfileContractService,
  AccountType,
} from '../profile.service';
import { SorobanClientService } from '../../../common/services/soroban-client.service';

describe('ProfileContractService', () => {
  let service: ProfileContractService;
  let sorobanClient: SorobanClientService;

  const mockWalletAddress = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI';
  const mockDataHash = Buffer.from('a'.repeat(64), 'hex');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileContractService,
        {
          provide: SorobanClientService,
          useValue: {
            ensureContractId: jest.fn(),
            getServerKeypair: jest.fn().mockReturnValue({
              publicKey: () => mockWalletAddress,
            }),
            getAccount: jest.fn().mockResolvedValue({}),
            getContract: jest.fn().mockReturnValue({
              call: jest.fn(),
            }),
            createTransactionBuilder: jest.fn().mockReturnValue({
              addOperation: jest.fn().mockReturnThis(),
              setTimeout: jest.fn().mockReturnThis(),
              build: jest.fn().mockReturnValue({}),
            }),
            submitTransaction: jest.fn().mockResolvedValue('mock-tx-hash'),
            simulateTransaction: jest.fn().mockResolvedValue({
              result: {
                retval: {},
              },
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ProfileContractService>(ProfileContractService);
    sorobanClient = module.get<SorobanClientService>(SorobanClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProfile', () => {
    it('should create a profile successfully', async () => {
      const result = await service.createProfile(
        mockWalletAddress,
        AccountType.Tenant,
        mockDataHash,
      );

      expect(result).toBe('mock-tx-hash');
      expect(sorobanClient.ensureContractId).toHaveBeenCalled();
      expect(sorobanClient.submitTransaction).toHaveBeenCalled();
    });

    it('should handle different account types', async () => {
      const accountTypes = [
        AccountType.Tenant,
        AccountType.Landlord,
        AccountType.Agent,
      ];

      for (const accountType of accountTypes) {
        const result = await service.createProfile(
          mockWalletAddress,
          accountType,
          mockDataHash,
        );
        expect(result).toBe('mock-tx-hash');
      }
    });
  });

  describe('updateProfile', () => {
    it('should update profile with new account type', async () => {
      const result = await service.updateProfile(
        mockWalletAddress,
        AccountType.Landlord,
        undefined,
      );

      expect(result).toBe('mock-tx-hash');
      expect(sorobanClient.submitTransaction).toHaveBeenCalled();
    });

    it('should update profile with new data hash', async () => {
      const newHash = Buffer.from('b'.repeat(64), 'hex');
      const result = await service.updateProfile(
        mockWalletAddress,
        undefined,
        newHash,
      );

      expect(result).toBe('mock-tx-hash');
    });

    it('should update both account type and data hash', async () => {
      const newHash = Buffer.from('c'.repeat(64), 'hex');
      const result = await service.updateProfile(
        mockWalletAddress,
        AccountType.Agent,
        newHash,
      );

      expect(result).toBe('mock-tx-hash');
    });
  });

  describe('getProfile', () => {
    it('should return null when profile not found', async () => {
      jest.spyOn(sorobanClient, 'simulateTransaction').mockResolvedValueOnce({
        result: null,
      } as any);

      const result = await service.getProfile(mockWalletAddress);
      expect(result).toBeNull();
    });

    it('should return profile when found', async () => {
      const mockProfile = {
        owner: mockWalletAddress,
        version: 1,
        account_type: 'Tenant',
        last_updated: Date.now(),
        data_hash: mockDataHash,
        is_verified: false,
      };

      jest.spyOn(sorobanClient, 'simulateTransaction').mockResolvedValueOnce({
        result: {
          retval: mockProfile,
        },
      } as any);

      const result = await service.getProfile(mockWalletAddress);
      expect(result).toBeDefined();
    });
  });

  describe('verifyProfile', () => {
    it('should verify a profile', async () => {
      const adminAddress = 'GADMIN123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC';
      const result = await service.verifyProfile(adminAddress, mockWalletAddress);

      expect(result).toBe('mock-tx-hash');
      expect(sorobanClient.submitTransaction).toHaveBeenCalled();
    });
  });

  describe('hasProfile', () => {
    it('should return true when profile exists', async () => {
      jest.spyOn(sorobanClient, 'simulateTransaction').mockResolvedValueOnce({
        result: {
          retval: true,
        },
      } as any);

      const result = await service.hasProfile(mockWalletAddress);
      expect(result).toBe(true);
    });

    it('should return false when profile does not exist', async () => {
      jest.spyOn(sorobanClient, 'simulateTransaction').mockResolvedValueOnce({
        result: {
          retval: false,
        },
      } as any);

      const result = await service.hasProfile(mockWalletAddress);
      expect(result).toBe(false);
    });
  });

  describe('initProfiles', () => {
    it('should initialize profiles with admin address', async () => {
      const adminAddress = 'GADMIN123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC';
      const result = await service.initProfiles(adminAddress);

      expect(result).toBe('mock-tx-hash');
      expect(sorobanClient.submitTransaction).toHaveBeenCalled();
    });
  });
});
