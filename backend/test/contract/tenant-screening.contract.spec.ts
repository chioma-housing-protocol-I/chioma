import { Test, TestingModule } from '@nestjs/testing';
import { ScreeningService } from '../../src/modules/screening/screening.service';
import * as nock from 'nock';
import { matchers } from 'jest-json-schema';
import 'jest-json-schema';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantScreeningRequest } from '../../src/modules/screening/entities/tenant-screening-request.entity';
import { TenantScreeningConsent } from '../../src/modules/screening/entities/tenant-screening-consent.entity';
import { TenantScreeningReport } from '../../src/modules/screening/entities/tenant-screening-report.entity';
import { EncryptionService } from '../../src/modules/security/encryption.service';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { AuditService } from '../../src/modules/audit/audit.service';
import { WebhooksService } from '../../src/modules/webhooks/webhooks.service';
import {
  UserScreeningProvider,
  UserScreeningStatus,
  ScreeningCheckType,
} from '../../src/modules/screening/screening.enums';
import { UserRole } from '../../src/modules/users/entities/user.entity';

expect.extend(matchers);

describe('Tenant Screening Provider Contract (Nock + JSON Schema)', () => {
  let service: ScreeningService;
  const mockBaseUrl = 'http://api.screening-provider.com';
  const mockApiKey = 'test-api-key';

  const mockScreeningRepository = {
    findOne: jest.fn(),
    save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
    create: jest.fn().mockImplementation((val) => val),
  };

  const mockConsentRepository = {
    save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
    create: jest.fn().mockImplementation((val) => val),
  };

  const mockReportRepository = {
    save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
    create: jest.fn().mockImplementation((val) => val),
    findOne: jest.fn(),
  };

  const mockEncryptionService = {
    encrypt: jest.fn((val) => `encrypted_${val}`),
    decrypt: jest.fn((val) => val.replace('encrypted_', '')),
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

  // Define the JSON Schema for the Provider's response
  const providerResponseSchema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      status: {
        type: 'string',
        enum: ['IN_PROGRESS', 'COMPLETED', 'FAILED', 'APPROVED', 'REJECTED'],
      },
      report: { type: 'object' },
      providerReportId: { type: 'string' },
      riskLevel: { type: 'string' },
    },
    required: ['id', 'status'],
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreeningService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'TRANSUNION_SMARTMOVE_API_URL') return mockBaseUrl;
              if (key === 'TRANSUNION_SMARTMOVE_API_KEY') return mockApiKey;
              if (key === 'USER_SCREENING_SANDBOX_MODE') return 'false';
              if (key === 'TENANT_SCREENING_REPORT_TTL_DAYS') return '30';
              return undefined;
            }),
          },
        },
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
        { provide: EncryptionService, useValue: mockEncryptionService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: WebhooksService, useValue: mockWebhooksService },
      ],
    }).compile();

    service = module.get<ScreeningService>(ScreeningService);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('POST /screenings', () => {
    it('should adhere to the provider contract for screening creation', async () => {
      const screeningId = 'screening-123';
      const tenantId = 'tenant-456';

      const screening = {
        id: screeningId,
        tenantId,
        provider: UserScreeningProvider.TRANSUNION_SMARTMOVE,
        requestedChecks: [ScreeningCheckType.CREDIT],
        status: UserScreeningStatus.PENDING_CONSENT,
        encryptedApplicantData:
          'encrypted_{"email":"tenant@example.com","legalName":"John Doe"}',
      } as TenantScreeningRequest;

      const providerResponse = {
        id: 'provider-ref-789',
        status: 'IN_PROGRESS',
      };

      // Set up Nock to intercept the request and return the response
      nock(mockBaseUrl)
        .post('/screenings')
        .reply(201, (uri, requestBody: any) => {
          // Verify that the request body matches what we expect (Consumer Contract)
          expect(requestBody).toMatchObject({
            tenantId,
            externalReference: screeningId,
            requestedChecks: [ScreeningCheckType.CREDIT],
            applicantData: {
              email: 'tenant@example.com',
              legalName: 'John Doe',
            },
            consent: {
              version: 'v1',
            },
          });
          return providerResponse;
        });

      mockScreeningRepository.findOne.mockResolvedValue(screening);

      const result = await service.grantConsent(
        screeningId,
        {
          id: tenantId,
          role: UserRole.USER,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
        },
        {
          consentTextVersion: 'v1',
        },
      );

      // Verify that the response we got matches the schema (Provider Contract)
      expect(providerResponse).toMatchSchema(providerResponseSchema);

      // Verify that our service correctly mapped the response
      expect(result.providerReference).toBe(providerResponse.id);
      expect(result.status).toBe(UserScreeningStatus.IN_PROGRESS);
    });

    it('should handle provider errors correctly', async () => {
      const screeningId = 'screening-err';
      const tenantId = 'tenant-err';

      const screening = {
        id: screeningId,
        tenantId,
        provider: UserScreeningProvider.TRANSUNION_SMARTMOVE,
        requestedChecks: [ScreeningCheckType.CREDIT],
        encryptedApplicantData:
          'encrypted_{"email":"err@example.com","legalName":"Err User"}',
      } as TenantScreeningRequest;

      nock(mockBaseUrl).post('/screenings').reply(400, {
        error: 'Invalid request',
        code: 'INVALID_DATA',
      });

      mockScreeningRepository.findOne.mockResolvedValue(screening);

      await expect(
        service.grantConsent(
          screeningId,
          {
            id: tenantId,
            role: UserRole.USER,
          },
          {
            consentTextVersion: 'v1',
          },
        ),
      ).rejects.toThrow();
    });
  });
});
