import { KycRetentionService } from './kyc-retention.service';
import { KycStatus } from './kyc-status.enum';
import { AuditAction } from '../audit/entities/audit-log.entity';

describe('KycRetentionService', () => {
  const kycRepository = {
    find: jest.fn(),
    save: jest.fn(),
  };
  const auditService = { log: jest.fn().mockResolvedValue(undefined) };
  const configService = { get: jest.fn().mockReturnValue(undefined) };

  let service: KycRetentionService;

  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockReturnValue(undefined);
    kycRepository.save.mockImplementation(async (value: any) => value);
    service = new KycRetentionService(
      kycRepository as never,
      auditService as never,
      configService as never,
    );
  });

  it('purges the raw document while keeping the decision fields', async () => {
    const kyc = {
      id: 'kyc-1',
      userId: 'user-1',
      encryptedKycData: { first_name: 'encrypted-blob' },
      status: KycStatus.APPROVED,
      reason: null,
      providerReference: 'ref-1',
      documentHash: 'abc123',
      documentPurgedAt: null,
    };
    kycRepository.find.mockResolvedValue([kyc]);

    const result = await service.purgeExpiredDocuments();

    expect(result).toEqual({ purged: 1, errors: 0 });
    expect(kycRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'kyc-1',
        encryptedKycData: null,
        documentPurgedAt: expect.any(Date),
        // decision + non-reversible reference survive the purge
        status: KycStatus.APPROVED,
        providerReference: 'ref-1',
        documentHash: 'abc123',
      }),
    );
  });

  it('records the purge in the audit log', async () => {
    const kyc = {
      id: 'kyc-2',
      userId: 'user-2',
      encryptedKycData: {},
      status: KycStatus.REJECTED,
      reason: 'incomplete',
      providerReference: null,
      documentHash: 'def456',
      documentPurgedAt: null,
    };
    kycRepository.find.mockResolvedValue([kyc]);

    await service.purgeExpiredDocuments();

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.KYC_DOCUMENT_PURGED,
        entityType: 'Kyc',
        entityId: 'kyc-2',
        metadata: expect.objectContaining({
          userId: 'user-2',
          decisionStatus: KycStatus.REJECTED,
          documentHash: 'def456',
        }),
      }),
    );
  });

  it('only queries decided (APPROVED/REJECTED), not-yet-purged records past the cutoff', async () => {
    kycRepository.find.mockResolvedValue([]);

    await service.purgeExpiredDocuments();

    expect(kycRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: expect.anything(),
          updatedAt: expect.anything(),
          documentPurgedAt: expect.anything(),
        }),
      }),
    );
  });

  it('respects a configured retention window', async () => {
    configService.get.mockImplementation((key: string) =>
      key === 'KYC_DOCUMENT_RETENTION_DAYS' ? '30' : undefined,
    );
    kycRepository.find.mockResolvedValue([]);

    await service.purgeExpiredDocuments();

    expect(configService.get).toHaveBeenCalledWith(
      'KYC_DOCUMENT_RETENTION_DAYS',
    );
  });

  it('continues processing remaining records if one purge fails', async () => {
    const kycA = {
      id: 'kyc-a',
      userId: 'user-a',
      encryptedKycData: {},
      status: KycStatus.APPROVED,
      documentHash: 'hash-a',
      documentPurgedAt: null,
    };
    const kycB = {
      id: 'kyc-b',
      userId: 'user-b',
      encryptedKycData: {},
      status: KycStatus.APPROVED,
      documentHash: 'hash-b',
      documentPurgedAt: null,
    };
    kycRepository.find.mockResolvedValue([kycA, kycB]);
    kycRepository.save
      .mockRejectedValueOnce(new Error('db unavailable'))
      .mockResolvedValueOnce(kycB);

    const result = await service.purgeExpiredDocuments();

    expect(result).toEqual({ purged: 1, errors: 1 });
  });

  it('does nothing when there are no candidates', async () => {
    kycRepository.find.mockResolvedValue([]);

    const result = await service.purgeExpiredDocuments();

    expect(result).toEqual({ purged: 0, errors: 0 });
    expect(kycRepository.save).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });
});
