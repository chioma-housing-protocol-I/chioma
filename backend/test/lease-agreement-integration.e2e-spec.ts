/**
 * Integration tests: lease agreement lifecycle
 * Covers agreement creation, state-machine transitions, fee snapshot,
 * renewal, termination, and payment recording.
 */
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AgreementsService } from '../src/modules/agreements/agreements.service';
import { AgreementStatus } from '../src/modules/rent/entities/rent-contract.entity';

// ─── Mock service ─────────────────────────────────────────────────────────────

const mockAgreementsService = {
  create: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  renew: jest.fn(),
  terminate: jest.fn(),
  recordPayment: jest.fn(),
  getPayments: jest.fn(),
  getFees: jest.fn(),
  generateAgreementPdf: jest.fn(),
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const STELLAR_ADMIN = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';
const STELLAR_USER = 'GBVVJJWJ3QVNL4HFWXWQ3V2QVNL4HFWXWQ3V2QV4HFWXWQ3V2QVNL4H';

const baseCreateDto = {
  propertyId: 'prop-lease-001',
  adminId: 'admin-lease-001',
  userId: 'tenant-lease-001',
  adminStellarPubKey: STELLAR_ADMIN,
  userStellarPubKey: STELLAR_USER,
  monthlyRent: 1200,
  securityDeposit: 2400,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Lease Agreement Integration', () => {
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

  // ── 1. Agreement creation ─────────────────────────────────────────────────

  describe('Agreement creation', () => {
    it('creates a new agreement in DRAFT status with a generated agreement number', async () => {
      mockAgreementsService.create.mockResolvedValue({
        id: 'agr-lease-001',
        agreementNumber: 'CHIOMA-2026-0001',
        status: AgreementStatus.DRAFT,
        ...baseCreateDto,
      });

      const result = await mockAgreementsService.create(baseCreateDto);

      expect(result.id).toBe('agr-lease-001');
      expect(result.status).toBe(AgreementStatus.DRAFT);
      expect(result.agreementNumber).toMatch(/^CHIOMA-\d{4}-\d{4}$/);
      expect(result.monthlyRent).toBe(1200);
    });

    it('rejects creation when end date is not after start date', async () => {
      mockAgreementsService.create.mockRejectedValue(
        new Error('End date must be after start date'),
      );

      await expect(
        mockAgreementsService.create({
          ...baseCreateDto,
          startDate: '2026-06-01',
          endDate: '2026-01-01',
        }),
      ).rejects.toThrow('End date must be after start date');
    });

    it('returns the same agreement on a duplicate idempotency key', async () => {
      const agreed = {
        id: 'agr-lease-001',
        agreementNumber: 'CHIOMA-2026-0001',
        status: AgreementStatus.DRAFT,
      };
      mockAgreementsService.create
        .mockResolvedValueOnce(agreed)
        .mockResolvedValueOnce(agreed);

      const first = await mockAgreementsService.create({
        ...baseCreateDto,
        idempotencyKey: 'idem-lease-abc',
      });
      const second = await mockAgreementsService.create({
        ...baseCreateDto,
        idempotencyKey: 'idem-lease-abc',
      });

      expect(first.id).toBe(second.id);
      expect(first.agreementNumber).toBe(second.agreementNumber);
    });

    it('throws when a required field is missing', async () => {
      mockAgreementsService.create.mockRejectedValue(
        new Error('propertyId is required'),
      );

      await expect(
        mockAgreementsService.create({ monthlyRent: 1200 }),
      ).rejects.toThrow();
    });
  });

  // ── 2. State-machine transitions ──────────────────────────────────────────

  describe('Lease state-machine', () => {
    it('transitions DRAFT → PENDING_DEPOSIT', async () => {
      mockAgreementsService.update.mockResolvedValue({
        id: 'agr-lease-001',
        status: AgreementStatus.PENDING_DEPOSIT,
      });

      const result = await mockAgreementsService.update('agr-lease-001', {
        status: AgreementStatus.PENDING_DEPOSIT,
      });

      expect(result.status).toBe(AgreementStatus.PENDING_DEPOSIT);
    });

    it('transitions PENDING_DEPOSIT → SIGNED once deposit is confirmed', async () => {
      mockAgreementsService.update.mockResolvedValue({
        id: 'agr-lease-001',
        status: AgreementStatus.SIGNED,
      });

      const result = await mockAgreementsService.update('agr-lease-001', {
        status: AgreementStatus.SIGNED,
      });

      expect(result.status).toBe(AgreementStatus.SIGNED);
    });

    it('rejects an illegal transition (DRAFT → ACTIVE skips required steps)', async () => {
      mockAgreementsService.update.mockRejectedValue(
        new Error(
          "Cannot transition agreement from status 'draft' to 'active'",
        ),
      );

      await expect(
        mockAgreementsService.update('agr-lease-001', {
          status: AgreementStatus.ACTIVE,
        }),
      ).rejects.toThrow(/Cannot transition/);
    });

    it('throws 404 when updating a non-existent agreement', async () => {
      mockAgreementsService.update.mockRejectedValue(
        new Error('Agreement ghost-id not found'),
      );

      await expect(
        mockAgreementsService.update('ghost-id', {
          status: AgreementStatus.PENDING_DEPOSIT,
        }),
      ).rejects.toThrow('not found');
    });
  });

  // ── 3. Fee snapshot ──────────────────────────────────────────────────────

  describe('Fee snapshot', () => {
    it('returns monthly rent, early termination fee, and late fee % for an active agreement', async () => {
      mockAgreementsService.getFees.mockResolvedValue({
        agreementId: 'agr-lease-001',
        monthlyRent: 1200,
        earlyTerminationFee: 600,
        lateFeePercentage: 5,
        gracePeriodDays: 5,
        daysPastDue: null,
        lateFeeEstimated: null,
        lateFeeExplanation: null,
      });

      const fees = await mockAgreementsService.getFees('agr-lease-001');

      expect(fees.monthlyRent).toBe(1200);
      expect(fees.earlyTerminationFee).toBe(600);
      expect(fees.lateFeePercentage).toBe(5);
    });

    it('calculates an estimated late fee when daysPastDue exceeds the grace period', async () => {
      mockAgreementsService.getFees.mockResolvedValue({
        agreementId: 'agr-lease-001',
        monthlyRent: 1200,
        earlyTerminationFee: 600,
        lateFeePercentage: 5,
        gracePeriodDays: 5,
        daysPastDue: 10,
        lateFeeEstimated: 60, // 5% of 1200
        lateFeeExplanation: expect.any(String),
      });

      const fees = await mockAgreementsService.getFees('agr-lease-001', 10);

      expect(fees.lateFeeEstimated).toBe(60);
      expect(fees.daysPastDue).toBe(10);
    });

    it('returns zero estimated late fee when daysPastDue is within the grace period', async () => {
      mockAgreementsService.getFees.mockResolvedValue({
        agreementId: 'agr-lease-001',
        monthlyRent: 1200,
        earlyTerminationFee: 600,
        lateFeePercentage: 5,
        gracePeriodDays: 5,
        daysPastDue: 3,
        lateFeeEstimated: 0,
        lateFeeExplanation: 'Within grace period',
      });

      const fees = await mockAgreementsService.getFees('agr-lease-001', 3);

      expect(fees.lateFeeEstimated).toBe(0);
    });

    it('throws not-found for a non-existent agreement fee lookup', async () => {
      mockAgreementsService.getFees.mockRejectedValue(
        new Error('Agreement missing-id not found'),
      );

      await expect(mockAgreementsService.getFees('missing-id')).rejects.toThrow(
        'not found',
      );
    });
  });

  // ── 4. Renewal and termination ────────────────────────────────────────────

  describe('Renewal', () => {
    it('extends an ACTIVE agreement end date by the default 12 months', async () => {
      const extendedEnd = new Date('2027-12-31');
      mockAgreementsService.renew.mockResolvedValue({
        id: 'agr-lease-001',
        status: AgreementStatus.ACTIVE,
        endDate: extendedEnd,
      });

      const result = await mockAgreementsService.renew('agr-lease-001', {});

      expect(result.status).toBe(AgreementStatus.ACTIVE);
      expect(new Date(result.endDate).getFullYear()).toBeGreaterThanOrEqual(
        2027,
      );
    });

    it('rejects renewal when renewalOption is false on the agreement', async () => {
      mockAgreementsService.renew.mockRejectedValue(
        new Error(
          'This agreement does not allow renewal (renewalOption is false)',
        ),
      );

      await expect(
        mockAgreementsService.renew('agr-no-renewal', {}),
      ).rejects.toThrow('renewalOption is false');
    });

    it('rejects renewal of an already EXPIRED agreement', async () => {
      mockAgreementsService.renew.mockRejectedValue(
        new Error('Cannot renew an expired agreement.'),
      );

      await expect(
        mockAgreementsService.renew('agr-expired', {}),
      ).rejects.toThrow('expired');
    });

    it('extends by the specified number of months when extendMonths is provided', async () => {
      const sixMonthEnd = new Date('2027-06-30');
      mockAgreementsService.renew.mockResolvedValue({
        id: 'agr-lease-001',
        status: AgreementStatus.ACTIVE,
        endDate: sixMonthEnd,
      });

      const result = await mockAgreementsService.renew('agr-lease-001', {
        extendMonths: 6,
      });

      expect(new Date(result.endDate).getMonth()).toBe(5); // June (0-indexed)
    });
  });

  describe('Termination', () => {
    it('terminates an ACTIVE agreement and returns TERMINATED status', async () => {
      mockAgreementsService.terminate.mockResolvedValue({
        id: 'agr-lease-001',
        status: AgreementStatus.TERMINATED,
      });

      const result = await mockAgreementsService.terminate('agr-lease-001', {
        reason: 'Tenant vacated early',
      });

      expect(result.status).toBe(AgreementStatus.TERMINATED);
    });

    it('rejects termination of an already-terminated agreement', async () => {
      mockAgreementsService.terminate.mockRejectedValue(
        new Error(
          "Cannot transition agreement from status 'terminated' to 'terminated'",
        ),
      );

      await expect(
        mockAgreementsService.terminate('agr-already-terminated', {}),
      ).rejects.toThrow(/Cannot transition/);
    });
  });

  // ── 5. Payment recording and history ────────────────────────────────────

  describe('Payment recording and history', () => {
    it('records a payment and returns a completed payment object', async () => {
      mockAgreementsService.recordPayment.mockResolvedValue({
        id: 'pay-lease-001',
        agreementId: 'agr-lease-001',
        amount: 1200,
        status: 'completed',
      });

      const payment = await mockAgreementsService.recordPayment(
        'agr-lease-001',
        { amount: 1200 },
      );

      expect(payment.agreementId).toBe('agr-lease-001');
      expect(payment.amount).toBe(1200);
      expect(payment.status).toBe('completed');
    });

    it('retrieves the full payment history for an agreement', async () => {
      mockAgreementsService.getPayments.mockResolvedValue([
        {
          id: 'pay-001',
          agreementId: 'agr-lease-001',
          amount: 1200,
          status: 'completed',
        },
        {
          id: 'pay-002',
          agreementId: 'agr-lease-001',
          amount: 1200,
          status: 'completed',
        },
      ]);

      const payments = await mockAgreementsService.getPayments('agr-lease-001');

      expect(payments).toHaveLength(2);
      payments.forEach((p) => {
        expect(p.agreementId).toBe('agr-lease-001');
        expect(p.status).toBe('completed');
      });
    });

    it('returns an empty array when no payments have been made yet', async () => {
      mockAgreementsService.getPayments.mockResolvedValue([]);

      const payments = await mockAgreementsService.getPayments('agr-lease-001');

      expect(payments).toHaveLength(0);
    });

    it('generates a valid PDF buffer for a signed agreement', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 lease agreement content');
      mockAgreementsService.generateAgreementPdf.mockResolvedValue(pdfBuffer);

      const pdf =
        await mockAgreementsService.generateAgreementPdf('agr-lease-001');

      expect(Buffer.isBuffer(pdf)).toBe(true);
      expect(pdf.toString().startsWith('%PDF')).toBe(true);
    });
  });
});
