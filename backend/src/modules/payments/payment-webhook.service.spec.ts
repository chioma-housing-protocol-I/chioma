import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentWebhookService } from './payment-webhook.service';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { IdempotencyService } from '../../common/idempotency';

const mockPaymentRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
});

describe('PaymentWebhookService', () => {
  let service: PaymentWebhookService;
  let paymentRepository: ReturnType<typeof mockPaymentRepository>;
  let idempotencyService: {
    process: jest.Mock;
    retrieve: jest.Mock;
    store: jest.Mock;
    claim: jest.Mock;
    releaseClaim: jest.Mock;
  };
  let originalSecret: string | undefined;

  beforeAll(() => {
    originalSecret = process.env.PAYMENT_WEBHOOK_SECRET;
  });

  afterAll(() => {
    process.env.PAYMENT_WEBHOOK_SECRET = originalSecret;
  });

  beforeEach(async () => {
    idempotencyService = {
      process: jest.fn(
        async (_key: string, _ttlMs: number, fn: () => Promise<unknown>) =>
          fn(),
      ),
      retrieve: jest.fn().mockResolvedValue(null),
      store: jest.fn().mockResolvedValue(undefined),
      claim: jest.fn().mockResolvedValue('claim-token'),
      releaseClaim: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentWebhookService,
        {
          provide: getRepositoryToken(Payment),
          useFactory: mockPaymentRepository,
        },
        {
          provide: IdempotencyService,
          useValue: idempotencyService,
        },
      ],
    }).compile();

    service = module.get<PaymentWebhookService>(PaymentWebhookService);
    paymentRepository = module.get(getRepositoryToken(Payment));
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.PAYMENT_WEBHOOK_SECRET;
  });

  describe('secret validation', () => {
    it('accepts the webhook when the secret header matches the configured secret', async () => {
      process.env.PAYMENT_WEBHOOK_SECRET = 'configured-secret';
      paymentRepository.findOne.mockResolvedValue({
        id: 'pay_1',
        status: PaymentStatus.PENDING,
        metadata: {},
      });
      paymentRepository.save.mockResolvedValue({
        id: 'pay_1',
        status: PaymentStatus.COMPLETED,
      });

      const result = await service.handlePaymentGatewayWebhook(
        {
          eventType: 'payment.completed',
          paymentId: 'pay_1',
          status: 'completed',
        },
        'configured-secret',
      );

      expect(result.processed).toBe(true);
    });

    it('rejects the webhook when the secret header does not match the configured secret', async () => {
      process.env.PAYMENT_WEBHOOK_SECRET = 'configured-secret';

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
      expect(paymentRepository.findOne).not.toHaveBeenCalled();
    });

    it('accepts missing legacy secret header because HMAC guard validates signatures', async () => {
      process.env.PAYMENT_WEBHOOK_SECRET = 'configured-secret';
      paymentRepository.findOne.mockResolvedValue({
        id: 'pay_1',
        status: PaymentStatus.PENDING,
        metadata: {},
      });
      paymentRepository.save.mockResolvedValue({
        id: 'pay_1',
        status: PaymentStatus.COMPLETED,
      });

      const result = await service.handlePaymentGatewayWebhook({
        eventType: 'payment.completed',
        paymentId: 'pay_1',
        status: 'completed',
      });

      expect(result.processed).toBe(true);
    });
  });

  describe('zod DTO validation', () => {
    it('rejects malformed payment webhook bodies before DB access', async () => {
      await expect(
        service.handlePaymentGatewayWebhook({
          eventType: 'payment.completed',
          status: 'completed',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(paymentRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('handlePaymentGatewayWebhook', () => {
    it('updates payment from webhook event', async () => {
      paymentRepository.findOne.mockResolvedValue({
        id: 'pay_1',
        status: PaymentStatus.PENDING,
        metadata: {},
      });
      paymentRepository.save.mockResolvedValue({
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

    it('returns processed: false when the payment cannot be found', async () => {
      paymentRepository.findOne.mockResolvedValue(null);

      const result = await service.handlePaymentGatewayWebhook({
        eventType: 'payment.completed',
        paymentId: 'missing',
        status: 'completed',
      });

      expect(result).toEqual({ processed: false, reason: 'payment_not_found' });
      expect(paymentRepository.save).not.toHaveBeenCalled();
    });

    it('looks up the payment by referenceNumber when paymentId is not provided', async () => {
      paymentRepository.findOne.mockResolvedValue({
        id: 'pay_2',
        status: PaymentStatus.PENDING,
        metadata: {},
      });
      paymentRepository.save.mockImplementation((p) => Promise.resolve(p));

      await service.handlePaymentGatewayWebhook({
        eventType: 'payment.failed',
        referenceNumber: 'ref-123',
        status: 'failed',
      });

      expect(paymentRepository.findOne).toHaveBeenCalledWith({
        where: { referenceNumber: 'ref-123' },
      });
    });

    it('maps unknown webhook status values to PENDING', async () => {
      paymentRepository.findOne.mockResolvedValue({
        id: 'pay_3',
        status: PaymentStatus.PENDING,
        metadata: {},
      });
      paymentRepository.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.handlePaymentGatewayWebhook({
        eventType: 'payment.unknown',
        paymentId: 'pay_3',
        status: 'some-unrecognized-status',
      });

      expect((result.payment as Payment).status).toBe(PaymentStatus.PENDING);
    });
  });

  describe('handleRefundWebhook', () => {
    it('marks a payment as refunded from a refund webhook', async () => {
      paymentRepository.findOne.mockResolvedValue({
        id: 'pay_1',
        amount: 100,
        refundAmount: 0,
        status: PaymentStatus.COMPLETED,
        metadata: {},
      });
      paymentRepository.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.handleRefundWebhook({
        eventType: 'refund.completed',
        idempotencyKey: '0f7b87dd-c76d-4f24-a4d6-8c0dc5ad5a6d',
        timestamp: new Date().toISOString(),
        paymentId: 'pay_1',
        refundId: 're_1',
        amount: 100,
        status: 'completed',
      });

      expect(result.processed).toBe(true);
      expect((result.payment as Payment).status).toBe(PaymentStatus.REFUNDED);
      expect((result.payment as Payment).refundStatus).toBe('completed');
      expect((result.payment as Payment).metadata?.refundId).toBe('re_1');
      expect(idempotencyService.store).toHaveBeenCalledWith(
        'webhook:refund:0f7b87dd-c76d-4f24-a4d6-8c0dc5ad5a6d',
        expect.any(Object),
        expect.any(Number),
      );
      expect(idempotencyService.claim).toHaveBeenCalledWith(
        'webhook:refund:0f7b87dd-c76d-4f24-a4d6-8c0dc5ad5a6d',
        expect.any(Number),
      );
    });

    it('rejects duplicate refund webhook deliveries with conflict', async () => {
      idempotencyService.claim.mockResolvedValue(null);

      await expect(
        service.handleRefundWebhook({
          eventType: 'refund.completed',
          idempotencyKey: '0f7b87dd-c76d-4f24-a4d6-8c0dc5ad5a6d',
          timestamp: new Date().toISOString(),
          paymentId: 'pay_1',
          refundId: 're_1',
          amount: 100,
          status: 'completed',
        }),
      ).rejects.toThrow(ConflictException);
      expect(paymentRepository.findOne).not.toHaveBeenCalled();
      expect(idempotencyService.store).not.toHaveBeenCalled();
    });

    it('releases an unprocessed claim when refund processing fails', async () => {
      paymentRepository.findOne.mockRejectedValue(new Error('database error'));

      await expect(
        service.handleRefundWebhook({
          eventType: 'refund.completed',
          idempotencyKey: '0f7b87dd-c76d-4f24-a4d6-8c0dc5ad5a6d',
          timestamp: new Date().toISOString(),
          paymentId: 'pay_1',
          status: 'completed',
        }),
      ).rejects.toThrow('database error');
      expect(idempotencyService.releaseClaim).toHaveBeenCalledWith(
        'webhook:refund:0f7b87dd-c76d-4f24-a4d6-8c0dc5ad5a6d',
        'claim-token',
      );
    });

    it('rejects invalid refund webhook payloads', async () => {
      await expect(
        service.handleRefundWebhook({
          eventType: 'refund.completed',
          idempotencyKey: '0f7b87dd-c76d-4f24-a4d6-8c0dc5ad5a6d',
          timestamp: new Date().toISOString(),
          status: 'completed',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });


  describe('retry behavior', () => {
    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('retries transient processing failures with exponential backoff and jitter and logs attempts', async () => {
      jest.useFakeTimers();
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
      const logSpy = jest.spyOn((service as any).logger, 'log');
      const warnSpy = jest.spyOn((service as any).logger, 'warn');

      paymentRepository.findOne
        .mockRejectedValueOnce(
          Object.assign(new Error('temporary db outage'), { code: 'ETIMEDOUT' }),
        )
        .mockRejectedValueOnce(
          Object.assign(new Error('temporary db outage'), { code: 'ETIMEDOUT' }),
        )
        .mockResolvedValueOnce({
          id: 'pay_retry',
          status: PaymentStatus.PENDING,
          metadata: {},
        });
      paymentRepository.save.mockImplementation((p) => Promise.resolve(p));

      const promise = service.handlePaymentGatewayWebhook({
        eventType: 'payment.completed',
        paymentId: 'pay_retry',
        status: 'completed',
      });

      await Promise.resolve();
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(1000);
      await jest.advanceTimersByTimeAsync(2000);

      const result = await promise;
      expect(result.processed).toBe(true);
      expect(paymentRepository.findOne).toHaveBeenCalledTimes(3);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('attempt failed'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Scheduling webhook retry with backoff'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('delayMs=0'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Retrying payment-gateway webhook processing'),
      );

      randomSpy.mockRestore();
    });

    it('does not retry non-retryable processing failures', async () => {
      paymentRepository.findOne.mockResolvedValue({
        id: 'pay_bad',
        status: PaymentStatus.PENDING,
        metadata: {},
      });
      paymentRepository.save.mockRejectedValue(
        Object.assign(new Error('validation violation'), { status: 400 }),
      );

      await expect(
        service.handlePaymentGatewayWebhook({
          eventType: 'payment.completed',
          paymentId: 'pay_bad',
          status: 'completed',
        }),
      ).rejects.toThrow('validation violation');
      expect(paymentRepository.save).toHaveBeenCalledTimes(1);
    });

    it('stops after 1s,2s,4s,8s backoff attempts are exhausted for transient failures', async () => {
      jest.useFakeTimers();
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const transient = Object.assign(new Error('connection reset'), {
        code: 'ECONNRESET',
      });
      paymentRepository.findOne.mockRejectedValue(transient);

      const promise = service.handlePaymentGatewayWebhook({
        eventType: 'payment.completed',
        paymentId: 'pay_flaky',
        status: 'completed',
      });
      const rejection = expect(promise).rejects.toThrow('connection reset');

      await Promise.resolve();
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(1000);
      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(4000);
      await jest.advanceTimersByTimeAsync(8000);

      await rejection;
      expect(paymentRepository.findOne).toHaveBeenCalledTimes(5);
    });
  });
});
