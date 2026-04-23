import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PaymentService } from './payment.service';
import { Payment } from './entities/payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import {
  PaymentSchedule,
  PaymentScheduleStatus,
} from './entities/payment-schedule.entity';
import { PaymentGatewayService } from './payment-gateway.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentStatus } from './entities/payment.entity';
import { CreatePaymentRecordDto } from './dto/record-payment.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { CreatePaymentScheduleDto } from './dto/create-payment-schedule.dto';
import { PaymentInterval } from './entities/payment-schedule.entity';
import { PaymentProcessingService } from '../stellar/services/payment-processing.service';
import { StellarService } from '../stellar/services/stellar.service';
import * as StellarSdk from '@stellar/stellar-sdk';
import { LockService } from '../../common/lock';
import { IdempotencyService } from '../../common/idempotency';
import { FraudHooksService } from '../fraud/fraud-hooks.service';

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

const mockPaymentScheduleRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
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

// DataSource mock — transaction() runs the callback with a mock entity manager.
const mockEntityManager = {
  findOne: jest.fn(),
  save: jest.fn(),
};
const mockDataSource = {
  transaction: jest.fn(
    (cb: (em: typeof mockEntityManager) => Promise<unknown>) =>
      cb(mockEntityManager),
  ),
};

const mockFraudHooksService = {
  onPaymentRecorded: jest.fn().mockResolvedValue(undefined),
};

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepository: Repository<Payment>;
  let paymentMethodRepository: Repository<PaymentMethod>;
  let paymentScheduleRepository: Repository<PaymentSchedule>;

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
          provide: getRepositoryToken(PaymentSchedule),
          useFactory: mockPaymentScheduleRepository,
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
          provide: DataSource,
          useValue: mockDataSource,
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
    paymentScheduleRepository = module.get<Repository<PaymentSchedule>>(
      getRepositoryToken(PaymentSchedule),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordPayment', () => {
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

  describe('processRefund', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('throws when payment is not found', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      await expect(
        service.processRefund(
          'pay_1',
          { amount: 10, reason: 'test' },
          'user_1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('processes refund successfully using pessimistic lock transaction', async () => {
      const payment = {
        id: 'pay_1',
        userId: 'user_1',
        status: PaymentStatus.COMPLETED,
        amount: 100,
        refundAmount: 0,
        currency: 'NGN',
        metadata: { chargeId: 'charge_1' },
        user: {} as any,
        agreementId: null,
        transactionFee: 0,
        netAmount: 100,
        paymentMethod: null,
        paymentMethodRelation: null,
        paymentMethodRelationId: null,
        receiptUrl: '',
        referenceNumber: null,
        processedAt: new Date(),
        idempotencyKey: null,
        refundStatus: 'none',
        refundReason: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Payment;

      mockEntityManager.findOne.mockResolvedValue(payment);
      mockPaymentGateway.processRefund.mockResolvedValue({
        success: true,
        refundId: 'refund_1',
      });
      mockEntityManager.save.mockResolvedValue({
        ...payment,
        status: PaymentStatus.REFUNDED,
        refundAmount: 100,
      });

      const dto: ProcessRefundDto = { amount: 100, reason: 'test' };
      const result = await service.processRefund('pay_1', dto, 'user_1');

      // Verify pessimistic lock was requested.
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(
        Payment,
        expect.objectContaining({
          lock: { mode: 'pessimistic_write' },
        }),
      );
      expect(result.status).toBe(PaymentStatus.REFUNDED);
      expect(mockNotificationsService.notify).toHaveBeenCalledWith(
        'user_1',
        'Refund processed',
        expect.stringContaining('100'),
        'PAYMENT_REFUNDED',
      );
    });

    it('throws when refund amount exceeds available amount', async () => {
      const payment = {
        id: 'pay_1',
        userId: 'user_1',
        status: PaymentStatus.COMPLETED,
        amount: 50,
        refundAmount: 0,
        metadata: { chargeId: 'charge_1' },
      } as unknown as Payment;

      mockEntityManager.findOne.mockResolvedValue(payment);

      await expect(
        service.processRefund(
          'pay_1',
          { amount: 100, reason: 'over' },
          'user_1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when charge id is missing', async () => {
      const payment = {
        id: 'pay_1',
        userId: 'user_1',
        status: PaymentStatus.COMPLETED,
        amount: 100,
        refundAmount: 0,
        metadata: {},
        currency: 'NGN',
      } as unknown as Payment;

      mockEntityManager.findOne.mockResolvedValue(payment);

      await expect(
        service.processRefund(
          'pay_1',
          { amount: 10, reason: 'test' },
          'user_1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('prevents double-refund: second concurrent call sees updated refundAmount', async () => {
      // Simulate the state after a first refund has already been applied.
      const alreadyRefunded = {
        id: 'pay_1',
        userId: 'user_1',
        status: PaymentStatus.REFUNDED,
        amount: 100,
        refundAmount: 100,
        metadata: { chargeId: 'charge_1' },
      } as unknown as Payment;

      mockEntityManager.findOne.mockResolvedValue(alreadyRefunded);

      await expect(
        service.processRefund('pay_1', { amount: 1, reason: 'dup' }, 'user_1'),
      ).rejects.toBeInstanceOf(BadRequestException);
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

  describe('createPaymentSchedule', () => {
    it('creates payment schedule successfully', async () => {
      const dto: CreatePaymentScheduleDto = {
        agreementId: 'agreement_1',
        paymentMethodId: '1',
        amount: 100,
        interval: PaymentInterval.MONTHLY,
      };

      (paymentMethodRepository.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 'user_1',
      });
      const createScheduleMock = jest.spyOn(
        paymentScheduleRepository,
        'create',
      );
      createScheduleMock.mockImplementation(
        (data: Partial<PaymentSchedule>) => data as PaymentSchedule,
      );
      (paymentScheduleRepository.save as jest.Mock).mockResolvedValue({
        id: 'schedule_1',
        ...dto,
      });

      const result = await service.createPaymentSchedule(dto, 'user_1');

      expect(result.id).toBe('schedule_1');
      const [createdSchedule] = createScheduleMock.mock.calls[0] ?? [];
      expect((createdSchedule as Partial<PaymentSchedule>)?.status).toBe(
        PaymentScheduleStatus.ACTIVE,
      );
    });
  });

  describe('runPaymentSchedule', () => {
    it('throws when schedule is not active', async () => {
      const schedule = {
        id: 'schedule_1',
        userId: 'user_1',
        status: PaymentScheduleStatus.PAUSED,
      } as PaymentSchedule;

      (paymentScheduleRepository.findOne as jest.Mock).mockResolvedValue(
        schedule,
      );

      await expect(
        service.runPaymentSchedule('schedule_1', 'user_1'),
      ).rejects.toBeInstanceOf(BadRequestException);
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

    it('updates payment from webhook event', async () => {
      (paymentRepository.findOne as jest.Mock).mockResolvedValue({
        id: 'pay_1',
        status: PaymentStatus.PENDING,
        metadata: {},
      });
      (paymentRepository.save as jest.Mock).mockResolvedValue({
        id: 'pay_1',
        status: PaymentStatus.COMPLETED,
      });

      const result = await service.handlePaymentGatewayWebhook({
        eventType: 'payment.completed',
        paymentId: 'pay_1',
        status: 'completed',
        transactionHash: 'tx_complete',
      });

      expect(result.processed).toBe(true);
      expect((result.payment as Payment).status).toBe(PaymentStatus.COMPLETED);
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
});
