import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RefundService } from './refund.service';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { PaymentGatewayService } from './payment-gateway.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProcessRefundDto } from './dto/process-refund.dto';

const mockPaymentGateway = {
  processRefund: jest.fn(),
};

const mockNotificationsService = {
  notify: jest.fn(),
};

// DataSource mock — transaction() runs the callback with a mock entity manager.
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

describe('RefundService', () => {
  let service: RefundService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundService,
        { provide: PaymentGatewayService, useValue: mockPaymentGateway },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<RefundService>(RefundService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('processRefund', () => {
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

    it('skips the pessimistic lock on sqlite (no row-level locking support)', async () => {
      const sqliteDataSource = {
        options: { type: 'sqlite' },
        transaction: jest.fn(
          (cb: (em: typeof mockEntityManager) => Promise<unknown>) =>
            cb(mockEntityManager),
        ),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RefundService,
          { provide: PaymentGatewayService, useValue: mockPaymentGateway },
          { provide: NotificationsService, useValue: mockNotificationsService },
          { provide: DataSource, useValue: sqliteDataSource },
        ],
      }).compile();
      const sqliteService = module.get<RefundService>(RefundService);

      const payment = {
        id: 'pay_1',
        userId: 'user_1',
        status: PaymentStatus.COMPLETED,
        amount: 100,
        refundAmount: 0,
        currency: 'NGN',
        metadata: { chargeId: 'charge_1' },
      } as unknown as Payment;
      mockEntityManager.findOne.mockResolvedValue(payment);
      mockPaymentGateway.processRefund.mockResolvedValue({
        success: true,
        refundId: 'refund_1',
      });
      mockEntityManager.save.mockResolvedValue({
        ...payment,
        status: PaymentStatus.REFUNDED,
      });

      await sqliteService.processRefund(
        'pay_1',
        { amount: 100, reason: 'test' },
        'user_1',
      );

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(
        Payment,
        expect.not.objectContaining({ lock: expect.anything() }),
      );
    });

    it('throws when payment status is not completed', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        id: 'pay_1',
        userId: 'user_1',
        status: PaymentStatus.PENDING,
        amount: 100,
        refundAmount: 0,
        metadata: { chargeId: 'charge_1' },
      } as unknown as Payment);

      await expect(
        service.processRefund(
          'pay_1',
          { amount: 10, reason: 'test' },
          'user_1',
        ),
      ).rejects.toThrow('Only completed payments can be refunded');
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

    it('rejects refund with a descriptive error when metadata has no chargeId', async () => {
      mockEntityManager.findOne.mockResolvedValue({
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
          { amount: 50, reason: 'no charge' },
          'user-1',
        ),
      ).rejects.toThrow(
        /payment pay-1 has no gateway charge ID recorded in its metadata/,
      );

      expect(mockPaymentGateway.processRefund).not.toHaveBeenCalled();
      expect(mockEntityManager.save).not.toHaveBeenCalled();
    });

    it('rejects refund when metadata is entirely null', async () => {
      mockEntityManager.findOne.mockResolvedValue({
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
          { amount: 50, reason: 'null meta' },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(mockPaymentGateway.processRefund).not.toHaveBeenCalled();
    });

    it('rejects refund when chargeId is blank/whitespace', async () => {
      mockEntityManager.findOne.mockResolvedValue({
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
          { amount: 50, reason: 'blank' },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(mockPaymentGateway.processRefund).not.toHaveBeenCalled();
    });

    it('prevents double-refund: second concurrent call sees updated refundAmount', async () => {
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

    it('marks payment as PARTIAL_REFUND when refund amount is less than the total', async () => {
      const payment = {
        id: 'pay_1',
        userId: 'user_1',
        status: PaymentStatus.COMPLETED,
        amount: 100,
        refundAmount: 0,
        currency: 'NGN',
        metadata: { chargeId: 'charge_1' },
      } as unknown as Payment;

      mockEntityManager.findOne.mockResolvedValue(payment);
      mockPaymentGateway.processRefund.mockResolvedValue({
        success: true,
        refundId: 'refund_1',
      });
      mockEntityManager.save.mockImplementation((_entity, value) =>
        Promise.resolve(value),
      );

      const result = await service.processRefund(
        'pay_1',
        { amount: 40, reason: 'partial' },
        'user_1',
      );

      expect(result.status).toBe(PaymentStatus.PARTIAL_REFUND);
      expect(result.refundAmount).toBe(40);
    });

    it('throws BadRequestException when the gateway declines the refund', async () => {
      const payment = {
        id: 'pay_1',
        userId: 'user_1',
        status: PaymentStatus.COMPLETED,
        amount: 100,
        refundAmount: 0,
        currency: 'NGN',
        metadata: { chargeId: 'charge_1' },
      } as unknown as Payment;

      mockEntityManager.findOne.mockResolvedValue(payment);
      mockPaymentGateway.processRefund.mockResolvedValue({ success: false });

      await expect(
        service.processRefund(
          'pay_1',
          { amount: 50, reason: 'declined' },
          'user_1',
        ),
      ).rejects.toThrow('Refund processing failed');
      expect(mockEntityManager.save).not.toHaveBeenCalled();
    });

    it('sends notification after successful refund', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        id: 'pay-1',
        userId: 'user-1',
        status: PaymentStatus.COMPLETED,
        amount: 100,
        refundAmount: 0,
        currency: 'NGN',
        metadata: { chargeId: 'ch-1' },
      } as unknown as Payment);
      mockPaymentGateway.processRefund.mockResolvedValue({
        success: true,
        refundId: 'ref-1',
      });
      mockEntityManager.save.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.REFUNDED,
        refundAmount: 50,
      } as Payment);

      await service.processRefund(
        'pay-1',
        { amount: 50, reason: 'partial' },
        'user-1',
      );

      expect(mockNotificationsService.notify).toHaveBeenCalledWith(
        'user-1',
        expect.stringContaining('efund'),
        expect.any(String),
        'PAYMENT_REFUNDED',
      );
    });
  });
});
