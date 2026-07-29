/**
 * Error scenario coverage for major payment-module services (#1391).
 *
 * Covers network failures, timeouts, invalid data, recovery/retry, and
 * helpful error messages across PaymentService, RefundService, and
 * PaymentWebhookService.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PaymentService } from './payment.service';
import { RefundService } from './refund.service';
import { PaymentWebhookService } from './payment-webhook.service';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentGatewayService } from './payment-gateway.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentProcessingService } from '../stellar/services/payment-processing.service';
import { StellarService } from '../stellar/services/stellar.service';
import { LockService } from '../../common/lock';
import { IdempotencyService } from '../../common/idempotency';
import { FraudHooksService } from '../fraud/fraud-hooks.service';
import { REDIS_CLIENT } from '../../common/lock/redis-client.token';
import { CreatePaymentRecordDto } from './dto/record-payment.dto';
import { RetryService } from '../../common/services/retry.service';
import {
  MaxRetriesExceededError,
  NetworkError,
  TimeoutError,
} from '../../common/errors/retry-errors';

describe('Payment module error scenarios', () => {
  describe('PaymentService – invalid data & gateway failures', () => {
    let service: PaymentService;
    let paymentRepository: {
      findOne: jest.Mock;
      create: jest.Mock;
      save: jest.Mock;
      createQueryBuilder: jest.Mock;
    };
    let paymentMethodRepository: { findOne: jest.Mock };
    let mockGateway: { chargePayment: jest.Mock };
    let mockNotifications: { notify: jest.Mock };

    beforeEach(async () => {
      paymentRepository = {
        findOne: jest.fn(),
        create: jest.fn((d) => d),
        save: jest.fn(async (d) => ({ id: 'pay_err', ...d })),
        createQueryBuilder: jest.fn(),
      };
      paymentMethodRepository = {
        findOne: jest.fn().mockResolvedValue({
          id: 1,
          userId: 'user_1',
          encryptedMetadata: null,
        }),
      };
      mockGateway = { chargePayment: jest.fn() };
      mockNotifications = { notify: jest.fn().mockResolvedValue(undefined) };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaymentService,
          {
            provide: getRepositoryToken(Payment),
            useValue: paymentRepository,
          },
          {
            provide: getRepositoryToken(PaymentMethod),
            useValue: paymentMethodRepository,
          },
          { provide: PaymentGatewayService, useValue: mockGateway },
          { provide: NotificationsService, useValue: mockNotifications },
          {
            provide: PaymentProcessingService,
            useValue: { processRentPayment: jest.fn() },
          },
          {
            provide: StellarService,
            useValue: {
              createEscrow: jest.fn(),
              releaseEscrow: jest.fn(),
              refundEscrow: jest.fn(),
              getEscrowById: jest.fn(),
              getTransactionByHash: jest.fn(),
            },
          },
          {
            provide: FraudHooksService,
            useValue: {
              onPaymentRecorded: jest.fn().mockResolvedValue(undefined),
            },
          },
          LockService,
          IdempotencyService,
          { provide: REDIS_CLIENT, useValue: null },
        ],
      }).compile();

      service = module.get(PaymentService);
    });

    it('rejects missing userId with a clear validation error', async () => {
      await expect(
        service.recordPayment(
          {
            agreementId: 'a1',
            amount: 10,
            paymentMethodId: '1',
          } as CreatePaymentRecordDto,
          '',
        ),
      ).rejects.toThrow(/user/i);
    });

    it('rejects invalid (non-positive) payment amounts helpfully', async () => {
      await expect(
        service.recordPayment(
          {
            agreementId: 'a1',
            amount: 0,
            paymentMethodId: '1',
          } as CreatePaymentRecordDto,
          'user_1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('surfaces gateway charge failure without crashing notifications', async () => {
      mockGateway.chargePayment.mockResolvedValue({
        success: false,
        error: 'card_declined',
      });

      await expect(
        service.recordPayment(
          {
            agreementId: 'a1',
            amount: 50,
            paymentMethodId: '1',
            idempotencyKey: 'idem_fail_1',
          } as CreatePaymentRecordDto & { idempotencyKey: string },
          'user_1',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockNotifications.notify).toHaveBeenCalledWith(
        'user_1',
        'Payment failed',
        expect.stringContaining('50'),
        'PAYMENT_FAILED',
      );
      expect(paymentRepository.save).toHaveBeenCalled();
    });

    it('propagates gateway network errors so callers can retry', async () => {
      mockGateway.chargePayment.mockRejectedValue(
        new NetworkError('ECONNRESET from gateway'),
      );

      await expect(
        service.recordPayment(
          {
            agreementId: 'a1',
            amount: 50,
            paymentMethodId: '1',
            idempotencyKey: 'idem_net_1',
          } as CreatePaymentRecordDto & { idempotencyKey: string },
          'user_1',
        ),
      ).rejects.toBeInstanceOf(NetworkError);
    });

    it('returns NotFoundException with a helpful message for missing payments', async () => {
      paymentRepository.findOne.mockResolvedValue(null);
      await expect(service.getPaymentById('missing', 'user_1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getPaymentById('missing', 'user_1')).rejects.toThrow(
        'Payment not found',
      );
    });
  });

  describe('RefundService – failure modes & recovery messaging', () => {
    let service: RefundService;
    const mockEntityManager = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    const mockDataSource = {
      options: { type: 'postgres' },
      transaction: jest.fn(
        (cb: (em: typeof mockEntityManager) => Promise<unknown>) =>
          cb(mockEntityManager),
      ),
    };
    const mockGateway = { processRefund: jest.fn() };
    const mockNotifications = { notify: jest.fn() };

    beforeEach(async () => {
      jest.clearAllMocks();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RefundService,
          { provide: PaymentGatewayService, useValue: mockGateway },
          { provide: NotificationsService, useValue: mockNotifications },
          { provide: DataSource, useValue: mockDataSource },
        ],
      }).compile();
      service = module.get(RefundService);
    });

    it('rejects refunds when chargeId metadata is missing with actionable message', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        id: 'pay_1',
        userId: 'user_1',
        status: PaymentStatus.COMPLETED,
        amount: 100,
        refundAmount: 0,
        metadata: {},
      });

      await expect(
        service.processRefund(
          'pay_1',
          { amount: 10, reason: 'test' },
          'user_1',
        ),
      ).rejects.toThrow(/no gateway charge ID/i);
    });

    it('rejects refund amounts that exceed the remaining balance', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        id: 'pay_1',
        userId: 'user_1',
        status: PaymentStatus.COMPLETED,
        amount: 100,
        refundAmount: 80,
        metadata: { chargeId: 'ch_1' },
      });

      await expect(
        service.processRefund(
          'pay_1',
          { amount: 50, reason: 'too much' },
          'user_1',
        ),
      ).rejects.toThrow(/exceeds available amount/i);
    });

    it('maps gateway refund failure to a clear BadRequestException', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        id: 'pay_1',
        userId: 'user_1',
        status: PaymentStatus.COMPLETED,
        amount: 100,
        refundAmount: 0,
        metadata: { chargeId: 'ch_1' },
      });
      mockGateway.processRefund.mockResolvedValue({ success: false });

      await expect(
        service.processRefund(
          'pay_1',
          { amount: 10, reason: 'test' },
          'user_1',
        ),
      ).rejects.toThrow('Refund processing failed');
    });

    it('propagates gateway timeout errors for upstream retry', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        id: 'pay_1',
        userId: 'user_1',
        status: PaymentStatus.COMPLETED,
        amount: 100,
        refundAmount: 0,
        currency: 'USD',
        metadata: { chargeId: 'ch_1' },
      });
      mockGateway.processRefund.mockRejectedValue(
        new TimeoutError('gateway timeout'),
      );

      await expect(
        service.processRefund(
          'pay_1',
          { amount: 10, reason: 'test' },
          'user_1',
        ),
      ).rejects.toBeInstanceOf(TimeoutError);
    });
  });

  describe('PaymentWebhookService – auth & invalid payloads', () => {
    let service: PaymentWebhookService;
    let paymentRepository: { findOne: jest.Mock; save: jest.Mock };

    beforeEach(async () => {
      paymentRepository = { findOne: jest.fn(), save: jest.fn() };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaymentWebhookService,
          {
            provide: getRepositoryToken(Payment),
            useValue: paymentRepository,
          },
          {
            provide: IdempotencyService,
            useValue: {
              process: jest.fn(
                async (
                  _key: string,
                  _ttlMs: number,
                  fn: () => Promise<unknown>,
                ) => fn(),
              ),
            },
          },
        ],
      }).compile();
      service = module.get(PaymentWebhookService);
      delete process.env.PAYMENT_WEBHOOK_SECRET;
    });

    it('rejects invalid webhook secrets with UnauthorizedException', async () => {
      process.env.PAYMENT_WEBHOOK_SECRET = 'real-secret';
      await expect(
        service.handlePaymentGatewayWebhook(
          {
            eventType: 'payment.completed',
            paymentId: 'pay_1',
            status: 'completed',
          },
          'bad-secret',
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(paymentRepository.findOne).not.toHaveBeenCalled();
    });

    it('rejects invalid webhook JSON with a helpful BadRequestException', async () => {
      await expect(
        service.handlePaymentGatewayWebhook({ status: 'completed' }),
      ).rejects.toThrow(/Invalid payment webhook payload/);
    });
  });

  describe('RetryService recovery for payment-like network failures', () => {
    let retry: RetryService;

    beforeEach(() => {
      jest.useFakeTimers();
      retry = new RetryService();
      retry.resetStats();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('recovers after transient NetworkError then succeeds', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError('flaky'))
        .mockResolvedValue({ ok: true });

      const promise = retry.execute(fn, {
        maxAttempts: 3,
        delay: 10,
        backoff: 'linear',
        backoffMultiplier: 1,
      });
      await jest.runAllTimersAsync();
      await expect(promise).resolves.toEqual({ ok: true });
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('exhausts retries on persistent TimeoutError with MaxRetriesExceededError', async () => {
      const fn = jest
        .fn()
        .mockRejectedValue(new TimeoutError('still timing out'));
      const promise = retry.execute(fn, {
        maxAttempts: 3,
        delay: 5,
        backoff: 'linear',
        backoffMultiplier: 1,
      });
      const assertion = expect(promise).rejects.toBeInstanceOf(
        MaxRetriesExceededError,
      );
      await jest.runAllTimersAsync();
      await assertion;
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });
});
