import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { KycService } from '../src/modules/kyc/kyc.service';
import { Kyc } from '../src/modules/kyc/kyc.entity';
import { KycStatus } from '../src/modules/kyc/kyc-status.enum';
import { EncryptionService } from '../src/modules/security/encryption.service';
import { UserKycStatusService } from '../src/modules/users/user-kyc-status.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { User } from '../src/modules/users/entities/user.entity';

describe('KYC Verification Integration', () => {
  let service: KycService;

  const mockKycRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockEncryptionService = {
    encrypt: jest.fn((data: string) => `enc:${data}`),
    decrypt: jest.fn((data: string) => data.replace('enc:', '')),
  };

  const mockUserKycStatusService = {
    setStatus: jest.fn().mockResolvedValue(undefined),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockNotificationsService = {
    notify: jest.fn().mockResolvedValue(undefined),
  };

  const userId = 'user-test-001';
  const kycData = {
    first_name: 'Jane',
    last_name: 'Doe',
    date_of_birth: '1990-06-15',
    address: '10 Main Street',
    city: 'Lagos',
    country: 'NG',
    id_number: 'NGA123456',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycService,
        { provide: getRepositoryToken(Kyc), useValue: mockKycRepository },
        {
          provide: getRepositoryToken(User),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        { provide: EncryptionService, useValue: mockEncryptionService },
        { provide: UserKycStatusService, useValue: mockUserKycStatusService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<KycService>(KycService);
    jest.clearAllMocks();
  });

  describe('Document upload and submission', () => {
    it('creates a KYC record with PENDING status on first submission', async () => {
      const savedRecord: Partial<Kyc> = {
        id: 'kyc-001',
        userId,
        status: KycStatus.PENDING,
        encryptedKycData: { data: 'enc:data' },
      };
      mockKycRepository.create.mockReturnValue(savedRecord);
      mockKycRepository.save.mockResolvedValue(savedRecord);

      const result = await service.submitKyc(userId, { kycData });

      expect(result.status).toBe(KycStatus.PENDING);
      expect(mockUserKycStatusService.setStatus).toHaveBeenCalledWith(
        userId,
        KycStatus.PENDING,
      );
    });

    it('sends a notification after successful submission', async () => {
      const record: Partial<Kyc> = {
        id: 'kyc-002',
        userId,
        status: KycStatus.PENDING,
        encryptedKycData: { data: 'enc:data' },
      };
      mockKycRepository.create.mockReturnValue(record);
      mockKycRepository.save.mockResolvedValue(record);

      await service.submitKyc(userId, { kycData });

      expect(mockNotificationsService.notify).toHaveBeenCalledWith(
        userId,
        expect.any(String),
        expect.any(String),
        'KYC_SUBMITTED',
      );
    });

    it('encrypts sensitive KYC fields before persisting', async () => {
      const record: Partial<Kyc> = {
        id: 'kyc-003',
        userId,
        status: KycStatus.PENDING,
        encryptedKycData: { data: 'enc:data' },
      };
      mockKycRepository.create.mockReturnValue(record);
      mockKycRepository.save.mockResolvedValue(record);

      await service.submitKyc(userId, { kycData });

      expect(mockEncryptionService.encrypt).toHaveBeenCalled();
    });
  });

  describe('Verification status tracking', () => {
    it('returns the KYC record with its current status', async () => {
      const record = {
        id: 'kyc-001',
        userId,
        status: KycStatus.APPROVED,
        encryptedKycData: null,
      };
      mockKycRepository.findOne.mockResolvedValue(record);

      const result = await service.getKycStatus(userId);

      expect(result?.status).toBe(KycStatus.APPROVED);
    });

    it('returns null when no KYC record exists for the user', async () => {
      mockKycRepository.findOne.mockResolvedValue(null);

      const result = await service.getKycStatus(userId);

      expect(result).toBeNull();
    });
  });

  describe('Webhook status transitions', () => {
    it('transitions status to APPROVED on approval webhook', async () => {
      const existingRecord: Partial<Kyc> = {
        id: 'kyc-001',
        userId,
        status: KycStatus.PENDING,
        providerReference: 'prov-ref-001',
      };
      mockKycRepository.findOne.mockResolvedValue(existingRecord);
      mockKycRepository.save.mockImplementation(async (entity) => entity);

      await service.handleWebhook({
        providerReference: 'prov-ref-001',
        status: KycStatus.APPROVED,
      });

      expect(mockKycRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: KycStatus.APPROVED }),
      );
    });

    it('transitions status to REJECTED on rejection webhook', async () => {
      const existingRecord: Partial<Kyc> = {
        id: 'kyc-001',
        userId,
        status: KycStatus.PENDING,
        providerReference: 'prov-ref-002',
      };
      mockKycRepository.findOne.mockResolvedValue(existingRecord);
      mockKycRepository.save.mockImplementation(async (entity) => entity);

      await service.handleWebhook({
        providerReference: 'prov-ref-002',
        status: KycStatus.REJECTED,
      });

      expect(mockKycRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: KycStatus.REJECTED }),
      );
    });

    it('transitions status to NEEDS_INFO when more info is required', async () => {
      const existingRecord: Partial<Kyc> = {
        id: 'kyc-001',
        userId,
        status: KycStatus.PENDING,
        providerReference: 'prov-ref-003',
      };
      mockKycRepository.findOne.mockResolvedValue(existingRecord);
      mockKycRepository.save.mockImplementation(async (entity) => entity);

      await service.handleWebhook({
        providerReference: 'prov-ref-003',
        status: KycStatus.NEEDS_INFO,
      });

      expect(mockKycRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: KycStatus.NEEDS_INFO }),
      );
    });

    it('does nothing when webhook references an unknown provider reference', async () => {
      mockKycRepository.findOne.mockResolvedValue(null);

      await service.handleWebhook({
        providerReference: 'unknown-ref',
        status: KycStatus.APPROVED,
      });

      expect(mockKycRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Compliance checks', () => {
    it('logs an audit entry on KYC submission', async () => {
      const record: Partial<Kyc> = {
        id: 'kyc-001',
        userId,
        status: KycStatus.PENDING,
        encryptedKycData: { data: 'enc:data' },
      };
      mockKycRepository.create.mockReturnValue(record);
      mockKycRepository.save.mockResolvedValue(record);

      await service.submitKyc(userId, { kycData });

      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('notifies the user when a webhook triggers an APPROVED transition', async () => {
      const existingRecord: Partial<Kyc> = {
        id: 'kyc-001',
        userId,
        status: KycStatus.PENDING,
        providerReference: 'prov-ref-004',
      };
      mockKycRepository.findOne.mockResolvedValue(existingRecord);
      mockKycRepository.save.mockImplementation(async (entity) => entity);

      await service.handleWebhook({
        providerReference: 'prov-ref-004',
        status: KycStatus.APPROVED,
      });

      expect(mockNotificationsService.notify).toHaveBeenCalledWith(
        userId,
        expect.any(String),
        expect.any(String),
        'KYC_APPROVED',
      );
    });
  });
});
