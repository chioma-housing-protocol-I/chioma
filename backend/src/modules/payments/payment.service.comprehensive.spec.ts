/**
 * Comprehensive PaymentService tests
 * Covers edge cases, error scenarios, and test isolation
 * that complement the existing payment.service.spec.ts
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentGatewayService } from './payment-gateway.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePaymentRecordDto } from './dto/record-payment.dto';
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

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('PaymentService – edge cases & isolation', () => {
  let service: PaymentService;
  let paymentRepo: ReturnType<typeof makePaymentRepo>;
  let paymentMethodRepo: ReturnType<typeof makePaymentMethodRepo>;
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
        { provide: PaymentGatewayService, useValue: mockGateway },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: Object, useValue: { getUserById: jest.fn() } },
        { provide: PaymentProcessingService, useValue: mockPaymentProcessing },
        { provide: StellarService, useValue: mockStellar },
        { provide: LockService, useValue: mockLock },
        { provide: IdempotencyService, useValue: mockIdempotency },
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
