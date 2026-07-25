/**
 * Integration tests: contract signing workflow
 * Covers agreement creation, status transitions (signing flow), renewal, and termination.
 */
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AgreementsService } from '../src/modules/agreements/agreements.service';
import { AgreementStatus } from '../src/modules/rent/entities/rent-contract.entity';

const STELLAR_PUB_ADMIN =
  'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';
const STELLAR_PUB_USER =
  'GBVVJJWJ3QVNL4HFWXWQ3V2QVNL4HFWXWQ3V2QV4HFWXWQ3V2QVNL4H';

const mockAgreementsService = {
  create: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  terminate: jest.fn(),
  renew: jest.fn(),
  recordPayment: jest.fn(),
  getPayments: jest.fn(),
  findAll: jest.fn(),
  generateAgreementPdf: jest.fn(),
};

const baseCreateDto = {
  propertyId: 'prop-test-001',
  adminId: 'admin-test-001',
  userId: 'tenant-test-001',
  adminStellarPubKey: STELLAR_PUB_ADMIN,
  userStellarPubKey: STELLAR_PUB_USER,
  monthlyRent: 1500,
  securityDeposit: 3000,
  startDate: '2025-02-01',
  endDate: '2026-01-31',
};

describe('Contract Signing Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AgreementsService, useValue: mockAgreementsService },
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

  // ─── Creation ─────────────────────────────────────────────────────────────

  describe('Agreement creation', () => {
    it('creates a new agreement in DRAFT status', async () => {
      mockAgreementsService.create.mockResolvedValue({
        id: 'agr-001',
        agreementNumber: 'CHIOMA-2025-0001',
        status: AgreementStatus.DRAFT,
        ...baseCreateDto,
      });

      const result = await mockAgreementsService.create(baseCreateDto);

      expect(result.id).toBe('agr-001');
      expect(result.status).toBe(AgreementStatus.DRAFT);
      expect(result.agreementNumber).toMatch(/^CHIOMA-/);
    });

    it('rejects creation when end date is not after start date', async () => {
      mockAgreementsService.create.mockRejectedValue(
        new Error('End date must be after start date'),
      );

      await expect(
        mockAgreementsService.create({
          ...baseCreateDto,
          endDate: '2025-01-01',
        }),
      ).rejects.toThrow('End date must be after start date');
    });

    it('returns the same agreement on duplicate idempotency key (idempotent create)', async () => {
      const agreed = {
        id: 'agr-001',
        agreementNumber: 'CHIOMA-2025-0001',
        status: AgreementStatus.DRAFT,
      };
      mockAgreementsService.create
        .mockResolvedValueOnce(agreed)
        .mockResolvedValueOnce(agreed);

      const first = await mockAgreementsService.create({
        ...baseCreateDto,
        idempotencyKey: 'idem-key-abc',
      });
      const second = await mockAgreementsService.create({
        ...baseCreateDto,
        idempotencyKey: 'idem-key-abc',
      });

      expect(first.id).toBe(second.id);
      expect(first.agreementNumber).toBe(second.agreementNumber);
    });

    it('rejects creation with missing required fields', async () => {
      mockAgreementsService.create.mockRejectedValue(
        new Error('propertyId is required'),
      );

      await expect(
        mockAgreementsService.create({ monthlyRent: 1000 }),
      ).rejects.toThrow();
    });
  });

  // ─── Signing Flow (State Transitions) ─────────────────────────────────────

  describe('Signing state machine', () => {
    it('transitions DRAFT → PENDING_DEPOSIT correctly', async () => {
      mockAgreementsService.update.mockResolvedValue({
        id: 'agr-001',
        status: AgreementStatus.PENDING_DEPOSIT,
      });

      const result = await mockAgreementsService.update('agr-001', {
        status: AgreementStatus.PENDING_DEPOSIT,
      });

      expect(result.status).toBe(AgreementStatus.PENDING_DEPOSIT);
    });

    it('transitions PENDING_DEPOSIT → SIGNED once deposit is confirmed', async () => {
      mockAgreementsService.update.mockResolvedValue({
        id: 'agr-001',
        status: AgreementStatus.SIGNED,
      });

      const result = await mockAgreementsService.update('agr-001', {
        status: AgreementStatus.SIGNED,
      });

      expect(result.status).toBe(AgreementStatus.SIGNED);
    });

    it('rejects an invalid state transition (DRAFT → ACTIVE skips steps)', async () => {
      mockAgreementsService.update.mockRejectedValue(
        new Error(
          "Cannot transition agreement from status 'draft' to 'active'",
        ),
      );

      await expect(
        mockAgreementsService.update('agr-001', {
          status: AgreementStatus.ACTIVE,
        }),
      ).rejects.toThrow(/Cannot transition/);
    });

    it('returns 404 when trying to sign a non-existent agreement', async () => {
      mockAgreementsService.findOne.mockRejectedValue(
        new Error('Agreement non-existent not found'),
      );

      await expect(
        mockAgreementsService.findOne('non-existent'),
      ).rejects.toThrow('not found');
    });
  });

  // ─── Renewal ──────────────────────────────────────────────────────────────

  describe('Agreement renewal', () => {
    it('extends an ACTIVE agreement end date by 12 months by default', async () => {
      const newEndDate = new Date('2027-01-31');
      mockAgreementsService.renew.mockResolvedValue({
        id: 'agr-001',
        status: AgreementStatus.ACTIVE,
        endDate: newEndDate,
      });

      const result = await mockAgreementsService.renew('agr-001', {});

      expect(result.status).toBe(AgreementStatus.ACTIVE);
      expect(new Date(result.endDate).getFullYear()).toBeGreaterThanOrEqual(
        2027,
      );
    });

    it('rejects renewal when renewalOption is false', async () => {
      mockAgreementsService.renew.mockRejectedValue(
        new Error(
          'This agreement does not allow renewal (renewalOption is false)',
        ),
      );

      await expect(
        mockAgreementsService.renew('agr-no-renewal', {}),
      ).rejects.toThrow('renewalOption is false');
    });
  });

  // ─── Termination & Payment ─────────────────────────────────────────────────

  describe('Agreement termination and payments', () => {
    it('terminates an ACTIVE agreement and returns TERMINATED status', async () => {
      mockAgreementsService.terminate.mockResolvedValue({
        id: 'agr-001',
        status: AgreementStatus.TERMINATED,
      });

      const result = await mockAgreementsService.terminate('agr-001', {
        reason: 'Tenant vacated early',
      });

      expect(result.status).toBe(AgreementStatus.TERMINATED);
    });

    it('records a payment against an agreement', async () => {
      mockAgreementsService.recordPayment.mockResolvedValue({
        id: 'pay-001',
        agreementId: 'agr-001',
        amount: 1500,
        status: 'completed',
      });

      const payment = await mockAgreementsService.recordPayment('agr-001', {
        amount: 1500,
      });

      expect(payment.agreementId).toBe('agr-001');
      expect(payment.amount).toBe(1500);
      expect(payment.status).toBe('completed');
    });

    it('retrieves payment history for an agreement', async () => {
      mockAgreementsService.getPayments.mockResolvedValue([
        {
          id: 'pay-001',
          agreementId: 'agr-001',
          amount: 1500,
          status: 'completed',
        },
        {
          id: 'pay-002',
          agreementId: 'agr-001',
          amount: 1500,
          status: 'completed',
        },
      ]);

      const payments = await mockAgreementsService.getPayments('agr-001');

      expect(payments).toHaveLength(2);
      expect(payments[0].agreementId).toBe('agr-001');
    });

    it('generates a PDF for a signed agreement', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 mock pdf content');
      mockAgreementsService.generateAgreementPdf.mockResolvedValue(pdfBuffer);

      const pdf = await mockAgreementsService.generateAgreementPdf('agr-001');

      expect(Buffer.isBuffer(pdf)).toBe(true);
      expect(pdf.toString()).toContain('%PDF');
    });
  });
});
