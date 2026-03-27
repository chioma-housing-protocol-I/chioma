import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KycService } from './kyc.service';
import { Kyc } from './kyc.entity';
import { KycStatus } from './kyc-status.enum';
import { EncryptionService } from '../security/encryption.service';
import { SubmitKycDto, KycWebhookDto } from './kyc.dto';
import { UserKycStatusService } from '../users/user-kyc-status.service';
import { AuditService } from '../audit/audit.service';

describe('KycService', () => {
  let service: KycService;
  let _kycRepository: Repository<Kyc>;
  let userKycStatusService: UserKycStatusService;
  let encryptionService: EncryptionService;

  const mockKycRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockUserKycStatusService = {
    setStatus: jest.fn(),
  };

  const mockEncryptionService = {
    encrypt: jest.fn((data: string) => `encrypted_${data}`),
    decrypt: jest.fn((data: string) => data.replace('encrypted_', '')),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockUserId = 'user-123';
  const mockKycData = {
    first_name: 'John',
    last_name: 'Doe',
    date_of_birth: '1990-01-01',
    address: '123 Main St',
    city: 'New York',
    state: 'NY',
    postal_code: '10001',
    country: 'US',
    id_number: 'ID123456',
    phone_number: '+1234567890',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycService,
        {
          provide: getRepositoryToken(Kyc),
          useValue: mockKycRepository,
        },
        {
          provide: UserKycStatusService,
          useValue: mockUserKycStatusService,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<KycService>(KycService);
    _kycRepository = module.get<Repository<Kyc>>(getRepositoryToken(Kyc));
    userKycStatusService =
      module.get<UserKycStatusService>(UserKycStatusService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitKyc', () => {
    it('should encrypt KYC data and save successfully', async () => {
      const submitDto: SubmitKycDto = {
        kycData: mockKycData,
      };

      const mockKyc: Kyc = {
        id: 'kyc-123',
        userId: mockUserId,
        encryptedKycData: {},
        encryptionVersion: 1,
        status: KycStatus.PENDING,
        providerReference: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockKycRepository.create.mockReturnValue(mockKyc);
      mockKycRepository.save.mockResolvedValue(mockKyc);
      mockUserKycStatusService.setStatus.mockResolvedValue(undefined);

      const result = await service.submitKyc(mockUserId, submitDto);

      expect(encryptionService.encrypt).toHaveBeenCalledTimes(10); // All sensitive fields
      expect(mockKycRepository.create).toHaveBeenCalled();
      expect(mockKycRepository.save).toHaveBeenCalled();
      expect(userKycStatusService.setStatus).toHaveBeenCalledWith(
        mockUserId,
        KycStatus.PENDING,
      );
      expect(result).toEqual(mockKyc);
    });

    it('should handle encryption errors gracefully', async () => {
      const submitDto: SubmitKycDto = {
        kycData: mockKycData,
      };

      mockEncryptionService.encrypt.mockImplementation(() => {
        throw new Error('Encryption failed');
      });

      await expect(service.submitKyc(mockUserId, submitDto)).rejects.toThrow(
        'Encryption failed',
      );
    });

    it('should only encrypt sensitive fields', async () => {
      const submitDto: SubmitKycDto = {
        kycData: {
          first_name: 'John',
          non_sensitive_field: 'public data',
        },
      };

      const mockKyc: Kyc = {
        id: 'kyc-123',
        userId: mockUserId,
        encryptedKycData: {},
        encryptionVersion: 1,
        status: KycStatus.PENDING,
        providerReference: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Reset the mock to default behavior
      mockEncryptionService.encrypt.mockImplementation(
        (data: string) => `encrypted_${data}`,
      );
      mockKycRepository.create.mockReturnValue(mockKyc);
      mockKycRepository.save.mockResolvedValue(mockKyc);

      await service.submitKyc(mockUserId, submitDto);

      // Only first_name should be encrypted
      expect(encryptionService.encrypt).toHaveBeenCalledWith('John');
      expect(encryptionService.encrypt).toHaveBeenCalledTimes(1);
    });
  });

  describe('getKycStatus', () => {
    it('should decrypt KYC data when retrieving', async () => {
      const encryptedKyc: Kyc = {
        id: 'kyc-123',
        userId: mockUserId,
        encryptedKycData: {
          first_name: 'encrypted_John',
          last_name: 'encrypted_Doe',
        },
        encryptionVersion: 1,
        status: KycStatus.APPROVED,
        providerReference: 'ref-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockKycRepository.findOne.mockResolvedValue(encryptedKyc);

      const result = await service.getKycStatus(mockUserId);

      expect(mockKycRepository.findOne).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
      expect(encryptionService.decrypt).toHaveBeenCalledWith('encrypted_John');
      expect(encryptionService.decrypt).toHaveBeenCalledWith('encrypted_Doe');
      expect(result?.encryptedKycData.first_name).toBe('John');
      expect(result?.encryptedKycData.last_name).toBe('Doe');
    });

    it('should return null if no KYC record exists', async () => {
      mockKycRepository.findOne.mockResolvedValue(null);

      const result = await service.getKycStatus(mockUserId);

      expect(result).toBeNull();
      expect(encryptionService.decrypt).not.toHaveBeenCalled();
    });

    it('should handle decryption errors gracefully', async () => {
      const encryptedKyc: Kyc = {
        id: 'kyc-123',
        userId: mockUserId,
        encryptedKycData: {
          first_name: 'corrupted_data',
        },
        encryptionVersion: 1,
        status: KycStatus.APPROVED,
        providerReference: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockKycRepository.findOne.mockResolvedValue(encryptedKyc);
      mockEncryptionService.decrypt.mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      // Should not throw, but keep encrypted value
      const result = await service.getKycStatus(mockUserId);

      expect(result).toBeDefined();
      expect(result?.encryptedKycData.first_name).toBe('corrupted_data');
    });
  });

  describe('handleWebhook', () => {
    it('should update KYC status from webhook', async () => {
      const webhookDto: KycWebhookDto = {
        providerReference: 'ref-123',
        status: KycStatus.APPROVED,
        reason: undefined,
      };

      const existingKyc: Kyc = {
        id: 'kyc-123',
        userId: mockUserId,
        encryptedKycData: {},
        encryptionVersion: 1,
        status: KycStatus.PENDING,
        providerReference: 'ref-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockKycRepository.findOne.mockResolvedValue(existingKyc);
      mockKycRepository.save.mockResolvedValue({
        ...existingKyc,
        status: KycStatus.APPROVED,
      });

      await service.handleWebhook(webhookDto);

      expect(mockKycRepository.findOne).toHaveBeenCalledWith({
        where: { providerReference: 'ref-123' },
      });
      expect(mockKycRepository.save).toHaveBeenCalled();
      expect(userKycStatusService.setStatus).toHaveBeenCalledWith(
        mockUserId,
        KycStatus.APPROVED,
      );
    });

    it('should handle webhook for non-existent KYC record', async () => {
      const webhookDto: KycWebhookDto = {
        providerReference: 'non-existent',
        status: KycStatus.APPROVED,
      };

      mockKycRepository.findOne.mockResolvedValue(null);

      await service.handleWebhook(webhookDto);

      expect(mockKycRepository.save).not.toHaveBeenCalled();
      expect(userKycStatusService.setStatus).not.toHaveBeenCalled();
    });
  });

  describe('encryption integration', () => {
    it('should encrypt and decrypt data symmetrically', async () => {
      // Use real encryption service for this test
      const realEncryptionService = new EncryptionService({
        get: () =>
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      } as any);

      const testModule = await Test.createTestingModule({
        providers: [
          KycService,
          {
            provide: getRepositoryToken(Kyc),
            useValue: mockKycRepository,
          },
          {
            provide: UserKycStatusService,
            useValue: mockUserKycStatusService,
          },
          {
            provide: EncryptionService,
            useValue: realEncryptionService,
          },
          {
            provide: AuditService,
            useValue: mockAuditService,
          },
        ],
      }).compile();

      const testService = testModule.get<KycService>(KycService);

      const submitDto: SubmitKycDto = {
        kycData: {
          first_name: 'Alice',
          last_name: 'Smith',
          id_number: 'ID987654',
        },
      };

      const mockKyc: Kyc = {
        id: 'kyc-456',
        userId: mockUserId,
        encryptedKycData: {},
        encryptionVersion: 1,
        status: KycStatus.PENDING,
        providerReference: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockKycRepository.create.mockImplementation((data) => ({
        ...mockKyc,
        encryptedKycData: data.encryptedKycData,
      }));
      mockKycRepository.save.mockImplementation((kyc) => Promise.resolve(kyc));
      mockKycRepository.findOne.mockImplementation(() =>
        Promise.resolve(mockKycRepository.save.mock.results[0]?.value),
      );

      // Submit with encryption
      await testService.submitKyc(mockUserId, submitDto);

      // Retrieve with decryption
      const retrieved = await testService.getKycStatus(mockUserId);

      expect(retrieved?.encryptedKycData.first_name).toBe('Alice');
      expect(retrieved?.encryptedKycData.last_name).toBe('Smith');
      expect(retrieved?.encryptedKycData.id_number).toBe('ID987654');
    });
  });
});
