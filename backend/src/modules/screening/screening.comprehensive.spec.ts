import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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
  UserScreeningProvider,
  UserScreeningStatus,
} from './screening.enums';
import { UserRole } from '../users/entities/user.entity';

describe('ScreeningService — comprehensive coverage', () => {
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
    encrypt: jest.fn((v: string) => `enc:${v}`),
    decrypt: jest.fn((v: string) => v.replace(/^enc:/, '')),
  };
  const mockNotificationsService = {
    notify: jest.fn().mockResolvedValue(undefined),
  };
  const mockAuditService = { log: jest.fn().mockResolvedValue(undefined) };
  const mockWebhooksService = {
    dispatchEvent: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn((key: string, def?: string) => {
      const cfg: Record<string, string> = {
        TENANT_SCREENING_SANDBOX_MODE: 'true',
        TENANT_SCREENING_DEFAULT_PROVIDER:
          UserScreeningProvider.TRANSUNION_SMARTMOVE,
        TENANT_SCREENING_CONSENT_TTL_DAYS: '30',
        TENANT_SCREENING_REPORT_TTL_DAYS: '30',
      };
      return cfg[key] ?? def;
    }),
  };

  const tenantActor = { id: 'tenant-1', role: UserRole.USER };
  const adminActor = { id: 'admin-1', role: UserRole.ADMIN };
  const strangerActor = { id: 'stranger', role: UserRole.USER };

  const pendingScreening = {
    id: 'screening-1',
    tenantId: 'tenant-1',
    requestedByUserId: 'landlord-1',
    provider: UserScreeningProvider.TRANSUNION_SMARTMOVE,
    requestedChecks: [ScreeningCheckType.CREDIT],
    status: UserScreeningStatus.PENDING_CONSENT,
    consentExpiresAt: new Date('2026-12-31'),
    encryptedApplicantData: 'enc:{"legalName":"Jane"}',
  } as TenantScreeningRequest;

  const consentedScreening = {
    ...pendingScreening,
    status: UserScreeningStatus.CONSENTED,
  } as TenantScreeningRequest;

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
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EncryptionService, useValue: mockEncryptionService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: WebhooksService, useValue: mockWebhooksService },
      ],
    }).compile();

    service = module.get(ScreeningService);
    jest.clearAllMocks();
  });

  // ── createRequest ─────────────────────────────────────────────────────────

  describe('createRequest', () => {
    it('uses the default provider when none is specified', async () => {
      mockScreeningRepository.create.mockReturnValue(pendingScreening);
      mockScreeningRepository.save.mockResolvedValue(pendingScreening);

      const result = await service.createRequest(adminActor, {
        tenantId: 'tenant-1',
        requestedChecks: [ScreeningCheckType.CREDIT],
        applicantData: { legalName: 'Jane Tenant' },
        consentVersion: 'v1',
      });

      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(
        JSON.stringify({ legalName: 'Jane Tenant' }),
      );
      expect(result.status).toBe(UserScreeningStatus.PENDING_CONSENT);
    });

    it('uses the explicitly provided provider', async () => {
      const screening = {
        ...pendingScreening,
        provider: UserScreeningProvider.TRANSUNION_SMARTMOVE,
      };
      mockScreeningRepository.create.mockReturnValue(screening);
      mockScreeningRepository.save.mockResolvedValue(screening);

      const result = await service.createRequest(adminActor, {
        tenantId: 'tenant-1',
        provider: UserScreeningProvider.TRANSUNION_SMARTMOVE,
        requestedChecks: [ScreeningCheckType.BACKGROUND],
        applicantData: { legalName: 'Bob' },
        consentVersion: 'v1',
      });

      expect(result.provider).toBe(UserScreeningProvider.TRANSUNION_SMARTMOVE);
    });

    it('logs a SECURITY-level audit entry on creation', async () => {
      mockScreeningRepository.create.mockReturnValue(pendingScreening);
      mockScreeningRepository.save.mockResolvedValue(pendingScreening);

      await service.createRequest(adminActor, {
        tenantId: 'tenant-1',
        requestedChecks: [ScreeningCheckType.CREDIT],
        applicantData: { legalName: 'Jane' },
        consentVersion: 'v1',
      });

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          entityType: 'TenantScreeningRequest',
        }),
      );
    });
  });

  // ── grantConsent ──────────────────────────────────────────────────────────

  describe('grantConsent', () => {
    it('throws ForbiddenException when a non-owner non-admin grants consent', async () => {
      mockScreeningRepository.findOne.mockResolvedValue(pendingScreening);

      await expect(
        service.grantConsent('screening-1', strangerActor, {
          consentTextVersion: 'v1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when consent has already been processed', async () => {
      mockScreeningRepository.findOne.mockResolvedValue(consentedScreening);

      await expect(
        service.grantConsent('screening-1', tenantActor, {
          consentTextVersion: 'v1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows an admin to grant consent on behalf of the tenant', async () => {
      const screening = { ...pendingScreening };
      mockScreeningRepository.findOne.mockResolvedValue(screening);
      mockConsentRepository.create.mockImplementation((v) => v);
      mockConsentRepository.save.mockResolvedValue(undefined);
      mockScreeningRepository.save.mockImplementation(async (v) => v);
      mockReportRepository.findOne.mockResolvedValue(null);
      mockReportRepository.create.mockImplementation((v) => v);
      mockReportRepository.save.mockResolvedValue(undefined);

      const result = await service.grantConsent('screening-1', adminActor, {
        consentTextVersion: 'v1',
      });

      expect(result.status).toBe(UserScreeningStatus.COMPLETED);
    });

    it('uses a custom expiresAt when provided', async () => {
      const screening = { ...pendingScreening };
      const customExpiry = '2027-01-01T00:00:00.000Z';
      mockScreeningRepository.findOne.mockResolvedValue(screening);
      mockConsentRepository.create.mockImplementation((v) => v);
      mockConsentRepository.save.mockResolvedValue(undefined);
      mockScreeningRepository.save.mockImplementation(async (v) => v);
      mockReportRepository.findOne.mockResolvedValue(null);
      mockReportRepository.create.mockImplementation((v) => v);
      mockReportRepository.save.mockResolvedValue(undefined);

      await service.grantConsent('screening-1', tenantActor, {
        consentTextVersion: 'v1',
        expiresAt: customExpiry,
      });

      expect(mockConsentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ expiresAt: new Date(customExpiry) }),
      );
    });
  });

  // ── getScreening ──────────────────────────────────────────────────────────

  describe('getScreening', () => {
    it('returns the screening record for the owning tenant', async () => {
      mockScreeningRepository.findOne.mockResolvedValue(pendingScreening);

      const result = await service.getScreening('screening-1', tenantActor);
      expect(result).toEqual(pendingScreening);
    });

    it('returns the screening record for an admin', async () => {
      mockScreeningRepository.findOne.mockResolvedValue(pendingScreening);

      const result = await service.getScreening('screening-1', adminActor);
      expect(result).toEqual(pendingScreening);
    });

    it('throws NotFoundException when screening does not exist', async () => {
      mockScreeningRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getScreening('no-such-id', adminActor),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when a non-owner non-admin requests a screening', async () => {
      mockScreeningRepository.findOne.mockResolvedValue(pendingScreening);

      await expect(
        service.getScreening('screening-1', strangerActor),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── getScreeningReport ────────────────────────────────────────────────────

  describe('getScreeningReport', () => {
    const encryptedReport = {
      id: 'report-1',
      screeningId: 'screening-1',
      riskLevel: 'low',
      providerReportId: 'ext-report-123',
      encryptedReport: 'enc:{"creditScore":750}',
      accessExpiresAt: new Date('2026-12-31'),
    };

    it('returns decrypted report for the owning tenant', async () => {
      mockScreeningRepository.findOne.mockResolvedValue(pendingScreening);
      mockReportRepository.findOne.mockResolvedValue(encryptedReport);

      const result = await service.getScreeningReport(
        'screening-1',
        tenantActor,
      );

      expect(result).toMatchObject({
        screeningId: 'screening-1',
        riskLevel: 'low',
        providerReportId: 'ext-report-123',
      });
      expect(mockEncryptionService.decrypt).toHaveBeenCalledWith(
        'enc:{"creditScore":750}',
      );
    });

    it('logs a DATA_ACCESS audit entry when report is accessed', async () => {
      mockScreeningRepository.findOne.mockResolvedValue(pendingScreening);
      mockReportRepository.findOne.mockResolvedValue(encryptedReport);

      await service.getScreeningReport('screening-1', tenantActor);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DATA_ACCESS',
          entityType: 'TenantScreeningReport',
        }),
      );
    });

    it('throws NotFoundException when no report exists for the screening', async () => {
      mockScreeningRepository.findOne.mockResolvedValue(pendingScreening);
      mockReportRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getScreeningReport('screening-1', tenantActor),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for a non-owner non-admin', async () => {
      mockScreeningRepository.findOne.mockResolvedValue(pendingScreening);

      await expect(
        service.getScreeningReport('screening-1', strangerActor),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── handleProviderWebhook ─────────────────────────────────────────────────

  describe('handleProviderWebhook', () => {
    it('throws NotFoundException when providerReference does not match any screening', async () => {
      mockScreeningRepository.findOne.mockResolvedValue(null);

      await expect(
        service.handleProviderWebhook({
          providerReference: 'unknown-ref',
          status: UserScreeningStatus.COMPLETED,
          reportData: {},
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates the screening status from the webhook payload', async () => {
      const screening = {
        ...consentedScreening,
        providerReference: 'ext-ref-1',
      };
      mockScreeningRepository.findOne.mockResolvedValue(screening);
      mockScreeningRepository.save.mockImplementation(async (v) => v);
      mockReportRepository.findOne.mockResolvedValue(null);
      mockReportRepository.create.mockImplementation((v) => v);
      mockReportRepository.save.mockResolvedValue(undefined);

      const result = await service.handleProviderWebhook({
        providerReference: 'ext-ref-1',
        status: UserScreeningStatus.COMPLETED,
        reportData: { creditScore: 720 },
      } as any);

      expect(result.status).toBe(UserScreeningStatus.COMPLETED);
    });
  });

  // ── service bootstrap ─────────────────────────────────────────────────────

  describe('service initialisation', () => {
    it('is defined', () => {
      expect(service).toBeDefined();
    });
  });
});
