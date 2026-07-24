/**
 * Comprehensive PaymentService tests
 * Covers edge cases, error scenarios, and test isolation
 * that complement the existing payment.service.spec.ts
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PaymentService } from './payment.service';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import {
  PaymentSchedule,
  PaymentScheduleStatus,
  PaymentInterval,
} from './entities/payment-schedule.entity';
import { PaymentGatewayService } from './payment-gateway.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePaymentRecordDto } from './dto/record-payment.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { CreatePaymentScheduleDto } from './dto/create-payment-schedule.dto';
import { PaymentProcessingService } from '../stellar/services/payment-processing.service';
import { StellarService } from '../stellar/services/stellar.service';
import { LockService } from '../../common/lock';
import { IdempotencyService } from '../../common/idempotency';
import { FraudHooksService } from '../fraud/fraud-hooks.service';

// ─── Mock Factories (fresh per test) ────────────────────────────────────────

const makePaymentRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const makePaymentMethodRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const makePaymentScheduleRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const makeEntityManager = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
});

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('PaymentService – edge cases & isolation', () => {
  let service: PaymentService;
  let paymentRepo: ReturnType<typeof makePaymentRepo>;
  let paymentMethodRepo: ReturnType<typeof makePaymentMethodRepo>;
  let paymentScheduleRepo: ReturnType<typeof makePaymentScheduleRepo>;
  let entityManager: ReturnType<typeof makeEntityManager>;
  let mockGateway: {
    chargePayment: jest.Mock;
    processRefund: jest.Mock;
    savePaymentMethod: jest.Mock;
  };
  let mockNotifications: { notify: jest.Mock };
  let mockFraud: { onPaymentRecorded: jest.Mock };
  let mockLock: { withLock: jest.Mock };
  let mockIdempotency: { process: jest.Mock };
  let mockStellar: {
    createEscrow: jest.Mock;
    releaseEscrow: jest.Mock;
    refundEscrow: jest.Mock;
    getEscrowById: jest.Mock;
    getTransactionByHash: jest.Mock;
  };
  let mockPaymentProcessing: { processRentPayment: jest.Mock };

  beforeEach(async () => {
    paymentRepo = makePaymentRepo();
    paymentMethodRepo = makePaymentMethodRepo();
    paymentScheduleRepo = makePaymentScheduleRepo();
    entityManager = makeEntityManager();

    mockGateway = {
      chargePayment: jest.fn(),
      processRefund: jest.fn(),
      savePaymentMethod: jest.fn(),
    };
    mockNotifications = { notify: jest.fn() };
    mockFraud = { onPaymentRecorded: jest.fn().mockResolvedValue(undefined) };
    mockLock = {
      withLock: jest.fn(
        async (_k: string, _t: number, fn: () => Promise<unknown>) => fn(),
      ),
    };
    mockIdempotency = {
      process: jest.fn(
        async (_k: string, _t: number, fn: () => Promise<unknown>) => fn(),
      ),
    };
    mockStellar = {
      createEscrow: jest.fn(),
      releaseEscrow: jest.fn(),
      refundEscrow: jest.fn(),
      getEscrowById: jest.fn(),
      getTransactionByHash: jest.fn(),
    };
    mockPaymentProcessing = { processRentPayment: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
        {
          provide: getRepositoryToken(PaymentMethod),
          useValue: paymentMethodRepo,
        },
        {
          provide: getRepositoryToken(PaymentSchedule),
          useValue: paymentScheduleRepo,
        },
        { provide: PaymentGatewayService, useValue: mockGateway },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: Object, useValue: { getUserById: jest.fn() } },
        { provide: PaymentProcessingService, useValue: mockPaymentProcessing },
        { provide: StellarService, useValue: mockStellar },
        { provide: LockService, useValue: mockLock },
        { provide: IdempotencyService, useValue: mockIdempotency },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(
              (cb: (em: typeof entityManager) => Promise<unknown>) =>
                cb(entityManager),
            ),
          },
        },
        { provide: FraudHooksService, useValue: mockFraud },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── recordPayment edge cases ────────────────────────────────────────────

  describe('recordPayment – edge cases', () => {
    it('calls fraud hook after successful payment', async () => {
      paymentRepo.findOne.mockResolvedValue(null);
      paymentMethodRepo.findOne.mockResolvedValue({
        id: 'pm-1',
        userId: 'user-1',
        encryptedMetadata: null,
      });
      mockGateway.chargePayment.mockResolvedValue({
        success: true,
        chargeId: 'ch-1',
      });
      paymentRepo.create.mockImplementation(
        (d: Partial<Payment>) => d as Payment,
      );
      paymentRepo.save.mockResolvedValue({
        id: 'pay-1',
        amount: 200,
        currency: 'NGN',
        paymentMethod: 'card',
      } as Payment);

      await service.recordPayment(
        {
          agreementId: 'agr-1',
          amount: 200,
          paymentMethodId: 'pm-1',
        } as CreatePaymentRecordDto,
        'user-1',
      );

      expect(mockFraud.onPaymentRecorded).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', amount: 200 }),
      );
    });

    it('throws when payment method does not belong to user', async () => {
      paymentRepo.findOne.mockResolvedValue(null);
      paymentMethodRepo.findOne.mockResolvedValue({
        id: 'pm-1',
        userId: 'other-user',
        encryptedMetadata: null,
      });

      await expect(
        service.recordPayment(
          {
            agreementId: 'agr-1',
            amount: 100,
            paymentMethodId: 'pm-1',
          } as CreatePaymentRecordDto,
          'user-1',
        ),
      ).rejects.toThrow();
    });

    it('throws when payment method is not found', async () => {
      paymentRepo.findOne.mockResolvedValue(null);
      paymentMethodRepo.findOne.mockResolvedValue(null);

      await expect(
        service.recordPayment(
          {
            agreementId: 'agr-1',
            amount: 100,
            paymentMethodId: 'pm-missing',
          } as CreatePaymentRecordDto,
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('propagates error when gateway throws', async () => {
      paymentRepo.findOne.mockResolvedValue(null);
      paymentMethodRepo.findOne.mockResolvedValue({
        id: 'pm-1',
        userId: 'user-1',
        encryptedMetadata: null,
      });
      mockGateway.chargePayment.mockRejectedValue(new Error('Gateway timeout'));
      paymentRepo.create.mockImplementation(
        (d: Partial<Payment>) => d as Payment,
      );
      paymentRepo.save.mockResolvedValue({
        id: 'pay-fail',
        status: PaymentStatus.FAILED,
      } as Payment);

      await expect(
        service.recordPayment(
          {
            agreementId: 'agr-1',
            amount: 100,
            paymentMethodId: 'pm-1',
          } as CreatePaymentRecordDto,
          'user-1',
        ),
      ).rejects.toThrow();
    });
  });

  // ─── processRefund edge cases ────────────────────────────────────────────

  describe('processRefund – edge cases', () => {
    it('throws when payment is not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.processRefund(
          'pay-missing',
          { amount: 50, reason: 'test' } as ProcessRefundDto,
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when refund amount exceeds payment amount', async () => {
      entityManager.findOne.mockResolvedValue({
        id: 'pay-1',
        userId: 'user-1',
        status: PaymentStatus.COMPLETED,
        amount: 100,
        refundAmount: 0,
        metadata: { chargeId: 'ch-1' },
      } as unknown as Payment);

      await expect(
        service.processRefund(
          'pay-1',
          { amount: 999, reason: 'over' } as ProcessRefundDto,
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('prevents double-refund on already-refunded payment', async () => {
      entityManager.findOne.mockResolvedValue({
        id: 'pay-1',
        userId: 'user-1',
        status: PaymentStatus.REFUNDED,
        amount: 100,
        refundAmount: 100,
        metadata: { chargeId: 'ch-1' },
      } as unknown as Payment);

      await expect(
        service.processRefund(
          'pay-1',
          { amount: 1, reason: 'dup' } as ProcessRefundDto,
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects refund with a descriptive error when metadata has no chargeId', async () => {
      entityManager.findOne.mockResolvedValue({
        id: 'pay-1',
        userId: 'user-1',
        status: PaymentStatus.COMPLETED,
        amount: 100,
        refundAmount: 0,
        metadata: { gateway: 'paystack' },
      } as unknown as Payment);

      await expect(
        service.processRefund(
          'pay-1',
          { amount: 50, reason: 'no charge' } as ProcessRefundDto,
          'user-1',
        ),
      ).rejects.toThrow(
        /payment pay-1 has no gateway charge ID recorded in its metadata/,
      );

      // Refund must be rejected before it ever reaches the gateway.
      expect(mockGateway.processRefund).not.toHaveBeenCalled();
      expect(entityManager.save).not.toHaveBeenCalled();
    });

    it('rejects refund when metadata is entirely null', async () => {
      entityManager.findOne.mockResolvedValue({
        id: 'pay-2',
        userId: 'user-1',
        status: PaymentStatus.COMPLETED,
        amount: 100,
        refundAmount: 0,
        metadata: null,
      } as unknown as Payment);

      await expect(
        service.processRefund(
          'pay-2',
          { amount: 50, reason: 'null meta' } as ProcessRefundDto,
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockGateway.processRefund).not.toHaveBeenCalled();
    });

    it('rejects refund when chargeId is blank/whitespace', async () => {
      entityManager.findOne.mockResolvedValue({
        id: 'pay-3',
        userId: 'user-1',
        status: PaymentStatus.COMPLETED,
        amount: 100,
        refundAmount: 0,
        metadata: { chargeId: '   ' },
      } as unknown as Payment);

      await expect(
        service.processRefund(
          'pay-3',
          { amount: 50, reason: 'blank' } as ProcessRefundDto,
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockGateway.processRefund).not.toHaveBeenCalled();
    });

    it('sends notification after successful refund', async () => {
      entityManager.findOne.mockResolvedValue({
        id: 'pay-1',
        userId: 'user-1',
        status: PaymentStatus.COMPLETED,
        amount: 100,
        refundAmount: 0,
        currency: 'NGN',
        metadata: { chargeId: 'ch-1' },
      } as unknown as Payment);
      mockGateway.processRefund.mockResolvedValue({
        success: true,
        refundId: 'ref-1',
      });
      entityManager.save.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.REFUNDED,
        refundAmount: 50,
      } as Payment);

      await service.processRefund(
        'pay-1',
        { amount: 50, reason: 'partial' } as ProcessRefundDto,
        'user-1',
      );

      expect(mockNotifications.notify).toHaveBeenCalledWith(
        'user-1',
        expect.stringContaining('efund'),
        expect.any(String),
        'PAYMENT_REFUNDED',
      );
    });
  });

  // ─── createPaymentSchedule edge cases ───────────────────────────────────

  describe('createPaymentSchedule – edge cases', () => {
    it('throws when payment method is not found', async () => {
      paymentMethodRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createPaymentSchedule(
          {
            agreementId: 'agr-1',
            paymentMethodId: 'pm-missing',
            amount: 500,
            interval: PaymentInterval.MONTHLY,
          } as CreatePaymentScheduleDto,
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('sets status to ACTIVE on creation', async () => {
      paymentMethodRepo.findOne.mockResolvedValue({
        id: 'pm-1',
        userId: 'user-1',
      });
      paymentScheduleRepo.create.mockImplementation(
        (d: Partial<PaymentSchedule>) => d as PaymentSchedule,
      );
      paymentScheduleRepo.save.mockResolvedValue({
        id: 'sched-1',
        status: PaymentScheduleStatus.ACTIVE,
      } as PaymentSchedule);

      const result = await service.createPaymentSchedule(
        {
          agreementId: 'agr-1',
          paymentMethodId: 'pm-1',
          amount: 500,
          interval: PaymentInterval.MONTHLY,
        } as CreatePaymentScheduleDto,
        'user-1',
      );

      expect(paymentScheduleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentScheduleStatus.ACTIVE }),
      );
      expect(result.id).toBe('sched-1');
    });
  });

  // ─── deposit management integration flow ───────────────────────────────

  describe('deposit management integration flow', () => {
    it('records a security deposit escrow, releases it, and marks the payment complete', async () => {
      const escrowPayload = {
        sourcePublicKey: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        destinationPublicKey:
          'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
        amount: '3000.0000000',
        agreementId: 'agr-1',
      };

      mockStellar.createEscrow.mockResolvedValue({
        id: 42,
        status: 'ACTIVE',
      });

      const escrowPayment = {
        id: 'pay-escrow-1',
        userId: 'user-1',
        agreementId: 'agr-1',
        amount: 3000,
        currency: 'XLM',
        status: PaymentStatus.PENDING,
        referenceNumber: 'escrow:42',
        metadata: {
          gateway: 'stellar',
          flow: 'escrow_deposit',
          escrowId: 42,
        },
      } as Payment;

      paymentRepo.create.mockImplementation(
        (d: Partial<Payment>) => d as Payment,
      );
      paymentRepo.save.mockResolvedValue(escrowPayment);

      const created = await service.createEscrowDeposit(
        escrowPayload as any,
        'user-1',
      );

      expect(mockStellar.createEscrow).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '3000.0000000',
          rentAgreementId: 'agr-1',
        }),
      );
      expect(created.status).toBe(PaymentStatus.PENDING);
      expect(created.referenceNumber).toBe('escrow:42');

      mockStellar.releaseEscrow.mockResolvedValue({
        id: 42,
        status: 'released',
        releaseTransactionHash: 'release-hash-1',
      });
      paymentRepo.findOne.mockResolvedValue(escrowPayment);
      paymentRepo.save.mockResolvedValue({
        ...escrowPayment,
        status: PaymentStatus.COMPLETED,
      } as Payment);

      const released = await service.releaseEscrowDeposit(
        42,
        { memo: 'Deposit released' } as any,
        'user-1',
      );

      expect(mockStellar.releaseEscrow).toHaveBeenCalledWith({
        escrowId: 42,
        memo: 'Deposit released',
      });
      expect(released?.status).toBe(PaymentStatus.COMPLETED);
    });

    it('processes a partial security deposit refund for damage deductions', async () => {
      const depositPayment = {
        id: 'pay-deposit-1',
        userId: 'user-1',
        agreementId: 'agr-1',
        amount: 3000,
        refundAmount: 0,
        currency: 'XLM',
        status: PaymentStatus.COMPLETED,
        metadata: {
          chargeId: 'ch-deposit-1',
        },
      } as Payment;

      entityManager.findOne.mockResolvedValue(depositPayment);
      entityManager.save.mockImplementation(
        async (_entityClass: unknown, entity?: Payment) =>
          ({
            ...entity,
            refundAmount: 500,
            refundStatus: 'completed',
            status: PaymentStatus.PARTIAL_REFUND,
          }) as Payment,
      );

      mockGateway.processRefund.mockResolvedValue({
        success: true,
        refundId: 'refund-1',
      });

      const partialRefund = await service.processRefund(
        'pay-deposit-1',
        { amount: 500, reason: 'Minor damage assessment' } as ProcessRefundDto,
        'user-1',
      );

      expect(mockGateway.processRefund).toHaveBeenCalledWith(
        'ch-deposit-1',
        500,
      );
      expect(partialRefund.status).toBe(PaymentStatus.PARTIAL_REFUND);
      expect(partialRefund.refundAmount).toBe(500);
    });

    it('processes a full security deposit refund when no deductions remain', async () => {
      const depositPayment = {
        id: 'pay-deposit-2',
        userId: 'user-1',
        agreementId: 'agr-1',
        amount: 3000,
        refundAmount: 0,
        currency: 'XLM',
        status: PaymentStatus.COMPLETED,
        metadata: {
          chargeId: 'ch-deposit-2',
        },
      } as Payment;

      entityManager.findOne.mockResolvedValue(depositPayment);
      entityManager.save.mockImplementation(
        async (_entityClass: unknown, entity?: Payment) =>
          ({
            ...entity,
            refundAmount: 3000,
            refundStatus: 'completed',
            status: PaymentStatus.REFUNDED,
          }) as Payment,
      );

      mockGateway.processRefund.mockResolvedValue({
        success: true,
        refundId: 'refund-2',
      });

      const finalRefund = await service.processRefund(
        'pay-deposit-2',
        {
          amount: 3000,
          reason: 'Full deposit refund after move-out',
        } as ProcessRefundDto,
        'user-1',
      );

      expect(mockGateway.processRefund).toHaveBeenCalledWith(
        'ch-deposit-2',
        3000,
      );
      expect(finalRefund.status).toBe(PaymentStatus.REFUNDED);
      expect(finalRefund.refundAmount).toBe(3000);
    });

    it('refunds a held escrow deposit when the security deposit is returned', async () => {
      const escrowPayment = {
        id: 'pay-escrow-2',
        userId: 'user-1',
        agreementId: 'agr-1',
        amount: 3000,
        currency: 'XLM',
        status: PaymentStatus.PENDING,
        referenceNumber: 'escrow:88',
        metadata: {
          gateway: 'stellar',
          flow: 'escrow_deposit',
          escrowId: 88,
        },
      } as Payment;

      paymentRepo.findOne.mockResolvedValue(escrowPayment);
      mockStellar.refundEscrow.mockResolvedValue({
        id: 88,
        status: 'refunded',
        refundTransactionHash: 'refund-hash-2',
      });
      paymentRepo.save.mockResolvedValue({
        ...escrowPayment,
        status: PaymentStatus.REFUNDED,
      } as Payment);

      const result = await service.refundEscrowDeposit(
        88,
        { reason: 'Normal move-out refund' } as any,
        'user-1',
      );

      expect(mockStellar.refundEscrow).toHaveBeenCalledWith({
        escrowId: 88,
        reason: 'Normal move-out refund',
      });
      expect(result?.status).toBe(PaymentStatus.REFUNDED);
    });
  });

  // ─── getPaymentAnalytics edge cases ─────────────────────────────────────

  describe('getPaymentAnalytics – edge cases', () => {
    it('returns zero totals when no payments exist', async () => {
      paymentRepo.find.mockResolvedValue([]);

      const result = await service.getPaymentAnalytics('user-1');

      expect(result.totalPayments).toBe(0);
    });

    it('aggregates multiple currencies correctly', async () => {
      paymentRepo.find.mockResolvedValue([
        {
          amount: 100,
          refundAmount: 0,
          currency: 'USDC',
          status: PaymentStatus.COMPLETED,
          metadata: { flow: 'rent' },
        },
        {
          amount: 200,
          refundAmount: 0,
          currency: 'XLM',
          status: PaymentStatus.COMPLETED,
          metadata: { flow: 'escrow' },
        },
        {
          amount: 50,
          refundAmount: 0,
          currency: 'USDC',
          status: PaymentStatus.FAILED,
          metadata: { flow: 'rent' },
        },
      ] as unknown as Payment[]);

      const result = await service.getPaymentAnalytics('user-1');

      expect(result.totalPayments).toBe(3);
      expect(result.byCurrency['USDC'].count).toBe(2);
      expect(result.byCurrency['XLM'].count).toBe(1);
    });
  });

  // ─── Test isolation ──────────────────────────────────────────────────────

  describe('test isolation', () => {
    it('fresh mocks per test — no bleed from previous test', () => {
      // This test verifies that mocks start clean
      expect(paymentRepo.findOne).not.toHaveBeenCalled();
      expect(mockGateway.chargePayment).not.toHaveBeenCalled();
      expect(mockFraud.onPaymentRecorded).not.toHaveBeenCalled();
    });

    it('clearAllMocks resets call counts mid-test', async () => {
      paymentRepo.findOne.mockResolvedValue(null);
      paymentMethodRepo.findOne.mockResolvedValue({
        id: 'pm-1',
        userId: 'user-1',
        encryptedMetadata: null,
      });
      mockGateway.chargePayment.mockResolvedValue({
        success: true,
        chargeId: 'ch-1',
      });
      paymentRepo.create.mockImplementation(
        (d: Partial<Payment>) => d as Payment,
      );
      paymentRepo.save.mockResolvedValue({
        id: 'pay-1',
        amount: 100,
        currency: 'NGN',
        paymentMethod: 'card',
      } as Payment);

      await service.recordPayment(
        {
          agreementId: 'agr-1',
          amount: 100,
          paymentMethodId: 'pm-1',
        } as CreatePaymentRecordDto,
        'user-1',
      );

      expect(paymentRepo.save).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();

      expect(paymentRepo.save).toHaveBeenCalledTimes(0);
    });

    it('concurrent calls do not interfere with each other', async () => {
      // Both calls return null for idempotency check
      paymentRepo.findOne.mockResolvedValue(null);
      paymentMethodRepo.findOne.mockResolvedValue({
        id: 'pm-1',
        userId: 'user-1',
        encryptedMetadata: null,
      });
      mockGateway.chargePayment.mockResolvedValue({
        success: true,
        chargeId: 'ch-x',
      });
      paymentRepo.create.mockImplementation(
        (d: Partial<Payment>) => d as Payment,
      );
      paymentRepo.save
        .mockResolvedValueOnce({
          id: 'pay-A',
          amount: 100,
          currency: 'NGN',
          paymentMethod: 'card',
        } as Payment)
        .mockResolvedValueOnce({
          id: 'pay-B',
          amount: 200,
          currency: 'NGN',
          paymentMethod: 'card',
        } as Payment);

      const [r1, r2] = await Promise.all([
        service.recordPayment(
          {
            agreementId: 'agr-1',
            amount: 100,
            paymentMethodId: 'pm-1',
          } as CreatePaymentRecordDto,
          'user-1',
        ),
        service.recordPayment(
          {
            agreementId: 'agr-2',
            amount: 200,
            paymentMethodId: 'pm-1',
          } as CreatePaymentRecordDto,
          'user-1',
        ),
      ]);

      expect(r1.id).toBe('pay-A');
      expect(r2.id).toBe('pay-B');
    });
  });
});
