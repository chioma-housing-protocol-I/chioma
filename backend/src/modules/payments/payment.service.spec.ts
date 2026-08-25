import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PaymentService } from './payment.service';
import { Payment } from './entities/payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentGatewayService } from './payment-gateway.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentStatus } from './entities/payment.entity';
import { CreatePaymentRecordDto } from './dto/record-payment.dto';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { PaymentProcessingService } from '../stellar/services/payment-processing.service';
import { StellarService } from '../stellar/services/stellar.service';
import * as StellarSdk from '@stellar/stellar-sdk';
import { LockService } from '../../common/lock';
import { REDIS_CLIENT } from '../../common/lock/redis-client.token';
import { IdempotencyService } from '../../common/idempotency';
import { FraudHooksService } from '../fraud/fraud-hooks.service';
import {
  encryptMetadata,
  decryptMetadata,
  PAYMENT_STATUS_MAP,
} from './payment.helpers';

const mockPaymentRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockPaymentMethodRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockPaymentGateway = {
  chargePayment: jest.fn(),
  processRefund: jest.fn(),
  savePaymentMethod: jest.fn(),
};

const mockNotificationsService = {
  notify: jest.fn(),
};

const mockUsersService: { getUserById: jest.Mock } = {
  getUserById: jest.fn(),
};

const mockPaymentProcessingService = {
  processRentPayment: jest.fn(),
};

const mockStellarService = {
  createEscrow: jest.fn(),
  releaseEscrow: jest.fn(),
  refundEscrow: jest.fn(),
  getEscrowById: jest.fn(),
  getTransactionByHash: jest.fn(),
};

const mockLockService = {
  withLock: jest.fn(
    async (_key: string, _ttlMs: number, fn: () => Promise<unknown>) => fn(),
  ),
};

const mockIdempotencyService = {
  process: jest.fn(
    async (_key: string, _ttlMs: number, fn: () => Promise<unknown>) => fn(),
  ),
};

const mockFraudHooksService = {
  onPaymentRecorded: jest.fn().mockResolvedValue(undefined),
};

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepository: Repository<Payment>;
  let paymentMethodRepository: Repository<PaymentMethod>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getRepositoryToken(Payment),
          useFactory: mockPaymentRepository,
        },
        {
          provide: getRepositoryToken(PaymentMethod),
          useFactory: mockPaymentMethodRepository,
        },
        {
          provide: PaymentGatewayService,
          useValue: mockPaymentGateway,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: Object,
          useValue: mockUsersService,
        },
        {
          provide: PaymentProcessingService,
          useValue: mockPaymentProcessingService,
        },
        {
          provide: StellarService,
          useValue: mockStellarService,
        },
        {
          provide: LockService,
          useValue: mockLockService,
        },
        {
          provide: IdempotencyService,
          useValue: mockIdempotencyService,
        },
        {
          provide: FraudHooksService,
          useValue: mockFraudHooksService,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    paymentRepository = module.get<Repository<Payment>>(
      getRepositoryToken(Payment),
    );
    paymentMethodRepository = module.get<Repository<PaymentMethod>>(
      getRepositoryToken(PaymentMethod),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordPayment', () => {
    it('rejects payment amount that is Infinity', async () => {
      const dto = {
        agreementId: 'agreement_1',
        amount: Infinity,
        paymentMethodId: '1',
      } as CreatePaymentRecordDto;

      await expect(service.recordPayment(dto, 'user_1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.recordPayment(dto, 'user_1')).rejects.toThrow(
        'Payment amount must be a valid number',
      );
    });

    it('rejects payment amount that is NaN', async () => {
      const dto = {
        agreementId: 'agreement_1',
        amount: NaN,
        paymentMethodId: '1',
      } as CreatePaymentRecordDto;

      await expect(service.recordPayment(dto, 'user_1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.recordPayment(dto, 'user_1')).rejects.toThrow(
        'Payment amount must be a valid number',
      );
    });

    it('rejects payment amount that is zero or negative', async () => {
      const dto = {
        agreementId: 'agreement_1',
        amount: 0,
        paymentMethodId: '1',
      } as CreatePaymentRecordDto;

      await expect(service.recordPayment(dto, 'user_1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.recordPayment(dto, 'user_1')).rejects.toThrow(
        'Payment amount must be greater than 0',
      );
    });

    it('rejects payment amount exceeding maximum (999,999,999.99)', async () => {
      const dto = {
        agreementId: 'agreement_1',
        amount: 1000000000,
        paymentMethodId: '1',
      } as CreatePaymentRecordDto;

      await expect(service.recordPayment(dto, 'user_1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.recordPayment(dto, 'user_1')).rejects.toThrow(
        'Payment amount cannot exceed 999,999,999.99',
      );
    });

    it('rejects payment amount with more than 2 decimal places', async () => {
      const dto = {
        agreementId: 'agreement_1',
        amount: 100.123,
        paymentMethodId: '1',
      } as CreatePaymentRecordDto;

      await expect(service.recordPayment(dto, 'user_1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.recordPayment(dto, 'user_1')).rejects.toThrow(
        'Payment amount can have at most 2 decimal places',
      );
    });

    it('accepts payment amount with exactly 2 decimal places', async () => {
      (paymentRepository.findOne as jest.Mock).mockResolvedValue(null);
      (paymentMethodRepository.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 'user_1',
        encryptedMetadata: null,
      });
      mockUsersService.getUserById.mockResolvedValue({
        email: 'test@example.com',
      });
      mockPaymentGateway.chargePayment.mockResolvedValue({
        success: true,
        chargeId: 'charge_1',
      });

      (paymentRepository.create as jest.Mock).mockImplementation(
        (data: Partial<Payment>) => data as Payment,
      );
      (paymentRepository.save as jest.Mock).mockResolvedValue({
        id: 'pay_1',
        amount: 100.99,
        currency: 'NGN',
        paymentMethod: 'card',
      });

      const dto: CreatePaymentRecordDto = {
        agreementId: 'agreement_1',
        amount: 100.99,
        paymentMethodId: '1',
      };

      const result = await service.recordPayment(dto, 'user_1');
      expect(result.id).toBe('pay_1');
    });

    it('returns existing payment when idempotency key matches', async () => {
      const existingPayment = { id: 'pay_1' } as Payment;
      (paymentRepository.findOne as jest.Mock).mockResolvedValue(
        existingPayment,
      );

      const dto = {
        agreementId: 'agreement_1',
        amount: 100,
        paymentMethodId: '1',
        idempotencyKey: 'idem_1',
      } as CreatePaymentRecordDto & { idempotencyKey: string };

      const result = await service.recordPayment(dto, 'user_1');

      expect(result).toBe(existingPayment);
      const findOneSpy = jest.spyOn(paymentMethodRepository, 'findOne');
      expect(findOneSpy).not.toHaveBeenCalled();
    });

    it('records payment successfully', async () => {
      (paymentRepository.findOne as jest.Mock).mockResolvedValue(null);
      (paymentMethodRepository.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 'user_1',
        encryptedMetadata: null,
      });
      mockUsersService.getUserById.mockResolvedValue({
        email: 'test@example.com',
      });
      mockPaymentGateway.chargePayment.mockResolvedValue({
        success: true,
        chargeId: 'charge_1',
      });

      (paymentRepository.create as jest.Mock).mockImplementation(
        (data: Partial<Payment>) => data as Payment,
      );
      (paymentRepository.save as jest.Mock).mockResolvedValue({
        id: 'pay_1',
        amount: 100,
        currency: 'NGN',
        paymentMethod: 'card',
      });

      const dto: CreatePaymentRecordDto = {
        agreementId: 'agreement_1',
        amount: 100,
        paymentMethodId: '1',
      };

      const result = await service.recordPayment(dto, 'user_1');

      expect(result.id).toBe('pay_1');
      expect(mockNotificationsService.notify).toHaveBeenCalledWith(
        'user_1',
        'Payment received',
        expect.stringContaining('100'),
        'PAYMENT_RECEIVED',
      );
      expect(mockFraudHooksService.onPaymentRecorded).toHaveBeenCalledWith({
        userId: 'user_1',
        amount: 100,
        currency: 'NGN',
        paymentMethod: 'card',
      });
    });

    it('applies transaction fee and net amount calculation for rent payment', async () => {
      (paymentRepository.findOne as jest.Mock).mockResolvedValue(null);
      (paymentMethodRepository.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 'user_1',
        paymentType: 'bank_transfer',
        encryptedMetadata: null,
      });
      mockPaymentGateway.chargePayment.mockResolvedValue({
        success: true,
        chargeId: 'charge_fee_1',
      });
      (paymentRepository.create as jest.Mock).mockImplementation(
        (data: Partial<Payment>) => data as Payment,
      );
      (paymentRepository.save as jest.Mock).mockResolvedValue({
        id: 'pay_fee_1',
        amount: 250,
        currency: 'NGN',
        paymentMethod: 'bank_transfer',
      });

      await service.recordPayment(
        {
          agreementId: 'agreement_fee',
          amount: 250,
          paymentMethodId: '1',
        } as CreatePaymentRecordDto,
        'user_1',
      );

      expect(paymentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 250,
          transactionFee: 5,
          netAmount: 245,
          currency: 'NGN',
        }),
      );
    });

    it('throws when gateway fails and records failed payment', async () => {
      (paymentRepository.findOne as jest.Mock).mockResolvedValue(null);
      (paymentMethodRepository.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 'user_1',
      });
      mockUsersService.getUserById.mockResolvedValue({
        email: 'test@example.com',
      });
      mockPaymentGateway.chargePayment.mockResolvedValue({
        success: false,
        error: 'gateway error',
      });
      (paymentRepository.create as jest.Mock).mockImplementation(
        (data: Partial<Payment>) => data as Payment,
      );
      (paymentRepository.save as jest.Mock).mockResolvedValue({
        id: 'pay_failed',
      });

      const dto: CreatePaymentRecordDto = {
        agreementId: 'agreement_1',
        amount: 100,
        paymentMethodId: '1',
      };

      await expect(service.recordPayment(dto, 'user_1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      const saveSpy = jest.spyOn(paymentRepository, 'save');
      expect(saveSpy).toHaveBeenCalled();
      expect(mockNotificationsService.notify).toHaveBeenCalledWith(
        'user_1',
        'Payment failed',
        expect.stringContaining('100'),
        'PAYMENT_FAILED',
      );
    });
  });

  describe('concurrent recordPayment calls', () => {
    // These tests exercise the real LockService/IdempotencyService (in-memory
    // fallback, no Redis) instead of the pass-through mocks used above, so
    // that the @Locked + @Idempotent decorators on recordPayment actually
    // serialize concurrent calls and dedupe by idempotency key.
    let concurrentService: PaymentService;
    let concurrentPaymentRepository: ReturnType<typeof mockPaymentRepository>;
    let concurrentPaymentMethodRepository: ReturnType<
      typeof mockPaymentMethodRepository
    >;

    beforeEach(async () => {
      concurrentPaymentRepository = mockPaymentRepository();
      concurrentPaymentMethodRepository = mockPaymentMethodRepository();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaymentService,
          {
            provide: getRepositoryToken(Payment),
            useValue: concurrentPaymentRepository,
          },
          {
            provide: getRepositoryToken(PaymentMethod),
            useValue: concurrentPaymentMethodRepository,
          },
          { provide: PaymentGatewayService, useValue: mockPaymentGateway },
          { provide: NotificationsService, useValue: mockNotificationsService },
          { provide: Object, useValue: mockUsersService },
          {
            provide: PaymentProcessingService,
            useValue: mockPaymentProcessingService,
          },
          { provide: StellarService, useValue: mockStellarService },
          { provide: FraudHooksService, useValue: mockFraudHooksService },
          LockService,
          IdempotencyService,
          { provide: REDIS_CLIENT, useValue: null },
        ],
      }).compile();

      concurrentService = module.get<PaymentService>(PaymentService);

      concurrentPaymentMethodRepository.findOne.mockResolvedValue({
        id: 1,
        userId: 'user_1',
        encryptedMetadata: null,
      });
      mockUsersService.getUserById.mockResolvedValue({
        email: 'test@example.com',
      });
      mockPaymentGateway.chargePayment.mockResolvedValue({
        success: true,
        chargeId: 'charge_concurrent',
      });
      concurrentPaymentRepository.create.mockImplementation(
        (data: Partial<Payment>) => data as Payment,
      );
      concurrentPaymentRepository.save.mockResolvedValue({
        id: 'pay_concurrent',
        amount: 100,
        currency: 'NGN',
        paymentMethod: 'card',
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it.each([5, 10, 50])(
      'dedupes %i concurrent recordPayment calls sharing an idempotency key',
      async (concurrency) => {
        const dto = {
          agreementId: 'agreement_1',
          amount: 100,
          paymentMethodId: '1',
          idempotencyKey: 'idem_concurrent_1',
        } as CreatePaymentRecordDto & { idempotencyKey: string };

        const results = await Promise.all(
          Array.from({ length: concurrency }, () =>
            concurrentService.recordPayment(dto, 'user_1'),
          ),
        );

        expect(results).toHaveLength(concurrency);
        results.forEach((result) => {
          expect(result.id).toBe('pay_concurrent');
        });

        expect(mockPaymentGateway.chargePayment).toHaveBeenCalledTimes(1);
        expect(concurrentPaymentRepository.save).toHaveBeenCalledTimes(1);
      },
    );

    it('only records one payment when concurrent requests use different idempotency keys but the same payment method', async () => {
      const makeDto = (idempotencyKey: string) =>
        ({
          agreementId: 'agreement_1',
          amount: 100,
          paymentMethodId: '1',
          idempotencyKey,
        }) as CreatePaymentRecordDto & { idempotencyKey: string };

      const results = await Promise.all([
        concurrentService.recordPayment(makeDto('idem_a'), 'user_1'),
        concurrentService.recordPayment(makeDto('idem_a'), 'user_1'),
        concurrentService.recordPayment(makeDto('idem_b'), 'user_1'),
      ]);

      expect(results).toHaveLength(3);
      expect(mockPaymentGateway.chargePayment).toHaveBeenCalledTimes(2);
      expect(concurrentPaymentRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('createPaymentMethod', () => {
    it('creates payment method with encryption when sensitive metadata is provided', async () => {
      process.env.PAYMENT_METADATA_SECRET = 'test-secret';

      const dto: CreatePaymentMethodDto = {
        paymentType: 'CREDIT_CARD',
        lastFour: '1234',
        expiryDate: '2026-01-01',
        isDefault: true,
        sensitiveMetadata: { authorizationCode: 'auth_1' },
      };

      (paymentMethodRepository.update as jest.Mock).mockResolvedValue({});
      const createPaymentMethodMock = jest.spyOn(
        paymentMethodRepository,
        'create',
      );
      createPaymentMethodMock.mockImplementation(
        (data: Partial<PaymentMethod>) => data as PaymentMethod,
      );
      (paymentMethodRepository.save as jest.Mock).mockResolvedValue({
        id: 1,
        ...dto,
      });

      const result = await service.createPaymentMethod(dto, 'user_1');

      const updateSpy = jest.spyOn(paymentMethodRepository, 'update');
      expect(updateSpy).toHaveBeenCalled();
      expect(result.id).toBe(1);
      const [createdPaymentMethod] =
        createPaymentMethodMock.mock.calls[0] ?? [];
      expect(
        (createdPaymentMethod as Partial<PaymentMethod>)?.encryptedMetadata,
      ).toBeTruthy();
    });
  });

  describe('stellar gateway flows', () => {
    it('records stellar rent payment successfully', async () => {
      const tenantKeypair = StellarSdk.Keypair.random();
      mockPaymentProcessingService.processRentPayment.mockResolvedValue('tx_1');
      (paymentRepository.create as jest.Mock).mockImplementation(
        (data: Partial<Payment>) => data as Payment,
      );
      (paymentRepository.save as jest.Mock).mockResolvedValue({
        id: 'payment_xlm_1',
        status: PaymentStatus.COMPLETED,
        amount: 25.5,
        currency: 'XLM',
        paymentMethod: null,
      });

      const result = await service.processStellarRentPayment(
        {
          userAddress: tenantKeypair.publicKey(),
          userSecret: tenantKeypair.secret(),
          agreementId: 'agreement_1',
          amount: '25.5',
        },
        'user_1',
      );

      expect(result.id).toBe('payment_xlm_1');
      expect(
        mockPaymentProcessingService.processRentPayment,
      ).toHaveBeenCalled();
      expect(mockFraudHooksService.onPaymentRecorded).toHaveBeenCalledWith({
        userId: 'user_1',
        amount: 25.5,
        currency: 'XLM',
        paymentMethod: undefined,
      });
    });

    it('creates a stellar escrow deposit payment record', async () => {
      mockStellarService.createEscrow.mockResolvedValue({
        id: 9,
        status: 'ACTIVE',
        blockchainEscrowId: 'stellar_escrow_hash',
      });
      (paymentRepository.create as jest.Mock).mockImplementation(
        (data: Partial<Payment>) => data as Payment,
      );
      (paymentRepository.save as jest.Mock).mockResolvedValue({
        id: 'pay_escrow_1',
        referenceNumber: 'escrow:9',
      });

      const result = await service.createEscrowDeposit(
        {
          sourcePublicKey:
            'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
          destinationPublicKey:
            'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
          amount: '100',
          agreementId: 'agreement_2',
        },
        'user_1',
      );

      expect(result.referenceNumber).toBe('escrow:9');
      expect(mockStellarService.createEscrow).toHaveBeenCalled();
    });

    it('reconciles stellar escrow payments', async () => {
      (paymentRepository.find as jest.Mock).mockResolvedValue([
        {
          id: 'pay_1',
          userId: 'user_1',
          currency: 'XLM',
          status: PaymentStatus.PENDING,
          referenceNumber: 'escrow:7',
          metadata: { gateway: 'stellar', flow: 'escrow_deposit' },
        },
      ]);
      (paymentRepository.findOne as jest.Mock).mockResolvedValue({
        id: 'pay_1',
        userId: 'user_1',
        referenceNumber: 'escrow:7',
        metadata: { gateway: 'stellar', flow: 'escrow_deposit' },
      });
      mockStellarService.getEscrowById.mockResolvedValue({
        id: 7,
        status: 'RELEASED',
        releaseTransactionHash: 'release_hash',
        refundTransactionHash: null,
      });
      (paymentRepository.save as jest.Mock).mockResolvedValue({
        id: 'pay_1',
        status: PaymentStatus.COMPLETED,
      });

      const result = await service.reconcileStellarPayments('user_1', 10);

      expect(result.updated).toBe(1);
      expect(mockStellarService.getEscrowById).toHaveBeenCalledWith(7);
    });

    it('marks the payment as partially refunded after a partial escrow refund', async () => {
      mockStellarService.refundEscrow.mockResolvedValue({
        id: 7,
        status: 'ACTIVE',
        amount: '100.0000000',
        refundedAmount: '25.0000000',
        refundTransactionHash: 'partial_refund_hash',
      });
      (paymentRepository.findOne as jest.Mock).mockResolvedValue({
        id: 'pay_1',
        userId: 'user_1',
        referenceNumber: 'escrow:7',
        refundAmount: 0,
        metadata: { gateway: 'stellar', flow: 'escrow_deposit' },
      });
      (paymentRepository.save as jest.Mock).mockImplementation((payment) =>
        Promise.resolve(payment),
      );

      const result = await service.refundEscrowDeposit(
        7,
        { escrowId: 7, reason: 'damage deduction', amount: '25.0000000' },
        'user_1',
      );

      expect(mockStellarService.refundEscrow).toHaveBeenCalledWith({
        escrowId: 7,
        reason: 'damage deduction',
        amount: '25.0000000',
      });
      expect(result?.status).toBe(PaymentStatus.PARTIAL_REFUND);
      expect(result?.refundAmount).toBe(25);
      expect(result?.metadata).toMatchObject({
        refundedToDate: '25.0000000',
        refundTransactionHash: 'partial_refund_hash',
      });
    });

    it('marks the payment refunded after a full escrow refund', async () => {
      mockStellarService.refundEscrow.mockResolvedValue({
        id: 7,
        status: 'REFUNDED',
        amount: '100.0000000',
        refundedAmount: '100.0000000',
        refundTransactionHash: 'full_refund_hash',
      });
      (paymentRepository.findOne as jest.Mock).mockResolvedValue({
        id: 'pay_1',
        userId: 'user_1',
        referenceNumber: 'escrow:7',
        refundAmount: 0,
        metadata: { gateway: 'stellar', flow: 'escrow_deposit' },
      });
      (paymentRepository.save as jest.Mock).mockImplementation((payment) =>
        Promise.resolve(payment),
      );

      const result = await service.refundEscrowDeposit(
        7,
        { escrowId: 7, reason: 'full refund' },
        'user_1',
      );

      expect(result?.status).toBe(PaymentStatus.REFUNDED);
      expect(result?.refundAmount).toBe(100);
    });

    it('retries failed payments that still have a payment method', async () => {
      (paymentRepository.find as jest.Mock).mockResolvedValue([
        {
          id: 'pay_1',
          userId: 'user_1',
          status: PaymentStatus.FAILED,
          amount: 150,
          paymentMethodRelationId: 2,
          agreementId: 'agreement_1',
          referenceNumber: 'ref_1',
          metadata: {},
        },
      ]);
      const recordSpy = jest
        .spyOn(service, 'recordPayment')
        .mockResolvedValue({ id: 'retry_success' } as Payment);
      (paymentRepository.save as jest.Mock).mockResolvedValue({
        id: 'pay_1',
        metadata: { retryAttempts: 1 },
      });

      const result = await service.retryFailedPayments('user_1', 10);

      expect(result.retried).toBe(1);
      expect(recordSpy).toHaveBeenCalled();
    });

    it('builds payment analytics summary', async () => {
      (paymentRepository.find as jest.Mock).mockResolvedValue([
        {
          amount: 10,
          refundAmount: 0,
          currency: 'XLM',
          status: PaymentStatus.COMPLETED,
          metadata: { flow: 'rent' },
        },
        {
          amount: 5,
          refundedAmount: 2,
          currency: 'NGN',
          status: PaymentStatus.FAILED,
          metadata: { flow: 'gateway' },
        },
      ]);

      const result = await service.getPaymentAnalytics('user_1');

      expect(result.totalPayments).toBe(2);
      expect(result.byFlow.rent).toBe(1);
      expect(result.byCurrency.XLM.count).toBe(1);
    });
  });

  describe('handlePaymentGatewayWebhook', () => {
    it('rejects webhook when PAYMENT_WEBHOOK_SECRET is not configured (fail-closed)', async () => {
      const originalEnv = process.env.PAYMENT_WEBHOOK_SECRET;
      delete process.env.PAYMENT_WEBHOOK_SECRET;

      await expect(
        service.handlePaymentGatewayWebhook(
          {
            eventType: 'payment.completed',
            paymentId: 'pay_1',
            status: 'completed',
          },
          'any-secret',
        ),
      ).rejects.toThrow(UnauthorizedException);

      process.env.PAYMENT_WEBHOOK_SECRET = originalEnv;
    });

    it('rejects webhook with incorrect secret', async () => {
      process.env.PAYMENT_WEBHOOK_SECRET = 'correct-secret';

      await expect(
        service.handlePaymentGatewayWebhook(
          {
            eventType: 'payment.completed',
            paymentId: 'pay_1',
            status: 'completed',
          },
          'wrong-secret',
        ),
      ).rejects.toThrow(UnauthorizedException);

      delete process.env.PAYMENT_WEBHOOK_SECRET;
    });
  });
  describe('encryptMetadata / decryptMetadata round-trip', () => {
    let originalSecret: string | undefined;

    beforeAll(() => {
      originalSecret = process.env.PAYMENT_METADATA_SECRET;
    });

    beforeEach(() => {
      process.env.PAYMENT_METADATA_SECRET = 'test-secret-key-123456';
    });

    afterAll(() => {
      process.env.PAYMENT_METADATA_SECRET = originalSecret;
    });

    it('successfully round-trips standard metadata and verifies data integrity', () => {
      const testData = {
        orderId: '12345',
        amount: 100,
        isProcessed: true,
      };

      const encrypted = encryptMetadata(testData);
      expect(encrypted).toBeDefined();
      expect(encrypted).toContain(':');

      const decrypted = decryptMetadata(encrypted);
      expect(decrypted).toEqual(testData);
    });

    it('supports various metadata data types', () => {
      const testData = {
        stringProp: 'hello',
        numberProp: 99.99,
        boolProp: false,
        arrayProp: [1, 'two', { nested: true }],
        objectProp: { key: 'val', list: [1, 2] },
      };

      const encrypted = encryptMetadata(testData);
      const decrypted = decryptMetadata(encrypted);
      expect(decrypted).toEqual(testData);
    });

    it('handles unicode characters in metadata correctly', () => {
      const testData = {
        message:
          'Unicode test: 🌟 Emoji, 🚀 Rocket, Chinese: 中文, Arabic: العربية',
      };

      const encrypted = encryptMetadata(testData);
      const decrypted = decryptMetadata(encrypted);
      expect(decrypted).toEqual(testData);
    });

    it('handles empty payload inputs gracefully', () => {
      expect(decryptMetadata(null)).toBeNull();
      expect(decryptMetadata('')).toBeNull();
    });

    it('handles invalid format payload inputs gracefully', () => {
      expect(decryptMetadata('invalidpayload')).toBeNull();
      expect(decryptMetadata('one:two')).toBeNull();
    });

    it('handles large metadata payloads', () => {
      const testData: Record<string, string> = {};
      for (let i = 0; i < 500; i++) {
        testData[`key_${i}`] = `value_long_string_to_make_it_large_${i}`;
      }

      const encrypted = encryptMetadata(testData);
      const decrypted = decryptMetadata(encrypted);
      expect(decrypted).toEqual(testData);
    });

    it('throws an error if encryption is attempted without secret configured', () => {
      delete process.env.PAYMENT_METADATA_SECRET;

      expect(() => encryptMetadata({ foo: 'bar' })).toThrow(
        BadRequestException,
      );
    });

    it('returns null if decryption is attempted without secret configured', () => {
      const encrypted = encryptMetadata({ foo: 'bar' });
      delete process.env.PAYMENT_METADATA_SECRET;

      expect(decryptMetadata(encrypted)).toBeNull();
    });

    it('throws an error during decryption when ciphertext or authentication tag is corrupted', () => {
      const encrypted = encryptMetadata({ sensitive: 'data' });
      const parts = encrypted.split(':');

      // Corrupt the ciphertext part (last part)
      parts[2] = parts[2].substring(0, parts[2].length - 2) + '00';
      const corruptedCiphertext = parts.join(':');

      expect(() => decryptMetadata(corruptedCiphertext)).toThrow();

      // Corrupt the auth tag part (middle part)
      const parts2 = encrypted.split(':');
      parts2[1] = parts2[1].substring(0, parts2[1].length - 2) + '00';
      const corruptedTag = parts2.join(':');

      expect(() => decryptMetadata(corruptedTag)).toThrow();
    });

    it('throws an error during decryption if the secret key changes', () => {
      const encrypted = encryptMetadata({ sensitive: 'data' });
      process.env.PAYMENT_METADATA_SECRET = 'different-secret-key-456';

      expect(() => decryptMetadata(encrypted)).toThrow();
    });
  });

  describe('PAYMENT_STATUS_MAP', () => {
    it('maps payment gateway webhook statuses to PaymentStatus', () => {
      expect(PAYMENT_STATUS_MAP['completed']).toBe(PaymentStatus.COMPLETED);
      expect(PAYMENT_STATUS_MAP['successful']).toBe(PaymentStatus.COMPLETED);
      expect(PAYMENT_STATUS_MAP['success']).toBe(PaymentStatus.COMPLETED);
      expect(PAYMENT_STATUS_MAP['pending']).toBe(PaymentStatus.PENDING);
      expect(PAYMENT_STATUS_MAP['processing']).toBe(PaymentStatus.PENDING);
      expect(PAYMENT_STATUS_MAP['failed']).toBe(PaymentStatus.FAILED);
      expect(PAYMENT_STATUS_MAP['error']).toBe(PaymentStatus.FAILED);
      expect(PAYMENT_STATUS_MAP['cancelled']).toBe(PaymentStatus.FAILED);
      expect(PAYMENT_STATUS_MAP['refunded']).toBe(PaymentStatus.REFUNDED);
    });

    it('maps escrow states to PaymentStatus', () => {
      expect(PAYMENT_STATUS_MAP['active']).toBe(PaymentStatus.PENDING);
      expect(PAYMENT_STATUS_MAP['released']).toBe(PaymentStatus.COMPLETED);
      expect(PAYMENT_STATUS_MAP['refunded']).toBe(PaymentStatus.REFUNDED);
      expect(PAYMENT_STATUS_MAP['failed']).toBe(PaymentStatus.FAILED);
      expect(PAYMENT_STATUS_MAP['expired']).toBe(PaymentStatus.FAILED);
    });

    it('has no unknown status key', () => {
      expect(PAYMENT_STATUS_MAP['unknown-status']).toBeUndefined();
    });
  });
});
