/**
 * Payment processing performance / load benchmarks (#1392).
 *
 * These tests establish regression baselines for:
 * - sequential recordPayment throughput
 * - 1000+ concurrent recordPayment calls (idempotent dedupe + unique keys)
 * - listPayments query-builder path latency
 *
 * Baselines are documented in docs/PAYMENT_PERFORMANCE_BASELINES.md.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import { Payment } from './entities/payment.entity';
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
import { PAYMENT_LIST_DEFAULT_LIMIT } from './dto/payment-filters.dto';

/** Soft ceiling used as a regression guard (ms). Documented in baselines. */
export const PAYMENT_BENCHMARK_BASELINES = {
  /** Max wall time for 100 sequential recordPayment calls. */
  sequential100Ms: 5_000,
  /** Max wall time for 1000 concurrent unique-key recordPayment calls. */
  concurrent1000Ms: 15_000,
  /** Max wall time for a single listPayments query-builder path. */
  listPaymentsMs: 200,
  /** Max average ms per concurrent payment under the 1000-load test. */
  avgConcurrentPaymentMs: 15,
} as const;

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

describe('PaymentService performance benchmarks', () => {
  let service: PaymentService;
  let paymentRepository: ReturnType<typeof mockPaymentRepository>;
  let paymentMethodRepository: ReturnType<typeof mockPaymentMethodRepository>;
  let mockGateway: { chargePayment: jest.Mock };
  let mockNotifications: { notify: jest.Mock };

  beforeEach(async () => {
    paymentRepository = mockPaymentRepository();
    paymentMethodRepository = mockPaymentMethodRepository();
    mockGateway = {
      chargePayment: jest.fn().mockResolvedValue({
        success: true,
        chargeId: 'charge_bench',
      }),
    };
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

    paymentMethodRepository.findOne.mockResolvedValue({
      id: 1,
      userId: 'user_bench',
      encryptedMetadata: null,
    });
    paymentRepository.create.mockImplementation(
      (data: Partial<Payment>) => data as Payment,
    );
    let saveCount = 0;
    paymentRepository.save.mockImplementation(
      async (data: Partial<Payment>) => {
        saveCount += 1;
        return {
          id: `pay_bench_${saveCount}`,
          amount: data.amount ?? 100,
          currency: data.currency ?? 'USD',
          status: data.status,
          ...data,
        } as Payment;
      },
    );
  });

  it('benchmarks 100 sequential recordPayment calls under baseline', async () => {
    const started = Date.now();
    for (let i = 0; i < 100; i += 1) {
      const dto = {
        agreementId: 'agreement_bench',
        amount: 100,
        paymentMethodId: '1',
        idempotencyKey: `idem_seq_${i}`,
      } as CreatePaymentRecordDto & { idempotencyKey: string };
      await service.recordPayment(dto, 'user_bench');
    }
    const elapsed = Date.now() - started;
    expect(elapsed).toBeLessThan(PAYMENT_BENCHMARK_BASELINES.sequential100Ms);
    expect(paymentRepository.save).toHaveBeenCalledTimes(100);
  });

  it('benchmarks 1000+ concurrent unique recordPayment calls under baseline', async () => {
    const concurrency = 1000;
    const started = Date.now();
    const results = await Promise.all(
      Array.from({ length: concurrency }, (_, i) => {
        const dto = {
          agreementId: 'agreement_bench',
          amount: 100,
          paymentMethodId: '1',
          idempotencyKey: `idem_load_${i}`,
        } as CreatePaymentRecordDto & { idempotencyKey: string };
        return service.recordPayment(dto, 'user_bench');
      }),
    );
    const elapsed = Date.now() - started;
    const avg = elapsed / concurrency;

    expect(results).toHaveLength(concurrency);
    expect(elapsed).toBeLessThan(PAYMENT_BENCHMARK_BASELINES.concurrent1000Ms);
    expect(avg).toBeLessThan(
      PAYMENT_BENCHMARK_BASELINES.avgConcurrentPaymentMs,
    );
    expect(paymentRepository.save.mock.calls.length).toBeGreaterThanOrEqual(
      concurrency,
    );
  }, 30_000);

  it('benchmarks listPayments query path under baseline', async () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    paymentRepository.createQueryBuilder.mockReturnValue(qb);

    const started = Date.now();
    await service.listPayments({}, 'user_bench');
    const elapsed = Date.now() - started;

    expect(elapsed).toBeLessThan(PAYMENT_BENCHMARK_BASELINES.listPaymentsMs);
    expect(paymentRepository.createQueryBuilder).toHaveBeenCalled();
    expect(qb.getManyAndCount).toHaveBeenCalled();
    // Unfiltered listing must still be bounded rather than selecting the
    // caller's entire payment history.
    expect(qb.take).toHaveBeenCalledWith(PAYMENT_LIST_DEFAULT_LIMIT);
    expect(qb.skip).toHaveBeenCalledWith(0);
  });

  it('dedupes 1000 concurrent calls that share one idempotency key', async () => {
    const concurrency = 1000;
    const dto = {
      agreementId: 'agreement_bench',
      amount: 100,
      paymentMethodId: '1',
      idempotencyKey: 'idem_shared_load',
    } as CreatePaymentRecordDto & { idempotencyKey: string };

    const started = Date.now();
    const results = await Promise.all(
      Array.from({ length: concurrency }, () =>
        service.recordPayment(dto, 'user_bench'),
      ),
    );
    const elapsed = Date.now() - started;

    expect(results).toHaveLength(concurrency);
    expect(elapsed).toBeLessThan(PAYMENT_BENCHMARK_BASELINES.concurrent1000Ms);
    // Shared key should collapse to a single persisted payment
    expect(paymentRepository.save).toHaveBeenCalledTimes(1);
  }, 30_000);
});
