import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PaymentWebhookService } from './payment-webhook.service';
import { Payment, PaymentStatus } from './entities/payment.entity';

const mockPaymentRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
});

describe('PaymentWebhookService', () => {
  let service: PaymentWebhookService;
  let paymentRepository: ReturnType<typeof mockPaymentRepository>;
  let originalSecret: string | undefined;

  beforeAll(() => {
    originalSecret = process.env.PAYMENT_WEBHOOK_SECRET;
  });

  afterAll(() => {
    process.env.PAYMENT_WEBHOOK_SECRET = originalSecret;
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentWebhookService,
        {
          provide: getRepositoryToken(Payment),
          useFactory: mockPaymentRepository,
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

    it('rejects the webhook when the secret header is missing but a secret is configured', async () => {
      process.env.PAYMENT_WEBHOOK_SECRET = 'configured-secret';

      await expect(
        service.handlePaymentGatewayWebhook(
          {
            eventType: 'payment.completed',
            paymentId: 'pay_1',
            status: 'completed',
          },
          undefined,
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(paymentRepository.findOne).not.toHaveBeenCalled();
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
        paymentId: 'pay_1',
        refundId: 're_1',
        amount: 100,
        status: 'completed',
      });

      expect(result.processed).toBe(true);
      expect((result.payment as Payment).status).toBe(PaymentStatus.REFUNDED);
      expect((result.payment as Payment).refundStatus).toBe('completed');
      expect((result.payment as Payment).metadata?.refundId).toBe('re_1');
    });

    it('rejects invalid refund webhook payloads', async () => {
      await expect(
        service.handleRefundWebhook({
          eventType: 'refund.completed',
          status: 'completed',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
