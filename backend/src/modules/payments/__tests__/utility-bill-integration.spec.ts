// Must run before the User entity is imported: its encrypted columns pick
// bytea (Postgres) vs blob (SQLite) at decoration time based on this value,
// and this suite uses an in-memory SQLite database.
process.env.DB_TYPE = 'sqlite';

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { PaymentService } from '../payment.service';
import { Payment } from '../entities/payment.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { PaymentSchedule } from '../entities/payment-schedule.entity';
import { PaymentStatus } from '../entities/payment.entity';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/entities/user.entity';
import { PaymentGatewayService } from '../payment-gateway.service';
import { LockService } from '../../../common/lock';
import { IdempotencyService } from '../../../common/idempotency';
import { NotificationsService } from '../../notifications/notifications.service';
import { FraudHooksService } from '../../fraud/fraud-hooks.service';
import { PaymentProcessingService } from '../../stellar/services/payment-processing.service';
import { StellarService } from '../../stellar/services/stellar.service';
import { RetryService } from '../../../common/services/retry.service';

/**
 * Utility Bill Integration Tests
 *
 * Tests the complete utility bill lifecycle:
 * - Bill submission and validation
 * - Bill storage and retrieval
 * - Payment processing for bills
 * - Bill history and analytics
 * - Dispute handling (refunds) on bills
 *
 * Uses SQLite in-memory database for test isolation.
 */
describe('Utility Bill Integration Tests', () => {
  let module: TestingModule;
  let paymentService: PaymentService;
  let dataSource: DataSource;
  let testUser: User;
  let testPaymentMethod: PaymentMethod;

  const mockNotificationsService = {
    notify: jest.fn().mockResolvedValue(undefined),
  };

  const mockFraudHooksService = {
    onPaymentRecorded: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              PAYMENT_METADATA_SECRET: 'test-payment-secret',
              ENCRYPTION_KEY_BASE64: Buffer.from(
                '0123456789abcdef0123456789abcdef',
              ).toString('base64'),
              DB_TYPE: 'sqlite',
            }),
          ],
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Payment, PaymentMethod, PaymentSchedule, User],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([
          Payment,
          PaymentMethod,
          PaymentSchedule,
          User,
        ]),
        CacheModule.register({
          isGlobal: true,
          ttl: 600,
          max: 100,
        }),
      ],
      providers: [
        PaymentService,
        PaymentGatewayService,
        RetryService,
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: FraudHooksService,
          useValue: mockFraudHooksService,
        },
        {
          provide: PaymentProcessingService,
          useValue: {
            processRentPayment: jest.fn(),
          },
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
          provide: LockService,
          useValue: {
            acquireLock: jest.fn().mockResolvedValue('mock-lock-token'),
            releaseLock: jest.fn().mockResolvedValue(true),
            withLock: jest.fn(
              (_key: string, _ttlMs: number, fn: () => unknown) => fn(),
            ),
          },
        },
        {
          provide: IdempotencyService,
          useValue: {
            retrieve: jest.fn().mockResolvedValue(null),
            store: jest.fn().mockResolvedValue(undefined),
            process: jest.fn(
              (_key: string, _ttlMs: number, fn: () => unknown) => fn(),
            ),
          },
        },
      ],
    }).compile();

    paymentService = module.get<PaymentService>(PaymentService);
    dataSource = module.get<DataSource>(DataSource);

    // Setup test data
    await setupTestData();
  }, 30000);

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    if (module) {
      await module.close();
    }
  });

  afterEach(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.getRepository(PaymentSchedule).clear();
      await dataSource.getRepository(Payment).clear();
    }
  });

  async function setupTestData() {
    const userRepo = dataSource.getRepository(User);
    const paymentMethodRepo = dataSource.getRepository(PaymentMethod);

    testUser = await userRepo.save({
      email: 'tenant@test.com',
      firstName: 'Test',
      lastName: 'Tenant',
      role: UserRole.USER,
      isActive: true,
      password: 'hashed_password',
    } as User);

    const paymentMethod = paymentMethodRepo.create({
      userId: testUser.id,
      paymentType: 'card',
      lastFour: '4242',
      expiryDate: new Date('2028-12-31'),
      isDefault: true,
      metadata: { provider: 'stripe' },
      encryptedMetadata: null,
    });
    testPaymentMethod = await paymentMethodRepo.save(paymentMethod);
  }

  // ─────────────────────────────────────────────
  // 1. Bill Submission and Validation
  // ─────────────────────────────────────────────

  describe('Bill Submission and Validation', () => {
    it('should successfully submit a utility bill', async () => {
      const billDto = {
        amount: 150.0,
        paymentMethodId: String(testPaymentMethod.id),
        notes: 'Electricity bill - January 2026',
        referenceNumber: 'BILL-ELEC-2026-001',
      };

      const payment = await paymentService.recordPayment(billDto, testUser.id);

      expect(payment).toBeDefined();
      expect(payment.id).toBeDefined();
      expect(Number(payment.amount)).toBe(150.0);
      expect(payment.currency).toBe('NGN');
      expect(payment.status).toBe(PaymentStatus.COMPLETED);
      expect(payment.notes).toBe('Electricity bill - January 2026');
      expect(payment.referenceNumber).toBeDefined();
    });

    it('should validate bill amount (negative amount)', async () => {
      const billDto = {
        amount: -100.0,
        paymentMethodId: String(testPaymentMethod.id),
        notes: 'Invalid bill',
      };

      await expect(
        paymentService.recordPayment(billDto, testUser.id),
      ).rejects.toThrow();
    });

    it('should validate bill amount (zero amount)', async () => {
      const billDto = {
        amount: 0,
        paymentMethodId: String(testPaymentMethod.id),
        notes: 'Zero amount bill',
      };

      await expect(
        paymentService.recordPayment(billDto, testUser.id),
      ).rejects.toThrow();
    });

    it('should reject bill with non-existent payment method', async () => {
      const billDto = {
        amount: 200.0,
        paymentMethodId: '99999',
        notes: 'Bill with invalid payment method',
      };

      await expect(
        paymentService.recordPayment(billDto, testUser.id),
      ).rejects.toThrow();
    });

    it('should reject bill for unauthorized user', async () => {
      const billDto = {
        amount: 100.0,
        paymentMethodId: String(testPaymentMethod.id),
        notes: 'Unauthorized bill',
      };

      await expect(
        paymentService.recordPayment(billDto, 'non-existent-user-id'),
      ).rejects.toThrow();
    });

    it('should handle bill with different utility types via notes', async () => {
      const utilityTypes = [
        { type: 'Electricity', amount: 120.0 },
        { type: 'Water', amount: 85.5 },
        { type: 'Gas', amount: 95.0 },
        { type: 'Internet', amount: 50.0 },
        { type: 'Trash', amount: 30.0 },
      ];

      for (const utility of utilityTypes) {
        const billDto = {
          amount: utility.amount,
          paymentMethodId: String(testPaymentMethod.id),
          notes: `${utility.type} bill - February 2026`,
        };

        const payment = await paymentService.recordPayment(
          billDto,
          testUser.id,
        );
        expect(Number(payment.amount)).toBe(utility.amount);
        expect(payment.status).toBe(PaymentStatus.COMPLETED);
      }
    });
  });

  // ─────────────────────────────────────────────
  // 2. Bill Storage and Retrieval
  // ─────────────────────────────────────────────

  describe('Bill Storage and Retrieval', () => {
    it('should store bill with all required fields', async () => {
      const billDto = {
        amount: 250.0,
        paymentMethodId: String(testPaymentMethod.id),
        notes: 'Water bill - March 2026',
        referenceNumber: 'BILL-WATER-2026-001',
      };

      const payment = await paymentService.recordPayment(billDto, testUser.id);

      // Verify all fields stored correctly
      const storedBill = await paymentService.getPaymentById(
        payment.id,
        testUser.id,
      );

      expect(storedBill.id).toBe(payment.id);
      expect(Number(storedBill.amount)).toBe(250.0);
      expect(storedBill.currency).toBe('NGN');
      expect(storedBill.status).toBe(PaymentStatus.COMPLETED);
      expect(storedBill.notes).toBe('Water bill - March 2026');
      expect(storedBill.referenceNumber).toBeDefined();
      expect(storedBill.userId).toBe(testUser.id);
      expect(storedBill.processedAt).toBeDefined();
    });

    it('should retrieve bill by ID', async () => {
      const billDto = {
        amount: 180.0,
        paymentMethodId: String(testPaymentMethod.id),
        notes: 'Electricity bill - March 2026',
      };

      const payment = await paymentService.recordPayment(billDto, testUser.id);
      const retrieved = await paymentService.getPaymentById(
        payment.id,
        testUser.id,
      );

      expect(retrieved).toBeDefined();
      expect(Number(retrieved.amount)).toBe(180.0);
      expect(retrieved.notes).toBe('Electricity bill - March 2026');
    });

    it('should return 404 for non-existent bill', async () => {
      await expect(
        paymentService.getPaymentById('non-existent-id', testUser.id),
      ).rejects.toThrow();
    });

    it('should list all bills for a user with filters', async () => {
      const bills = [
        { amount: 100, notes: 'Bill 1' },
        { amount: 200, notes: 'Bill 2' },
        { amount: 300, notes: 'Bill 3' },
      ];

      for (const bill of bills) {
        await paymentService.recordPayment(
          {
            amount: bill.amount,
            paymentMethodId: String(testPaymentMethod.id),
            notes: bill.notes,
          },
          testUser.id,
        );
      }

      const result = await paymentService.listPayments({}, testUser.id);

      expect(result.length).toBe(3);
      expect(result.map((p) => Number(p.amount)).sort()).toEqual([
        100, 200, 300,
      ]);
    });

    it('should filter bills by status', async () => {
      await paymentService.recordPayment(
        {
          amount: 75,
          paymentMethodId: String(testPaymentMethod.id),
          notes: 'Status test bill',
        },
        testUser.id,
      );

      const result = await paymentService.listPayments(
        { status: PaymentStatus.COMPLETED },
        testUser.id,
      );

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.every((p) => p.status === PaymentStatus.COMPLETED)).toBe(
        true,
      );
    });

    it('should not retrieve bills of other users', async () => {
      const otherUser = await dataSource.getRepository(User).save({
        email: 'other@test.com',
        firstName: 'Other',
        lastName: 'User',
        role: UserRole.USER,
        isActive: true,
        password: 'hashed_password',
      } as User);

      const billDto = {
        amount: 300,
        paymentMethodId: String(testPaymentMethod.id),
        notes: 'Private bill',
      };

      const payment = await paymentService.recordPayment(billDto, testUser.id);

      await expect(
        paymentService.getPaymentById(payment.id, otherUser.id),
      ).rejects.toThrow();
    });
  });

  // ─────────────────────────────────────────────
  // 3. Payment Processing
  // ─────────────────────────────────────────────

  describe('Payment Processing', () => {
    it('should process payment for a bill successfully', async () => {
      const billDto = {
        amount: 200.0,
        paymentMethodId: String(testPaymentMethod.id),
        notes: 'Payment test bill',
      };

      const payment = await paymentService.recordPayment(billDto, testUser.id);

      expect(payment.status).toBe(PaymentStatus.COMPLETED);
      expect(Number(payment.amount)).toBe(200.0);
      expect(payment.processedAt).toBeDefined();
    });

    it('should include transaction fee in bill payment', async () => {
      const billDto = {
        amount: 1000.0,
        paymentMethodId: String(testPaymentMethod.id),
        notes: 'Fee test bill',
      };

      const payment = await paymentService.recordPayment(billDto, testUser.id);

      expect(Number(payment.transactionFee)).toBeCloseTo(20.0, 2);
      expect(Number(payment.netAmount)).toBeCloseTo(980.0, 2);
    });

    it('should process refund for a bill payment', async () => {
      const billDto = {
        amount: 500.0,
        paymentMethodId: String(testPaymentMethod.id),
        notes: 'Refund test bill',
      };

      const payment = await paymentService.recordPayment(billDto, testUser.id);

      const refunded = await paymentService.processRefund(
        payment.id,
        { amount: 500.0, reason: 'Bill overpayment refund' },
        testUser.id,
      );

      expect(refunded.status).toBe(PaymentStatus.REFUNDED);
      expect(Number(refunded.refundAmount)).toBe(500.0);
      expect(refunded.refundReason).toBe('Bill overpayment refund');
    });

    it('should process partial refund for a bill payment', async () => {
      const billDto = {
        amount: 600.0,
        paymentMethodId: String(testPaymentMethod.id),
        notes: 'Partial refund test bill',
      };

      const payment = await paymentService.recordPayment(billDto, testUser.id);

      const refunded = await paymentService.processRefund(
        payment.id,
        { amount: 200.0, reason: 'Partial refund' },
        testUser.id,
      );

      expect(refunded.status).toBe(PaymentStatus.PARTIAL_REFUND);
      expect(Number(refunded.refundAmount)).toBe(200.0);
    });

    it('should reject refund exceeding bill amount', async () => {
      const billDto = {
        amount: 100.0,
        paymentMethodId: String(testPaymentMethod.id),
        notes: 'Excessive refund test',
      };

      const payment = await paymentService.recordPayment(billDto, testUser.id);

      await expect(
        paymentService.processRefund(
          payment.id,
          { amount: 500.0, reason: 'Excessive refund' },
          testUser.id,
        ),
      ).rejects.toThrow();
    });

    it('should generate receipt for a paid bill', async () => {
      const billDto = {
        amount: 150.0,
        paymentMethodId: String(testPaymentMethod.id),
        notes: 'Receipt test bill',
      };

      const payment = await paymentService.recordPayment(billDto, testUser.id);
      const receipt = await paymentService.generateReceipt(
        payment.id,
        testUser.id,
      );

      expect(receipt).toBeDefined();
      expect(receipt.receipt).toBeDefined();
      expect(receipt.receipt.paymentId).toBe(payment.id);
      expect(Number(receipt.receipt.amount)).toBe(150.0);
      expect(receipt.receipt.status).toBe(PaymentStatus.COMPLETED);
      expect(receipt.data).toBeDefined();
    });

    it('should reject generating receipt for non-existent bill', async () => {
      await expect(
        paymentService.generateReceipt('non-existent-id', testUser.id),
      ).rejects.toThrow();
    });
  });

  // ─────────────────────────────────────────────
  // 4. Bill History and Analytics
  // ─────────────────────────────────────────────

  describe('Bill History and Analytics', () => {
    it('should provide bill payment analytics summary', async () => {
      const bills = [
        { amount: 100, notes: 'Jan electricity' },
        { amount: 200, notes: 'Jan water' },
        { amount: 150, notes: 'Feb electricity' },
      ];

      for (const bill of bills) {
        await paymentService.recordPayment(
          {
            amount: bill.amount,
            paymentMethodId: String(testPaymentMethod.id),
            notes: bill.notes,
          },
          testUser.id,
        );
      }

      const analytics = await paymentService.getPaymentAnalytics(testUser.id);

      expect(analytics).toBeDefined();
      expect(analytics.totalPayments).toBe(3);
      expect(analytics.totalVolume).toBeCloseTo(450.0, 2);
      expect(analytics.completedPayments).toBe(3);
      expect(analytics.pendingPayments).toBe(0);
      expect(analytics.failedPayments).toBe(0);
    });

    it('should track analytics across different periods', async () => {
      await paymentService.recordPayment(
        {
          amount: 500,
          paymentMethodId: String(testPaymentMethod.id),
          notes: 'Period test bill',
        },
        testUser.id,
      );

      const analytics = await paymentService.getPaymentAnalytics(testUser.id);
      expect(analytics.totalPayments).toBeGreaterThanOrEqual(1);
      expect(analytics.byCurrency).toBeDefined();
      expect(analytics.byCurrency['NGN']).toBeDefined();
      expect(analytics.byCurrency['NGN'].count).toBeGreaterThanOrEqual(1);
    });

    it('should track bill history in chronological order', async () => {
      await paymentService.recordPayment(
        {
          amount: 50,
          paymentMethodId: String(testPaymentMethod.id),
          notes: 'First bill',
        },
        testUser.id,
      );

      // SQLite's CURRENT_TIMESTAMP has whole-second resolution, so back-to-back
      // inserts can otherwise land on the same createdAt and make DESC order
      // among ties insertion-order-dependent instead of newest-first.
      await new Promise((resolve) => setTimeout(resolve, 1100));

      await paymentService.recordPayment(
        {
          amount: 100,
          paymentMethodId: String(testPaymentMethod.id),
          notes: 'Second bill',
        },
        testUser.id,
      );

      const payments = await paymentService.listPayments({}, testUser.id);
      expect(payments.length).toBe(2);
      expect(Number(payments[0].amount)).toBe(100);
      expect(Number(payments[1].amount)).toBe(50);
    });

    it('should include refunded amounts in analytics', async () => {
      const billDto = {
        amount: 300,
        paymentMethodId: String(testPaymentMethod.id),
        notes: 'Refund analytics bill',
      };

      const payment = await paymentService.recordPayment(billDto, testUser.id);

      await paymentService.processRefund(
        payment.id,
        { amount: 300, reason: 'Full refund' },
        testUser.id,
      );

      const analytics = await paymentService.getPaymentAnalytics(testUser.id);

      expect(analytics.totalRefunded).toBeCloseTo(300.0, 2);
      expect(analytics.totalVolume).toBeCloseTo(300.0, 2);
    });
  });

  // ─────────────────────────────────────────────
  // 5. Dispute Handling for Bills
  // ─────────────────────────────────────────────

  describe('Dispute Handling', () => {
    it('should process refund on disputed bill', async () => {
      const billDto = {
        amount: 400.0,
        paymentMethodId: String(testPaymentMethod.id),
        notes: 'Disputed bill - incorrect charge',
      };

      const payment = await paymentService.recordPayment(billDto, testUser.id);

      const refunded = await paymentService.processRefund(
        payment.id,
        {
          amount: 400.0,
          reason: 'Dispute resolved - incorrect billing amount',
        },
        testUser.id,
      );

      expect(refunded.status).toBe(PaymentStatus.REFUNDED);
      expect(refunded.refundReason).toBe(
        'Dispute resolved - incorrect billing amount',
      );
    });

    it('should partial refund on partially disputed bill', async () => {
      const billDto = {
        amount: 1000.0,
        paymentMethodId: String(testPaymentMethod.id),
        notes: 'Partially disputed bill',
      };

      const payment = await paymentService.recordPayment(billDto, testUser.id);

      const refunded = await paymentService.processRefund(
        payment.id,
        { amount: 300.0, reason: 'Partial dispute - overcharged for service' },
        testUser.id,
      );

      expect(refunded.status).toBe(PaymentStatus.PARTIAL_REFUND);
      expect(Number(refunded.refundAmount)).toBe(300.0);
    });

    it('should prevent double refund on same disputed bill', async () => {
      const billDto = {
        amount: 500.0,
        paymentMethodId: String(testPaymentMethod.id),
        notes: 'Double refund prevention test',
      };

      const payment = await paymentService.recordPayment(billDto, testUser.id);

      await paymentService.processRefund(
        payment.id,
        { amount: 500.0, reason: 'First refund' },
        testUser.id,
      );

      await expect(
        paymentService.processRefund(
          payment.id,
          { amount: 100.0, reason: 'Second refund attempt' },
          testUser.id,
        ),
      ).rejects.toThrow();
    });

    it('should track dispute resolution in bill history', async () => {
      const billDto = {
        amount: 250.0,
        paymentMethodId: String(testPaymentMethod.id),
        notes: 'Dispute tracking bill',
      };

      const payment = await paymentService.recordPayment(billDto, testUser.id);

      await paymentService.processRefund(
        payment.id,
        { amount: 250.0, reason: 'Dispute resolved in tenant favor' },
        testUser.id,
      );

      const updatedPayment = await paymentService.getPaymentById(
        payment.id,
        testUser.id,
      );

      expect(updatedPayment.status).toBe(PaymentStatus.REFUNDED);
      expect(updatedPayment.refundReason).toBe(
        'Dispute resolved in tenant favor',
      );
    });
  });

  // ─────────────────────────────────────────────
  // 6. Edge Cases and Error Scenarios
  // ─────────────────────────────────────────────

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle concurrent bill submissions', async () => {
      const billDto = {
        amount: 100,
        paymentMethodId: String(testPaymentMethod.id),
        notes: 'Concurrent bill',
      };

      const promises = Array(3)
        .fill(null)
        .map(() =>
          paymentService.recordPayment(
            {
              ...billDto,
              referenceNumber: `CONC-${Date.now()}-${Math.random()}`,
            },
            testUser.id,
          ),
        );

      const results = await Promise.allSettled(promises);
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;

      expect(succeeded).toBe(3);
    });

    it('should handle bill with large amount', async () => {
      const billDto = {
        amount: 1000000.0,
        paymentMethodId: String(testPaymentMethod.id),
        notes: 'Large bill test',
      };

      const payment = await paymentService.recordPayment(billDto, testUser.id);
      expect(Number(payment.amount)).toBe(1000000.0);
      expect(payment.status).toBe(PaymentStatus.COMPLETED);
    });

    it('should handle bill with decimal amounts', async () => {
      const billDto = {
        amount: 99.99,
        paymentMethodId: String(testPaymentMethod.id),
        notes: 'Decimal bill test',
      };

      const payment = await paymentService.recordPayment(billDto, testUser.id);
      expect(Number(payment.amount)).toBeCloseTo(99.99, 2);
    });

    it('should handle idempotent bill submissions', async () => {
      const billDto = {
        amount: 100,
        paymentMethodId: String(testPaymentMethod.id),
        notes: 'Idempotent bill',
        idempotencyKey: 'unique-key-12345',
      };

      const firstPayment = await paymentService.recordPayment(
        billDto,
        testUser.id,
      );
      const secondPayment = await paymentService.recordPayment(
        billDto,
        testUser.id,
      );

      expect(secondPayment.id).toBe(firstPayment.id);
    });

    it('should maintain data consistency on failed operations', async () => {
      const initialCount = await dataSource.getRepository(Payment).count();

      try {
        await paymentService.recordPayment(
          {
            amount: 100,
            paymentMethodId: 'invalid-id',
            notes: 'Should fail',
          },
          testUser.id,
        );
      } catch (error) {
        // Expected to fail
      }

      const finalCount = await dataSource.getRepository(Payment).count();
      expect(finalCount).toBe(initialCount);
    });

    it('should handle empty bill history gracefully', async () => {
      const analytics = await paymentService.getPaymentAnalytics(testUser.id);
      expect(analytics).toBeDefined();
      expect(analytics.totalPayments).toBe(0);
      expect(analytics.totalVolume).toBe(0);
    });
  });
});
