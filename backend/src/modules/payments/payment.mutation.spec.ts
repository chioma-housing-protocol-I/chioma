import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
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
import { FxRateService } from './fx-rate.service';
import { UsersService } from '../users/users.service';

/**
 * Mutation Test Suite for Payment Validation & Logic (#2214)
 *
 * Designed to kill subtle Stryker mutants:
 * - Amount boundary conditions (0, -1, 0.01, 999999999.99, 1000000000)
 * - Decimal precision checks (integer, 1 decimal, 2 decimals, 3 decimals)
 * - Arithmetic operators in fee (amount * 0.02) and net (amount - fee) math
 * - Conditional expression mutants on error handling & compensating refunds
 * - Fallbacks and null checks (referenceNumber || chargeId, userId validation)
 * - Status assignments (FAILED vs COMPLETED vs PENDING)
 */
describe('PaymentService Mutation Kill Suite (#2214)', () => {
  let service: PaymentService;
  let paymentRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let paymentMethodRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let mockGateway: {
    chargePayment: jest.Mock;
    processRefund: jest.Mock;
  };
  let mockNotifications: { notify: jest.Mock };
  let mockUsersService: { getUserById: jest.Mock };
  let mockFraudHooks: {
    onPaymentRecorded: jest.Mock;
    checkTransactionBeforeRecording: jest.Mock;
  };

  beforeEach(async () => {
    paymentRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((data: Partial<Payment>) => data as Payment),
      save: jest.fn(async (payment: Partial<Payment>) => ({
        id: 'pay_recorded_123',
        ...payment,
      })),
    };

    paymentMethodRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockGateway = {
      chargePayment: jest.fn().mockResolvedValue({
        success: true,
        chargeId: 'charge_gate_123',
      }),
      processRefund: jest.fn().mockResolvedValue({
        success: true,
      }),
    };

    mockNotifications = {
      notify: jest.fn().mockResolvedValue(undefined),
    };

    mockUsersService = {
      getUserById: jest.fn().mockResolvedValue({
        id: 'user_mut_1',
        email: 'payer@example.com',
      }),
    };

    mockFraudHooks = {
      onPaymentRecorded: jest.fn().mockResolvedValue(undefined),
      checkTransactionBeforeRecording: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getRepositoryToken(Payment),
          useValue: paymentRepo,
        },
        {
          provide: getRepositoryToken(PaymentMethod),
          useValue: paymentMethodRepo,
        },
        {
          provide: PaymentGatewayService,
          useValue: mockGateway,
        },
        {
          provide: NotificationsService,
          useValue: mockNotifications,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: FraudHooksService,
          useValue: mockFraudHooks,
        },
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
          },
        },
        {
          provide: FxRateService,
          useValue: { getRate: jest.fn(), convert: jest.fn() },
        },
        {
          provide: LockService,
          useValue: {
            withLock: jest.fn((_, __, fn: () => unknown) => fn()),
          },
        },
        {
          provide: IdempotencyService,
          useValue: {
            process: jest.fn((_, __, fn: () => unknown) => fn()),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);

    // Default valid payment method
    paymentMethodRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 'user_mut_1',
      paymentType: 'card',
      encryptedMetadata: null,
    });
  });

  describe('User ID Validation Mutants (ensureUserId)', () => {
    it('kills mutant removing !userId check by rejecting empty string', async () => {
      const dto: CreatePaymentRecordDto = {
        amount: 100,
        paymentMethodId: '1',
      };

      await expect(service.recordPayment(dto, '')).rejects.toThrow(
        new BadRequestException('User ID is required'),
      );
      expect(paymentRepo.findOne).not.toHaveBeenCalled();
      expect(mockGateway.chargePayment).not.toHaveBeenCalled();
    });

    it('kills mutant allowing null userId', async () => {
      const dto: CreatePaymentRecordDto = {
        amount: 100,
        paymentMethodId: '1',
      };

      await expect(
        service.recordPayment(dto, null as unknown as string),
      ).rejects.toThrow(new BadRequestException('User ID is required'));
    });
  });

  describe('Amount Validation & Boundary Mutants', () => {
    const baseDto = {
      paymentMethodId: '1',
    };

    it('kills mutant changing <= 0 to < 0 (rejecting exactly 0)', async () => {
      const dto = { ...baseDto, amount: 0 };
      await expect(service.recordPayment(dto, 'user_mut_1')).rejects.toThrow(
        new BadRequestException('Payment amount must be greater than 0'),
      );
    });

    it('kills mutant changing <= 0 to === 0 (rejecting negative numbers)', async () => {
      const negativeCases = [-0.01, -1, -500];
      for (const amount of negativeCases) {
        const dto = { ...baseDto, amount };
        await expect(service.recordPayment(dto, 'user_mut_1')).rejects.toThrow(
          new BadRequestException('Payment amount must be greater than 0'),
        );
      }
    });

    it('kills mutant rejecting minimum valid positive amount (0.01)', async () => {
      const dto = { ...baseDto, amount: 0.01 };
      const result = await service.recordPayment(dto, 'user_mut_1');
      expect(result).toBeDefined();
      expect(paymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 0.01,
          transactionFee: 0.01 * 0.02,
          netAmount: 0.01 - 0.01 * 0.02,
        }),
      );
    });

    it('kills mutant changing > 999999999.99 to >= 999999999.99 (accepting exactly 999,999,999.99)', async () => {
      const dto = { ...baseDto, amount: 999999999.99 };
      const result = await service.recordPayment(dto, 'user_mut_1');
      expect(result).toBeDefined();
      expect(paymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 999999999.99,
        }),
      );
    });

    it('kills mutant allowing amounts strictly above 999,999,999.99', async () => {
      const dto = { ...baseDto, amount: 1000000000.0 };
      await expect(service.recordPayment(dto, 'user_mut_1')).rejects.toThrow(
        new BadRequestException('Payment amount cannot exceed 999,999,999.99'),
      );
    });

    it('kills mutant allowing NaN or Infinity', async () => {
      await expect(
        service.recordPayment({ ...baseDto, amount: NaN }, 'user_mut_1'),
      ).rejects.toThrow(
        new BadRequestException('Payment amount must be a valid number'),
      );

      await expect(
        service.recordPayment({ ...baseDto, amount: Infinity }, 'user_mut_1'),
      ).rejects.toThrow(
        new BadRequestException('Payment amount must be a valid number'),
      );

      await expect(
        service.recordPayment({ ...baseDto, amount: -Infinity }, 'user_mut_1'),
      ).rejects.toThrow(
        new BadRequestException('Payment amount must be a valid number'),
      );
    });

    it('kills decimal precision mutants (accepting 0, 1, 2 decimals; rejecting 3+ decimals)', async () => {
      // 0 decimals (integer)
      await expect(
        service.recordPayment({ ...baseDto, amount: 100 }, 'user_mut_1'),
      ).resolves.toBeDefined();

      // 1 decimal
      await expect(
        service.recordPayment({ ...baseDto, amount: 100.5 }, 'user_mut_1'),
      ).resolves.toBeDefined();

      // 2 decimals
      await expect(
        service.recordPayment({ ...baseDto, amount: 100.99 }, 'user_mut_1'),
      ).resolves.toBeDefined();

      // 3 decimals must fail
      await expect(
        service.recordPayment({ ...baseDto, amount: 100.123 }, 'user_mut_1'),
      ).rejects.toThrow(
        new BadRequestException(
          'Payment amount can have at most 2 decimal places',
        ),
      );

      await expect(
        service.recordPayment({ ...baseDto, amount: 0.001 }, 'user_mut_1'),
      ).rejects.toThrow(
        new BadRequestException(
          'Payment amount can have at most 2 decimal places',
        ),
      );
    });
  });

  describe('Fee Calculation & Net Amount Math Mutants', () => {
    it('kills mutants altering 2% fee multiplier or netAmount subtraction', async () => {
      const testAmounts = [100, 250, 500];

      for (const amount of testAmounts) {
        paymentRepo.create.mockClear();

        await service.recordPayment(
          { amount, paymentMethodId: '1' },
          'user_mut_1',
        );

        const expectedFee = amount * 0.02;
        const expectedNet = amount - expectedFee;

        expect(paymentRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            amount,
            transactionFee: expectedFee,
            netAmount: expectedNet,
            currency: 'NGN',
            status: PaymentStatus.COMPLETED,
          }),
        );
      }
    });
  });

  describe('Gateway Failure & Status Mutants', () => {
    it('kills mutant that fails to persist FAILED status and error metadata on gateway failure', async () => {
      mockGateway.chargePayment.mockResolvedValueOnce({
        success: false,
        error: 'insufficient_funds',
      });

      const dto: CreatePaymentRecordDto = {
        amount: 200,
        paymentMethodId: '1',
        notes: 'Rent test',
      };

      await expect(service.recordPayment(dto, 'user_mut_1')).rejects.toThrow(
        new BadRequestException('Payment processing failed'),
      );

      // Verify exact create payload
      expect(paymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_mut_1',
          amount: 200,
          transactionFee: 4,
          netAmount: 196,
          currency: 'NGN',
          status: PaymentStatus.FAILED,
          metadata: { error: 'insufficient_funds' },
          notes: 'Rent test',
        }),
      );

      // Verify save was called to persist failure record
      expect(paymentRepo.save).toHaveBeenCalled();

      // Verify failure notification was sent
      expect(mockNotifications.notify).toHaveBeenCalledWith(
        'user_mut_1',
        'Payment failed',
        expect.stringContaining('200 NGN'),
        'PAYMENT_FAILED',
      );
    });
  });

  describe('Compensating Refund on Persistence Error Mutants', () => {
    it('kills mutant changing successful compensating refund branch message', async () => {
      paymentRepo.save.mockRejectedValueOnce(
        new Error('Database unique violation'),
      );
      mockGateway.processRefund.mockResolvedValueOnce({
        success: true,
      });

      const dto: CreatePaymentRecordDto = {
        amount: 150,
        paymentMethodId: '1',
      };

      await expect(service.recordPayment(dto, 'user_mut_1')).rejects.toThrow(
        new InternalServerErrorException(
          'Payment could not be recorded and has been automatically refunded. Please try again.',
        ),
      );

      expect(mockGateway.processRefund).toHaveBeenCalledWith(
        'charge_gate_123',
        150,
      );
    });

    it('kills mutant changing uncompensated refund failure branch message', async () => {
      paymentRepo.save.mockRejectedValueOnce(new Error('Database disk full'));
      mockGateway.processRefund.mockResolvedValueOnce({
        success: false,
      });

      const dto: CreatePaymentRecordDto = {
        amount: 150,
        paymentMethodId: '1',
      };

      await expect(service.recordPayment(dto, 'user_mut_1')).rejects.toThrow(
        new InternalServerErrorException(
          'Payment could not be recorded and the automatic refund failed for charge charge_gate_123. Contact support with this reference.',
        ),
      );
    });

    it('kills mutant not catching error thrown inside processRefund', async () => {
      paymentRepo.save.mockRejectedValueOnce(new Error('DB crashed'));
      mockGateway.processRefund.mockRejectedValueOnce(
        new Error('Gateway refund timeout'),
      );

      const dto: CreatePaymentRecordDto = {
        amount: 150,
        paymentMethodId: '1',
      };

      await expect(service.recordPayment(dto, 'user_mut_1')).rejects.toThrow(
        new InternalServerErrorException(
          'Payment could not be recorded and the automatic refund failed for charge charge_gate_123. Contact support with this reference.',
        ),
      );
    });
  });

  describe('Reference Number & Null Coalescing Mutants', () => {
    it('kills mutant replacing custom referenceNumber with chargeId', async () => {
      const dto: CreatePaymentRecordDto = {
        amount: 100,
        paymentMethodId: '1',
        referenceNumber: 'custom_ref_999',
      };

      await service.recordPayment(dto, 'user_mut_1');

      expect(paymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          referenceNumber: 'custom_ref_999',
        }),
      );
    });

    it('kills mutant removing fallback to chargeId when referenceNumber is not provided', async () => {
      const dto: CreatePaymentRecordDto = {
        amount: 100,
        paymentMethodId: '1',
      };

      await service.recordPayment(dto, 'user_mut_1');

      expect(paymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          referenceNumber: 'charge_gate_123',
        }),
      );
    });

    it('kills mutant mutating agreementId default null', async () => {
      await service.recordPayment(
        { amount: 100, paymentMethodId: '1' },
        'user_mut_1',
      );

      expect(paymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          agreementId: null,
        }),
      );

      await service.recordPayment(
        { amount: 100, paymentMethodId: '1', agreementId: 'agr_456' },
        'user_mut_1',
      );

      expect(paymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          agreementId: 'agr_456',
        }),
      );
    });
  });

  describe('Payment Method Existence & Ownership Mutants', () => {
    it('kills mutant skipping payment method ownership check', async () => {
      paymentMethodRepo.findOne.mockResolvedValueOnce(null);

      const dto: CreatePaymentRecordDto = {
        amount: 100,
        paymentMethodId: '999',
      };

      await expect(service.recordPayment(dto, 'user_mut_1')).rejects.toThrow(
        new NotFoundException('Payment method not found'),
      );
      expect(paymentMethodRepo.findOne).toHaveBeenCalledWith({
        where: { id: 999, userId: 'user_mut_1' },
      });
      expect(mockGateway.chargePayment).not.toHaveBeenCalled();
    });
  });

  describe('Email Verification Gate Mutants', () => {
    it('kills mutant bypassing verified email check', async () => {
      mockUsersService.getUserById.mockResolvedValueOnce({
        id: 'user_mut_1',
        email: '',
      });

      const dto: CreatePaymentRecordDto = {
        amount: 100,
        paymentMethodId: '1',
      };

      await expect(service.recordPayment(dto, 'user_mut_1')).rejects.toThrow(
        new BadRequestException(
          'A verified email address is required before making a payment',
        ),
      );
      expect(mockGateway.chargePayment).not.toHaveBeenCalled();
    });
  });
});
