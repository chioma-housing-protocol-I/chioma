import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ScreeningService } from './screening.service';
import { TenantScreeningRequest } from './entities/tenant-screening-request.entity';
import { TenantScreeningConsent } from './entities/tenant-screening-consent.entity';
import { TenantScreeningReport } from './entities/tenant-screening-report.entity';
import { EncryptionService } from '../security/encryption.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import {
  ScreeningCheckType,
  TenantScreeningProvider,
  TenantScreeningStatus,
} from './screening.enums';
import { UserRole } from '../users/entities/user.entity';

describe('ScreeningService', () => {
  let service: ScreeningService;
  const mockScreeningRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };
  const mockConsentRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };
  const mockReportRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };
  const mockEncryptionService = {
    encrypt: jest.fn((value: string) => `enc:${value}`),
    decrypt: jest.fn((value: string) => value.replace(/^enc:/, '')),
  };
  const mockNotificationsService = {
    notify: jest.fn().mockResolvedValue(undefined),
  };
  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };
  const mockWebhooksService = {
    dispatchEvent: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreeningService,
        {
          provide: getRepositoryToken(TenantScreeningRequest),
          useValue: mockScreeningRepository,
        },
        {
          provide: getRepositoryToken(TenantScreeningConsent),
          useValue: mockConsentRepository,
        },
        {
          provide: getRepositoryToken(TenantScreeningReport),
          useValue: mockReportRepository,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                TENANT_SCREENING_SANDBOX_MODE: 'true',
                TENANT_SCREENING_DEFAULT_PROVIDER:
                  TenantScreeningProvider.TRANSUNION_SMARTMOVE,
                TENANT_SCREENING_CONSENT_TTL_DAYS: '30',
                TENANT_SCREENING_REPORT_TTL_DAYS: '30',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        { provide: EncryptionService, useValue: mockEncryptionService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: WebhooksService, useValue: mockWebhooksService },
      ],
    }).compile();

    service = module.get(ScreeningService);
    jest.clearAllMocks();
  });

  it('creates screening requests in pending consent state', async () => {
    const created = {
      id: 'screening-1',
      status: TenantScreeningStatus.PENDING_CONSENT,
    };
    mockScreeningRepository.create.mockReturnValue(created);
    mockScreeningRepository.save.mockResolvedValue(created);

    const result = await service.createRequest(
      {
        id: 'landlord-1',
        role: UserRole.LANDLORD,
      },
      {
        tenantId: 'tenant-1',
        requestedChecks: [ScreeningCheckType.CREDIT],
        applicantData: { legalName: 'Jane Tenant' },
        consentVersion: 'v1',
      },
    );

    expect(mockScreeningRepository.create).toHaveBeenCalled();
    expect(mockEncryptionService.encrypt).toHaveBeenCalled();
    expect(result).toEqual(created);
  });

  it('grants consent and completes sandbox submission', async () => {
    const screening = {
      id: 'screening-1',
      tenantId: 'tenant-1',
      requestedByUserId: 'landlord-1',
      provider: TenantScreeningProvider.TRANSUNION_SMARTMOVE,
      requestedChecks: [
        ScreeningCheckType.CREDIT,
        ScreeningCheckType.RENTAL_HISTORY,
      ],
      status: TenantScreeningStatus.PENDING_CONSENT,
      consentExpiresAt: new Date('2026-04-30T00:00:00.000Z'),
      encryptedApplicantData:
        'enc:{"legalName":"Jane Tenant","email":"jane@example.com"}',
    } as TenantScreeningRequest;

    mockScreeningRepository.findOne.mockResolvedValue(screening);
    mockConsentRepository.create.mockImplementation((value) => value);
    mockConsentRepository.save.mockResolvedValue(undefined);
    mockScreeningRepository.save.mockImplementation(async (value) => value);
    mockReportRepository.findOne.mockResolvedValue(null);
    mockReportRepository.create.mockImplementation((value) => value);
    mockReportRepository.save.mockResolvedValue(undefined);

    const result = await service.grantConsent(
      'screening-1',
      {
        id: 'tenant-1',
        role: UserRole.TENANT,
      },
      {
        consentTextVersion: 'v1',
      },
    );

    expect(result.status).toBe(TenantScreeningStatus.COMPLETED);
    expect(mockReportRepository.save).toHaveBeenCalled();
    expect(mockNotificationsService.notify).toHaveBeenCalledTimes(2);
    expect(mockWebhooksService.dispatchEvent).toHaveBeenCalledWith(
      'screening.completed',
      expect.objectContaining({ screeningId: 'screening-1' }),
    );
  });
});
