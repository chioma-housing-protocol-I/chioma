import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PropertyRegistryService } from './property-registry.service';
import {
  PropertyRegistry,
  PropertyHistory,
} from '../entities/property-registry.entity';

describe('PropertyRegistryService', () => {
  let service: PropertyRegistryService;
  let propertyRegistryRepo: Repository<PropertyRegistry>;
  let propertyHistoryRepo: Repository<PropertyHistory>;

  const mockPropertyRegistryRepo = {
    save: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
  };

  const mockPropertyHistoryRepo = {
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
        PROPERTY_REGISTRY_CONTRACT_ID:
          'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
        STELLAR_ADMIN_SECRET_KEY:
          'SBH4D4S2WK6VQZGKMHW5SGCHACJKDYGW52RFDEWAYQQTAABXQASX7QDB',
        STELLAR_NETWORK: 'testnet',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertyRegistryService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(PropertyRegistry),
          useValue: mockPropertyRegistryRepo,
        },
        {
          provide: getRepositoryToken(PropertyHistory),
          useValue: mockPropertyHistoryRepo,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<PropertyRegistryService>(PropertyRegistryService);
    propertyRegistryRepo = module.get<Repository<PropertyRegistry>>(
      getRepositoryToken(PropertyRegistry),
    );
    propertyHistoryRepo = module.get<Repository<PropertyHistory>>(
      getRepositoryToken(PropertyHistory),
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // registerProperty
  // ---------------------------------------------------------------------------
  describe('registerProperty', () => {
    it('should throw BadRequestException if contract not configured', async () => {
      const unconfiguredService = new PropertyRegistryService(
        { get: jest.fn(() => '') } as any,
        mockPropertyRegistryRepo as any,
        mockPropertyHistoryRepo as any,
        mockEventEmitter as any,
      );

      await expect(
        unconfiguredService.registerProperty(
          'PROP-001',
          'GOWNER123',
          'Qm1234567',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------------------
  // transferProperty
  // ---------------------------------------------------------------------------
  describe('transferProperty', () => {
    it('should throw BadRequestException if contract not configured', async () => {
      const unconfiguredService = new PropertyRegistryService(
        { get: jest.fn(() => '') } as any,
        mockPropertyRegistryRepo as any,
        mockPropertyHistoryRepo as any,
        mockEventEmitter as any,
      );

      await expect(
        unconfiguredService.transferProperty('PROP-001', 'GFROM123', 'GTO123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if property does not exist off-chain', async () => {
      mockPropertyRegistryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.transferProperty('NON-EXISTENT', 'GFROM123', 'GTO123'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPropertyRegistryRepo.findOne).toHaveBeenCalledWith({
        where: { propertyId: 'NON-EXISTENT' },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // verifyProperty
  // ---------------------------------------------------------------------------
  describe('verifyProperty', () => {
    it('should throw BadRequestException if contract not configured', async () => {
      const unconfiguredService = new PropertyRegistryService(
        { get: jest.fn(() => '') } as any,
        mockPropertyRegistryRepo as any,
        mockPropertyHistoryRepo as any,
        mockEventEmitter as any,
      );

      await expect(
        unconfiguredService.verifyProperty('PROP-001', 'GADMIN123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------------------
  // getProperty
  // ---------------------------------------------------------------------------
  describe('getProperty', () => {
    it('should throw BadRequestException if contract not configured', async () => {
      const unconfiguredService = new PropertyRegistryService(
        { get: jest.fn(() => '') } as any,
        mockPropertyRegistryRepo as any,
        mockPropertyHistoryRepo as any,
        mockEventEmitter as any,
      );

      await expect(unconfiguredService.getProperty('PROP-001')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getPropertyCount
  // ---------------------------------------------------------------------------
  describe('getPropertyCount', () => {
    it('should throw BadRequestException if contract not configured', async () => {
      const unconfiguredService = new PropertyRegistryService(
        { get: jest.fn(() => '') } as any,
        mockPropertyRegistryRepo as any,
        mockPropertyHistoryRepo as any,
        mockEventEmitter as any,
      );

      await expect(unconfiguredService.getPropertyCount()).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getPropertyHistory
  // ---------------------------------------------------------------------------
  describe('getPropertyHistory', () => {
    it('should return property history from the database', async () => {
      const historyRecords: Partial<PropertyHistory>[] = [
        {
          id: 1,
          propertyId: 'PROP-001',
          fromAddress: 'GFROM123',
          toAddress: 'GTO123',
          transactionHash: 'abc123',
        },
      ];
      mockPropertyHistoryRepo.find.mockResolvedValue(historyRecords);

      const result = await service.getPropertyHistory('PROP-001');

      expect(result).toEqual(historyRecords);
      expect(mockPropertyHistoryRepo.find).toHaveBeenCalledWith({
        where: { propertyId: 'PROP-001' },
        order: { transferredAt: 'DESC' },
      });
    });

    it('should return an empty array if no history exists', async () => {
      mockPropertyHistoryRepo.find.mockResolvedValue([]);

      const result = await service.getPropertyHistory('PROP-999');

      expect(result).toEqual([]);
    });
  });
});
