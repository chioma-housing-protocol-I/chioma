import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { PropertyRegistryService } from './property-registry.service';
import {
  PropertyRegistry,
  PropertyHistory,
} from '../entities/property-registry.entity';
import { StellarAccount } from '../entities/stellar-account.entity';
import { EncryptionService } from './encryption.service';

// Mock Stellar SDK to prevent actual network calls during testing
jest.mock('@stellar/stellar-sdk', () => {
  const mockTx = { sign: jest.fn() };
  return {
    SorobanRpc: {
      Server: jest.fn().mockImplementation(() => ({
        getAccount: jest.fn().mockResolvedValue({ sequence: '1' }),
        prepareTransaction: jest.fn().mockResolvedValue(mockTx),
        sendTransaction: jest
          .fn()
          .mockResolvedValue({ status: 'PENDING', hash: 'mock-tx-hash' }),
        getTransaction: jest.fn().mockResolvedValue({ status: 'SUCCESS' }),
      })),
    },
    Contract: jest.fn().mockImplementation(() => ({
      call: jest.fn().mockReturnValue('mock-operation'),
    })),
    Keypair: {
      fromSecret: jest.fn().mockReturnValue({}),
    },
    Account: jest.fn().mockImplementation(() => ({})),
    TransactionBuilder: jest.fn().mockImplementation(() => ({
      addOperation: jest.fn().mockReturnThis(),
      setTimeout: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue(mockTx),
    })),
    nativeToScVal: jest.fn().mockReturnValue({}),
  };
});

describe('PropertyRegistryService', () => {
  let service: PropertyRegistryService;

  const mockPropertyRegistryRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockResolvedValue({}),
    findOne: jest.fn(),
    count: jest.fn(),
  };

  const mockPropertyHistoryRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockResolvedValue({}),
    find: jest.fn(),
  };

  const mockStellarAccountRepo = {
    findOne: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'stellar')
        return {
          rpcUrl: 'http://localhost',
          networkPassphrase: 'Test SDF Network',
        };
      if (key === 'PROPERTY_REGISTRY_CONTRACT_ID') return 'C_MOCK_CONTRACT_ID';
      return null;
    }),
  };

  const mockEncryptionService = {
    decrypt: jest.fn().mockReturnValue('mock-secret-key'),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PropertyRegistryService,
        {
          provide: getRepositoryToken(PropertyRegistry),
          useValue: mockPropertyRegistryRepo,
        },
        {
          provide: getRepositoryToken(PropertyHistory),
          useValue: mockPropertyHistoryRepo,
        },
        {
          provide: getRepositoryToken(StellarAccount),
          useValue: mockStellarAccountRepo,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
      ],
    }).compile();

    // Use (module as any) to bypass the strict TypeScript compiler error
    service = (module as any).get(PropertyRegistryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerProperty', () => {
    it('should successfully register a property and save to DB', async () => {
      mockStellarAccountRepo.findOne.mockResolvedValue({
        secretKeyEncrypted: 'encrypted',
      });

      const dto = {
        propertyId: 'prop-1',
        ownerAddress: 'owner-addr',
        metadataHash: 'ipfs-hash',
      };
      const txHash = await service.registerProperty(dto, 'signer-pub-key');

      expect(txHash).toBe('mock-tx-hash');
      expect(mockPropertyRegistryRepo.create).toHaveBeenCalledWith(dto);
      expect(mockPropertyRegistryRepo.save).toHaveBeenCalled();
    });
  });

  describe('transferProperty', () => {
    it('should update owner and save history', async () => {
      const mockProperty = { propertyId: 'prop-1', ownerAddress: 'old-owner' };
      mockPropertyRegistryRepo.findOne.mockResolvedValue(mockProperty);

      const dto = {
        propertyId: 'prop-1',
        fromAddress: 'old-owner',
        toAddress: 'new-owner',
      };
      const txHash = await service.transferProperty(dto);

      expect(txHash).toBe('off-chain-transfer');
      expect(mockProperty.ownerAddress).toBe('new-owner');
      expect(mockPropertyRegistryRepo.save).toHaveBeenCalledWith(mockProperty);
      expect(mockPropertyHistoryRepo.create).toHaveBeenCalled();
      expect(mockPropertyHistoryRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if property does not exist', async () => {
      mockPropertyRegistryRepo.findOne.mockResolvedValue(null);
      const dto = {
        propertyId: 'non-existent',
        fromAddress: 'old',
        toAddress: 'new',
      };

      await expect(service.transferProperty(dto)).rejects.toThrow(
        'Property not found in local DB',
      );
    });
  });

  describe('verifyProperty', () => {
    it('should verify a property on-chain and update DB', async () => {
      mockStellarAccountRepo.findOne.mockResolvedValue({
        secretKeyEncrypted: 'encrypted',
      });
      const mockProperty = {
        propertyId: 'prop-1',
        verified: false,
        verifiedBy: null,
      };
      mockPropertyRegistryRepo.findOne.mockResolvedValue(mockProperty);

      const dto = { propertyId: 'prop-1', verifierAddress: 'admin-addr' };
      const txHash = await service.verifyProperty(dto);

      expect(txHash).toBe('mock-tx-hash');
      expect(mockProperty.verified).toBe(true);
      expect(mockProperty.verifiedBy).toBe('admin-addr');
      expect(mockPropertyRegistryRepo.save).toHaveBeenCalledWith(mockProperty);
    });
  });

  describe('Read Methods', () => {
    it('getProperty should return a property', async () => {
      mockPropertyRegistryRepo.findOne.mockResolvedValue({
        propertyId: 'prop-1',
      });
      const result = await service.getProperty('prop-1');
      expect(result).toEqual({ propertyId: 'prop-1' });
    });

    it('getPropertyCount should return count', async () => {
      mockPropertyRegistryRepo.count.mockResolvedValue(10);
      const result = await service.getPropertyCount();
      expect(result).toBe(10);
    });

    it('getPropertyHistory should return history array', async () => {
      mockPropertyHistoryRepo.find.mockResolvedValue([{ id: 1 }]);
      const result = await service.getPropertyHistory('prop-1');
      expect(result).toEqual([{ id: 1 }]);
      expect(mockPropertyHistoryRepo.find).toHaveBeenCalledWith({
        where: { propertyId: 'prop-1' },
        order: { transferredAt: 'DESC' },
      });
    });
  });
});
