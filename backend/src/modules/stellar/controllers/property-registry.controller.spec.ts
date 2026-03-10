import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PropertyRegistryController } from './property-registry.controller';
import { PropertyRegistryService } from '../services/property-registry.service';

describe('PropertyRegistryController', () => {
  let controller: PropertyRegistryController;
  let service: PropertyRegistryService;

  const mockPropertyRegistryService = {
    registerProperty: jest.fn(),
    transferProperty: jest.fn(),
    verifyProperty: jest.fn(),
    getProperty: jest.fn(),
    getPropertyCount: jest.fn(),
    getPropertyHistory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PropertyRegistryController],
      providers: [
        {
          provide: PropertyRegistryService,
          useValue: mockPropertyRegistryService,
        },
      ],
    }).compile();

    controller = module.get<PropertyRegistryController>(
      PropertyRegistryController,
    );
    service = module.get<PropertyRegistryService>(PropertyRegistryService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // registerProperty
  // ---------------------------------------------------------------------------
  describe('registerProperty', () => {
    it('should register a property and return txHash', async () => {
      const dto = {
        propertyId: 'PROP-001',
        ownerAddress: 'GOWNER123',
        metadataHash: 'Qm1234567',
      };
      mockPropertyRegistryService.registerProperty.mockResolvedValue('txhash1');

      const result = await controller.registerProperty(dto);

      expect(result).toEqual({
        txHash: 'txhash1',
        message: 'Property registered on-chain',
      });
      expect(service.registerProperty).toHaveBeenCalledWith(
        dto.propertyId,
        dto.ownerAddress,
        dto.metadataHash,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // transferProperty
  // ---------------------------------------------------------------------------
  describe('transferProperty', () => {
    it('should transfer property ownership and return txHash', async () => {
      const dto = {
        propertyId: 'PROP-001',
        fromAddress: 'GFROM123',
        toAddress: 'GTO123',
      };
      mockPropertyRegistryService.transferProperty.mockResolvedValue('txhash2');

      const result = await controller.transferProperty(dto);

      expect(result).toEqual({
        txHash: 'txhash2',
        message: 'Property ownership transferred on-chain',
      });
      expect(service.transferProperty).toHaveBeenCalledWith(
        dto.propertyId,
        dto.fromAddress,
        dto.toAddress,
      );
    });

    it('should propagate NotFoundException if property not found', async () => {
      mockPropertyRegistryService.transferProperty.mockRejectedValue(
        new NotFoundException('Property not found: PROP-999'),
      );

      await expect(
        controller.transferProperty({
          propertyId: 'PROP-999',
          fromAddress: 'GFROM123',
          toAddress: 'GTO123',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // verifyProperty
  // ---------------------------------------------------------------------------
  describe('verifyProperty', () => {
    it('should verify property and return txHash', async () => {
      const dto = {
        propertyId: 'PROP-001',
        verifierAddress: 'GADMIN123',
      };
      mockPropertyRegistryService.verifyProperty.mockResolvedValue('txhash3');

      const result = await controller.verifyProperty(dto);

      expect(result).toEqual({
        txHash: 'txhash3',
        message: 'Property verified on-chain',
      });
      expect(service.verifyProperty).toHaveBeenCalledWith(
        dto.propertyId,
        dto.verifierAddress,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getPropertyCount
  // ---------------------------------------------------------------------------
  describe('getPropertyCount', () => {
    it('should return total property count', async () => {
      mockPropertyRegistryService.getPropertyCount.mockResolvedValue(10);

      const result = await controller.getPropertyCount();

      expect(result).toEqual({ count: 10 });
      expect(service.getPropertyCount).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // getProperty
  // ---------------------------------------------------------------------------
  describe('getProperty', () => {
    it('should return property info when found', async () => {
      const propertyInfo = {
        propertyId: 'PROP-001',
        ownerAddress: 'GOWNER123',
        metadataHash: 'Qm1234567',
        verified: true,
        registeredAt: 1234567890,
        verifiedAt: 1234567900,
      };
      mockPropertyRegistryService.getProperty.mockResolvedValue(propertyInfo);

      const result = await controller.getProperty('PROP-001');

      expect(result).toEqual(propertyInfo);
      expect(service.getProperty).toHaveBeenCalledWith('PROP-001');
    });

    it('should return message if property not found', async () => {
      mockPropertyRegistryService.getProperty.mockResolvedValue(null);

      const result = await controller.getProperty('PROP-999');

      expect(result).toEqual({ message: 'Property not found' });
    });
  });

  // ---------------------------------------------------------------------------
  // getPropertyHistory
  // ---------------------------------------------------------------------------
  describe('getPropertyHistory', () => {
    it('should return property transfer history', async () => {
      const history = [
        {
          id: 1,
          propertyId: 'PROP-001',
          fromAddress: 'GFROM123',
          toAddress: 'GTO123',
          transactionHash: 'abc123',
          transferredAt: new Date('2025-01-01'),
        },
      ];
      mockPropertyRegistryService.getPropertyHistory.mockResolvedValue(history);

      const result = await controller.getPropertyHistory('PROP-001');

      expect(result).toEqual({ propertyId: 'PROP-001', history });
      expect(service.getPropertyHistory).toHaveBeenCalledWith('PROP-001');
    });

    it('should return empty history array if no transfers exist', async () => {
      mockPropertyRegistryService.getPropertyHistory.mockResolvedValue([]);

      const result = await controller.getPropertyHistory('PROP-001');

      expect(result).toEqual({ propertyId: 'PROP-001', history: [] });
    });
  });
});
