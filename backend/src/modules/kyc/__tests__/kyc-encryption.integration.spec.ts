import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { KycService } from '../kyc.service';
import { Kyc } from '../kyc.entity';
import { KycStatus } from '../kyc-status.enum';
import { EncryptionService } from '../../security/encryption.service';
import { SubmitKycDto } from '../kyc.dto';
import { UserKycStatusService } from '../../users/user-kyc-status.service';
import { AuditService } from '../../audit/audit.service';

/**
 * Integration tests for KYC encryption with the KYC service
 * Optimized for speed
 */
describe('KYC Encryption - Integration Tests', () => {
  let kycService: KycService;
  let encryptionService: EncryptionService;
  let kycRepository: Repository<Kyc>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'SECURITY_ENCRYPTION_KEY') {
        return 'b'.repeat(64);
      }
      return undefined;
    }),
  };

  const mockKycRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockUserKycStatusService = {
    setStatus: jest.fn().mockResolvedValue(undefined),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycService,
        EncryptionService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(Kyc), useValue: mockKycRepository },
        {
          provide: UserKycStatusService,
          useValue: mockUserKycStatusService,
        },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    kycService = module.get<KycService>(KycService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
    kycRepository = module.get<Repository<Kyc>>(getRepositoryToken(Kyc));

    jest.clearAllMocks();
  });

  describe('KYC Service Integration', () => {
    it('should submit KYC data', async () => {
      const userId = 'user-123';
      const kycData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      };
      const dto: SubmitKycDto = { kycData };

      const mockKycEntity = {
        id: 'kyc-123',
        userId,
        encryptedKycData: kycData,
        status: KycStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockKycRepository.create.mockReturnValue(mockKycEntity);
      mockKycRepository.save.mockResolvedValue(mockKycEntity);

      const result = await kycService.submitKyc(userId, dto);

      expect(mockKycRepository.create).toHaveBeenCalled();
      expect(mockKycRepository.save).toHaveBeenCalled();
      expect(mockUserKycStatusService.setStatus).toHaveBeenCalledWith(
        userId,
        KycStatus.PENDING,
      );
      expect(result).toBeDefined();
    });

    it('should get KYC status', async () => {
      const userId = 'user-123';
      const mockKycEntity = {
        id: 'kyc-123',
        userId,
        encryptedKycData: { first_name: 'John' },
        status: KycStatus.APPROVED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockKycRepository.findOne.mockResolvedValue(mockKycEntity);

      const result = await kycService.getKycStatus(userId);

      expect(mockKycRepository.findOne).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(result).toEqual(mockKycEntity);
    });

    it('should return null if KYC not found', async () => {
      const userId = 'non-existent-user';

      mockKycRepository.findOne.mockResolvedValue(null);

      const result = await kycService.getKycStatus(userId);

      expect(result).toBeNull();
    });

    it('should handle webhook status updates', async () => {
      const providerReference = 'provider-ref-123';
      const mockKycEntity = {
        id: 'kyc-123',
        userId: 'user-123',
        status: KycStatus.PENDING,
        providerReference,
        encryptedKycData: {},
      };

      mockKycRepository.findOne.mockResolvedValue(mockKycEntity);
      mockKycRepository.save.mockResolvedValue({
        ...mockKycEntity,
        status: KycStatus.APPROVED,
      });

      await kycService.handleWebhook({
        providerReference,
        status: KycStatus.APPROVED,
      });

      expect(mockKycRepository.findOne).toHaveBeenCalledWith({
        where: { providerReference },
      });
      expect(mockKycRepository.save).toHaveBeenCalled();
      expect(mockUserKycStatusService.setStatus).toHaveBeenCalledWith(
        'user-123',
        KycStatus.APPROVED,
      );
    });

    it('should ignore webhook for non-existent KYC', async () => {
      const providerReference = 'non-existent-ref';

      mockKycRepository.findOne.mockResolvedValue(null);

      await kycService.handleWebhook({
        providerReference,
        status: KycStatus.APPROVED,
      });

      expect(mockKycRepository.save).not.toHaveBeenCalled();
      expect(mockUserKycStatusService.setStatus).not.toHaveBeenCalled();
    });
  });

  describe('Encryption Service Integration', () => {
    it('should encrypt and decrypt KYC data consistently', () => {
      const kycData = JSON.stringify({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      });

      const encrypted = encryptionService.encrypt(kycData);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(kycData);
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(kycData));
    });

    it('should produce deterministic hashes for KYC fields', () => {
      const email = 'user@example.com';
      const hash1 = encryptionService.hash(email);
      const hash2 = encryptionService.hash(email);

      expect(hash1).toBe(hash2);
    });
  });

  describe('Data Integrity', () => {
    it('should preserve data structure after encryption/decryption', () => {
      const originalData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '+1-555-123-4567',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
        },
      };

      const encrypted = encryptionService.encrypt(JSON.stringify(originalData));
      const decrypted = JSON.parse(encryptionService.decrypt(encrypted));

      expect(decrypted).toEqual(originalData);
      expect(decrypted.address.city).toBe('New York');
      expect(decrypted.phone).toBe('+1-555-123-4567');
    });

    it('should handle null and undefined values', () => {
      const kycData = {
        first_name: 'John',
        middle_name: null,
        suffix: undefined,
        email: 'john@example.com',
      };

      const encrypted = encryptionService.encrypt(JSON.stringify(kycData));
      const decrypted = JSON.parse(encryptionService.decrypt(encrypted));

      expect(decrypted.first_name).toBe('John');
      expect(decrypted.middle_name).toBeNull();
      expect(decrypted.suffix).toBeUndefined();
    });

    it('should preserve numeric and boolean values', () => {
      const kycData = {
        first_name: 'John',
        age: 30,
        income: 75000.5,
        is_verified: true,
        is_pep: false,
      };

      const encrypted = encryptionService.encrypt(JSON.stringify(kycData));
      const decrypted = JSON.parse(encryptionService.decrypt(encrypted));

      expect(decrypted.age).toBe(30);
      expect(decrypted.income).toBe(75000.5);
      expect(decrypted.is_verified).toBe(true);
      expect(decrypted.is_pep).toBe(false);
    });
  });

  describe('KYC Status Transitions', () => {
    it('should handle APPROVED status', async () => {
      const providerReference = 'provider-ref-approved';
      const mockKycEntity = {
        id: 'kyc-approved',
        userId: 'user-approved',
        status: KycStatus.PENDING,
        providerReference,
        encryptedKycData: {},
      };

      mockKycRepository.findOne.mockResolvedValue(mockKycEntity);
      mockKycRepository.save.mockResolvedValue({
        ...mockKycEntity,
        status: KycStatus.APPROVED,
      });

      await kycService.handleWebhook({
        providerReference,
        status: KycStatus.APPROVED,
      });

      expect(mockUserKycStatusService.setStatus).toHaveBeenCalledWith(
        'user-approved',
        KycStatus.APPROVED,
      );
    });

    it('should handle REJECTED status', async () => {
      const providerReference = 'provider-ref-rejected';
      const mockKycEntity = {
        id: 'kyc-rejected',
        userId: 'user-rejected',
        status: KycStatus.PENDING,
        providerReference,
        encryptedKycData: {},
      };

      mockKycRepository.findOne.mockResolvedValue(mockKycEntity);
      mockKycRepository.save.mockResolvedValue({
        ...mockKycEntity,
        status: KycStatus.REJECTED,
      });

      await kycService.handleWebhook({
        providerReference,
        status: KycStatus.REJECTED,
        reason: 'Document verification failed',
      });

      expect(mockUserKycStatusService.setStatus).toHaveBeenCalledWith(
        'user-rejected',
        KycStatus.REJECTED,
      );
    });

    it('should handle NEEDS_INFO status', async () => {
      const providerReference = 'provider-ref-needs-info';
      const mockKycEntity = {
        id: 'kyc-needs-info',
        userId: 'user-needs-info',
        status: KycStatus.PENDING,
        providerReference,
        encryptedKycData: {},
      };

      mockKycRepository.findOne.mockResolvedValue(mockKycEntity);
      mockKycRepository.save.mockResolvedValue({
        ...mockKycEntity,
        status: KycStatus.NEEDS_INFO,
      });

      await kycService.handleWebhook({
        providerReference,
        status: KycStatus.NEEDS_INFO,
        reason: 'Please provide additional documents',
      });

      expect(mockUserKycStatusService.setStatus).toHaveBeenCalledWith(
        'user-needs-info',
        KycStatus.NEEDS_INFO,
      );
    });
  });
});
