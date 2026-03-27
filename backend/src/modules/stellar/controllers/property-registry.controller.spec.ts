import { Test } from '@nestjs/testing';
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
    const module = await Test.createTestingModule({
      controllers: [PropertyRegistryController],
      providers: [
        {
          provide: PropertyRegistryService,
          useValue: mockPropertyRegistryService,
        },
      ],
    }).compile();

    // Use (module as any) to bypass the strict TypeScript compiler error
    controller = (module as any).get(PropertyRegistryController);
    service = (module as any).get(PropertyRegistryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('registerProperty', () => {
    it('should register a property and return transaction hash', async () => {
      const dto = {
        propertyId: 'prop-1',
        ownerAddress: 'address1',
        metadataHash: 'hash1',
      };
      const signerKey = 'signer-key';
      mockPropertyRegistryService.registerProperty.mockResolvedValue(
        'tx-hash-123',
      );

      const result = await controller.registerProperty(dto, signerKey);

      expect(service.registerProperty).toHaveBeenCalledWith(dto, signerKey);
      expect(result).toEqual({ success: true, transactionHash: 'tx-hash-123' });
    });
  });

  describe('transferProperty', () => {
    it('should transfer a property and return transaction hash', async () => {
      const dto = {
        propertyId: 'prop-1',
        fromAddress: 'address1',
        toAddress: 'address2',
      };
      mockPropertyRegistryService.transferProperty.mockResolvedValue(
        'tx-hash-456',
      );

      const result = await controller.transferProperty(dto);

      expect(service.transferProperty).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ success: true, transactionHash: 'tx-hash-456' });
    });
  });

  describe('verifyProperty', () => {
    it('should verify a property and return transaction hash', async () => {
      const dto = { propertyId: 'prop-1', verifierAddress: 'admin-address' };
      mockPropertyRegistryService.verifyProperty.mockResolvedValue(
        'tx-hash-789',
      );

      const result = await controller.verifyProperty(dto);

      expect(service.verifyProperty).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ success: true, transactionHash: 'tx-hash-789' });
    });
  });

  describe('getProperty', () => {
    it('should return property data', async () => {
      const mockData = { propertyId: 'prop-1', ownerAddress: 'address1' };
      mockPropertyRegistryService.getProperty.mockResolvedValue(mockData);

      const result = await controller.getProperty('prop-1');

      expect(service.getProperty).toHaveBeenCalledWith('prop-1');
      expect(result).toEqual({ success: true, data: mockData });
    });
  });

  describe('getPropertyCount', () => {
    it('should return property count', async () => {
      mockPropertyRegistryService.getPropertyCount.mockResolvedValue(5);

      const result = await controller.getPropertyCount();

      expect(service.getPropertyCount).toHaveBeenCalled();
      expect(result).toEqual({ success: true, count: 5 });
    });
  });

  describe('getPropertyHistory', () => {
    it('should return property history', async () => {
      const mockHistory = [
        { transactionHash: 'hash-1' },
        { transactionHash: 'hash-2' },
      ];
      mockPropertyRegistryService.getPropertyHistory.mockResolvedValue(
        mockHistory,
      );

      const result = await controller.getPropertyHistory('prop-1');

      expect(service.getPropertyHistory).toHaveBeenCalledWith('prop-1');
      expect(result).toEqual({ success: true, data: mockHistory });
    });
  });
});
