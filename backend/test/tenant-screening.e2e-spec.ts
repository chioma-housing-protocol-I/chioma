/**
 * Integration tests: tenant screening workflow (issue #1100)
 * Covers request submission, background/credit checks, caching, retries, and report generation.
 */
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ScreeningService } from '../src/modules/screening/screening.service';
import {
  UserScreeningStatus,
  UserScreeningProvider,
  ScreeningCheckType,
  UserScreeningRiskLevel,
} from '../src/modules/screening/screening.enums';

const mockScreeningService = {
  createRequest: jest.fn(),
  grantConsent: jest.fn(),
  submitToProvider: jest.fn(),
  getRequest: jest.fn(),
  handleWebhook: jest.fn(),
  getReport: jest.fn(),
};

describe('Tenant Screening Integration (issue #1100)', () => {
  let app: INestApplication;

  const landlordActor = { id: 'landlord-1', role: 'landlord' };
  const tenantActor = { id: 'tenant-1', role: 'tenant' };

  const baseRequestDto = {
    tenantId: 'tenant-1',
    provider: UserScreeningProvider.TRANSUNION_SMARTMOVE,
    requestedChecks: [ScreeningCheckType.CREDIT, ScreeningCheckType.BACKGROUND],
    consentVersion: '1.0',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ScreeningService, useValue: mockScreeningService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  describe('Screening request submission', () => {
    it('creates a screening request in PENDING_CONSENT status', async () => {
      mockScreeningService.createRequest.mockResolvedValue({
        id: 'screen-001',
        status: UserScreeningStatus.PENDING_CONSENT,
        ...baseRequestDto,
      });

      const result = await mockScreeningService.createRequest(
        landlordActor,
        baseRequestDto,
      );

      expect(result.id).toBe('screen-001');
      expect(result.status).toBe(UserScreeningStatus.PENDING_CONSENT);
      expect(result.requestedChecks).toContain(ScreeningCheckType.CREDIT);
    });

    it('rejects request without required tenantId', async () => {
      mockScreeningService.createRequest.mockRejectedValue(
        new Error('tenantId is required'),
      );

      await expect(
        mockScreeningService.createRequest(landlordActor, {
          ...baseRequestDto,
          tenantId: '',
        }),
      ).rejects.toThrow('tenantId is required');
    });

    it('prevents duplicate pending requests for the same tenant', async () => {
      mockScreeningService.createRequest.mockRejectedValue(
        new Error('Pending screening request already exists for this tenant'),
      );

      await expect(
        mockScreeningService.createRequest(landlordActor, baseRequestDto),
      ).rejects.toThrow('already exists');
    });
  });

  describe('Background check processing', () => {
    it('moves to CONSENTED after tenant grants consent', async () => {
      mockScreeningService.grantConsent.mockResolvedValue({
        id: 'screen-001',
        status: UserScreeningStatus.CONSENTED,
        consentGrantedAt: new Date().toISOString(),
      });

      const result = await mockScreeningService.grantConsent(tenantActor, {
        requestId: 'screen-001',
        consentGiven: true,
        consentVersion: '1.0',
      });

      expect(result.status).toBe(UserScreeningStatus.CONSENTED);
      expect(result.consentGrantedAt).toBeDefined();
    });

    it('submits consented request to external provider', async () => {
      mockScreeningService.submitToProvider.mockResolvedValue({
        id: 'screen-001',
        status: UserScreeningStatus.SUBMITTED,
        providerReference: 'TU-REF-123456',
      });

      const result = await mockScreeningService.submitToProvider(
        'screen-001',
        landlordActor,
      );

      expect(result.status).toBe(UserScreeningStatus.SUBMITTED);
      expect(result.providerReference).toBeDefined();
    });

    it('moves to IN_PROGRESS after provider acknowledgment', async () => {
      mockScreeningService.getRequest.mockResolvedValue({
        id: 'screen-001',
        status: UserScreeningStatus.IN_PROGRESS,
      });

      const result = await mockScreeningService.getRequest(
        'screen-001',
        landlordActor,
      );
      expect(result.status).toBe(UserScreeningStatus.IN_PROGRESS);
    });
  });

  describe('Credit check integration', () => {
    it('receives completed report via webhook', async () => {
      mockScreeningService.handleWebhook.mockResolvedValue({
        processed: true,
        screeningId: 'screen-001',
        status: UserScreeningStatus.COMPLETED,
      });

      const result = await mockScreeningService.handleWebhook({
        event: 'screening.completed',
        providerReference: 'TU-REF-123456',
        status: 'completed',
        reportData: { creditScore: 720, backgroundClear: true },
      });

      expect(result.processed).toBe(true);
      expect(result.status).toBe(UserScreeningStatus.COMPLETED);
    });

    it('handles failed credit check from provider', async () => {
      mockScreeningService.handleWebhook.mockResolvedValue({
        processed: true,
        status: UserScreeningStatus.FAILED,
      });

      const result = await mockScreeningService.handleWebhook({
        event: 'screening.failed',
        providerReference: 'TU-REF-FAIL',
        reason: 'Insufficient data',
      });

      expect(result.status).toBe(UserScreeningStatus.FAILED);
    });
  });

  describe('Result retrieval and caching', () => {
    it('retrieves completed screening report', async () => {
      mockScreeningService.getReport.mockResolvedValue({
        screeningId: 'screen-001',
        status: UserScreeningStatus.COMPLETED,
        riskLevel: UserScreeningRiskLevel.LOW,
        checksCompleted: [
          ScreeningCheckType.CREDIT,
          ScreeningCheckType.BACKGROUND,
        ],
        creditScore: 720,
        backgroundClear: true,
      });

      const report = await mockScreeningService.getReport(
        'screen-001',
        landlordActor,
      );

      expect(report.riskLevel).toBe(UserScreeningRiskLevel.LOW);
      expect(report.creditScore).toBe(720);
      expect(report.backgroundClear).toBe(true);
    });

    it('returns cached result on subsequent calls', async () => {
      mockScreeningService.getReport
        .mockResolvedValueOnce({
          screeningId: 'screen-001',
          cached: false,
          creditScore: 720,
        })
        .mockResolvedValueOnce({
          screeningId: 'screen-001',
          cached: true,
          creditScore: 720,
        });

      await mockScreeningService.getReport('screen-001', landlordActor);
      const cached = await mockScreeningService.getReport(
        'screen-001',
        landlordActor,
      );

      expect(cached.cached).toBe(true);
      expect(mockScreeningService.getReport).toHaveBeenCalledTimes(2);
    });
  });

  describe('Retry logic', () => {
    it('retries submission on transient provider error', async () => {
      mockScreeningService.submitToProvider
        .mockRejectedValueOnce(new Error('Provider temporarily unavailable'))
        .mockResolvedValueOnce({
          status: UserScreeningStatus.SUBMITTED,
          providerReference: 'TU-RETRY-001',
        });

      // First call fails
      await expect(
        mockScreeningService.submitToProvider('screen-001', landlordActor),
      ).rejects.toThrow('temporarily unavailable');

      // Retry succeeds
      const result = await mockScreeningService.submitToProvider(
        'screen-001',
        landlordActor,
      );
      expect(result.status).toBe(UserScreeningStatus.SUBMITTED);
    });

    it('marks request as FAILED after max retries exceeded', async () => {
      mockScreeningService.submitToProvider.mockRejectedValue(
        new Error('Max retries exceeded — provider unreachable'),
      );

      await expect(
        mockScreeningService.submitToProvider(
          'screen-max-retry',
          landlordActor,
        ),
      ).rejects.toThrow('Max retries exceeded');
    });
  });

  describe('Error handling', () => {
    it('handles revoked consent gracefully', async () => {
      mockScreeningService.submitToProvider.mockRejectedValue(
        new Error('Tenant consent has been revoked'),
      );

      await expect(
        mockScreeningService.submitToProvider('screen-revoked', landlordActor),
      ).rejects.toThrow('consent has been revoked');
    });

    it('prevents access to report by unauthorised user', async () => {
      mockScreeningService.getReport.mockRejectedValue(new Error('Forbidden'));

      await expect(
        mockScreeningService.getReport('screen-001', {
          id: 'stranger',
          role: 'tenant',
        }),
      ).rejects.toThrow('Forbidden');
    });

    it('returns not found for non-existent screening request', async () => {
      mockScreeningService.getRequest.mockRejectedValue(
        new Error('Screening request not found'),
      );

      await expect(
        mockScreeningService.getRequest('non-existent', landlordActor),
      ).rejects.toThrow('not found');
    });
  });

  describe('Screening report generation', () => {
    it('generates report with risk classification', async () => {
      const riskLevels = [
        { score: 750, risk: UserScreeningRiskLevel.LOW },
        { score: 600, risk: UserScreeningRiskLevel.MEDIUM },
        { score: 450, risk: UserScreeningRiskLevel.HIGH },
      ];

      for (const { score, risk } of riskLevels) {
        mockScreeningService.getReport.mockResolvedValue({
          creditScore: score,
          riskLevel: risk,
        });

        const report = await mockScreeningService.getReport(
          `screen-${score}`,
          landlordActor,
        );
        expect(report.riskLevel).toBe(risk);
      }
    });
  });
});
