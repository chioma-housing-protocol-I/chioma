import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminRefundsService } from './admin-refunds.service';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { User } from '../users/entities/user.entity';
import { AdminRefundDecisionDto } from './dto/admin-refund-decision.dto';

// ─── Mock Factories ──────────────────────────────────────────────────────────

const createMockPaymentRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn(),
  save: jest.fn(),
});

const createMockUserRepository = () => ({
  findBy: jest.fn(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'pay-1',
    userId: 'user-1',
    amount: 1000,
    refundAmount: 0,
    currency: 'USDC',
    status: PaymentStatus.REFUNDED,
    refundStatus: 'none',
    refundReason: 'Customer request',
    referenceNumber: 'REF-001',
    paymentMethod: 'card',
    agreementId: 'agr-1',
    metadata: {},
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    ...overrides,
  } as unknown as Payment;
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'tenant@chioma.local',
    firstName: 'Jane',
    lastName: 'Doe',
    ...overrides,
  } as unknown as User;
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('AdminRefundsService', () => {
  let service: AdminRefundsService;
  let paymentRepository: ReturnType<typeof createMockPaymentRepository>;
  let userRepository: ReturnType<typeof createMockUserRepository>;

  beforeEach(async () => {
    paymentRepository = createMockPaymentRepository();
    userRepository = createMockUserRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminRefundsService,
        {
          provide: getRepositoryToken(Payment),
          useValue: paymentRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get<AdminRefundsService>(AdminRefundsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── listRefunds ────────────────────────────────────────────────────────────

  describe('listRefunds', () => {
    it('returns mapped refund rows', async () => {
      const payment = makePayment({ refundStatus: 'approved' });
      const user = makeUser();

      const mockQb = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([payment]),
      };
      paymentRepository.createQueryBuilder.mockReturnValue(mockQb);
      userRepository.findBy.mockResolvedValue([user]);

      const result = await service.listRefunds();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('pay-1');
      expect(result[0].requesterEmail).toBe('tenant@chioma.local');
    });

    it('returns empty array when no refunds exist', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      paymentRepository.createQueryBuilder.mockReturnValue(mockQb);
      userRepository.findBy.mockResolvedValue([]);

      const result = await service.listRefunds();

      expect(result).toEqual([]);
    });

    it('handles missing user gracefully', async () => {
      const payment = makePayment({ userId: 'ghost-user' });

      const mockQb = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([payment]),
      };
      paymentRepository.createQueryBuilder.mockReturnValue(mockQb);
      userRepository.findBy.mockResolvedValue([]);

      const result = await service.listRefunds();

      expect(result[0].requesterName).toBe('Unknown User');
      expect(result[0].requesterEmail).toBe('unknown@chioma.local');
    });

    it('maps refundStatus to correct AdminRefundStatus', async () => {
      const cases: Array<{
        refundStatus: string;
        status: PaymentStatus;
        expected: string;
      }> = [
        {
          refundStatus: 'approved',
          status: PaymentStatus.COMPLETED,
          expected: 'APPROVED',
        },
        {
          refundStatus: 'rejected',
          status: PaymentStatus.COMPLETED,
          expected: 'REJECTED',
        },
        {
          refundStatus: 'processing',
          status: PaymentStatus.COMPLETED,
          expected: 'PROCESSING',
        },
        {
          refundStatus: 'none',
          status: PaymentStatus.REFUNDED,
          expected: 'COMPLETED',
        },
        {
          refundStatus: 'none',
          status: PaymentStatus.COMPLETED,
          expected: 'PENDING',
        },
      ];

      for (const { refundStatus, status, expected } of cases) {
        const payment = makePayment({ refundStatus, status });
        const mockQb = {
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([payment]),
        };
        paymentRepository.createQueryBuilder.mockReturnValue(mockQb);
        userRepository.findBy.mockResolvedValue([]);

        const result = await service.listRefunds();
        expect(result[0].status).toBe(expected);
      }
    });
  });

  // ─── getRefundById ──────────────────────────────────────────────────────────

  describe('getRefundById', () => {
    it('returns refund detail for existing payment', async () => {
      const payment = makePayment({
        metadata: {
          refundHistory: [
            {
              id: 'h-1',
              action: 'approved',
              message: 'Looks good',
              actorName: 'admin-1',
              actorRole: 'admin',
              createdAt: new Date().toISOString(),
            },
          ],
        },
      });
      const user = makeUser();

      paymentRepository.findOne.mockResolvedValue(payment);
      userRepository.findBy.mockResolvedValue([user]);

      const result = await service.getRefundById('pay-1');

      expect(result.id).toBe('pay-1');
      expect(result.history).toHaveLength(1);
      expect(result.history[0].action).toBe('approved');
    });

    it('throws NotFoundException for non-existent payment', async () => {
      paymentRepository.findOne.mockResolvedValue(null);

      await expect(service.getRefundById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns empty history when metadata has no refundHistory', async () => {
      const payment = makePayment({ metadata: {} });
      paymentRepository.findOne.mockResolvedValue(payment);
      userRepository.findBy.mockResolvedValue([]);

      const result = await service.getRefundById('pay-1');

      expect(result.history).toEqual([]);
    });

    it('includes propertyName from metadata when present', async () => {
      const payment = makePayment({
        metadata: { propertyName: 'Lekki Apartment' },
      });
      paymentRepository.findOne.mockResolvedValue(payment);
      userRepository.findBy.mockResolvedValue([]);

      const result = await service.getRefundById('pay-1');

      expect(result.propertyName).toBe('Lekki Apartment');
    });
  });

  // ─── applyDecision ──────────────────────────────────────────────────────────

  describe('applyDecision', () => {
    it('approves a pending refund', async () => {
      const payment = makePayment({
        refundStatus: 'none',
        status: PaymentStatus.COMPLETED,
        refundAmount: 500,
      });
      const user = makeUser();

      paymentRepository.findOne.mockResolvedValue(payment);
      paymentRepository.save.mockResolvedValue({
        ...payment,
        refundStatus: 'approved',
      });
      userRepository.findBy.mockResolvedValue([user]);

      const dto: AdminRefundDecisionDto = {
        action: 'approve',
        notes: 'Approved after review',
      };

      const result = await service.applyDecision('pay-1', dto, 'admin-1');

      expect(paymentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ refundStatus: 'approved' }),
      );
      expect(result).toBeDefined();
    });

    it('rejects a pending refund', async () => {
      const payment = makePayment({
        refundStatus: 'none',
        status: PaymentStatus.COMPLETED,
      });
      const user = makeUser();

      paymentRepository.findOne.mockResolvedValue(payment);
      paymentRepository.save.mockResolvedValue({
        ...payment,
        refundStatus: 'rejected',
      });
      userRepository.findBy.mockResolvedValue([user]);

      const dto: AdminRefundDecisionDto = {
        action: 'reject',
        notes: 'Insufficient evidence',
      };

      const result = await service.applyDecision('pay-1', dto, 'admin-1');

      expect(paymentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ refundStatus: 'rejected' }),
      );
      expect(result).toBeDefined();
    });

    it('throws NotFoundException when payment does not exist', async () => {
      paymentRepository.findOne.mockResolvedValue(null);

      const dto: AdminRefundDecisionDto = {
        action: 'approve',
        notes: 'Test',
      };

      await expect(
        service.applyDecision('non-existent', dto, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when refund is already finalized (COMPLETED)', async () => {
      const payment = makePayment({
        refundStatus: 'completed',
        status: PaymentStatus.REFUNDED,
      });
      paymentRepository.findOne.mockResolvedValue(payment);

      const dto: AdminRefundDecisionDto = {
        action: 'approve',
        notes: 'Too late',
      };

      await expect(
        service.applyDecision('pay-1', dto, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when refund is already REJECTED', async () => {
      const payment = makePayment({
        refundStatus: 'rejected',
        status: PaymentStatus.COMPLETED,
      });
      paymentRepository.findOne.mockResolvedValue(payment);

      const dto: AdminRefundDecisionDto = {
        action: 'approve',
        notes: 'Retry',
      };

      await expect(
        service.applyDecision('pay-1', dto, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('appends decision to refundHistory in metadata', async () => {
      const payment = makePayment({
        refundStatus: 'none',
        status: PaymentStatus.COMPLETED,
        metadata: {
          refundHistory: [
            {
              id: 'h-0',
              action: 'submitted',
              message: 'Initial request',
              actorName: 'user-1',
              actorRole: 'tenant',
              createdAt: new Date().toISOString(),
            },
          ],
        },
      });
      const user = makeUser();

      paymentRepository.findOne.mockResolvedValue(payment);
      paymentRepository.save.mockImplementation(async (p: Payment) => p);
      userRepository.findBy.mockResolvedValue([user]);

      const dto: AdminRefundDecisionDto = {
        action: 'approve',
        notes: 'Approved',
      };

      await service.applyDecision('pay-1', dto, 'admin-1');

      const savedPayment = paymentRepository.save.mock.calls[0][0] as Payment;
      const history = (savedPayment.metadata as any).refundHistory;
      expect(history).toHaveLength(2);
      expect(history[1].action).toBe('approved');
      expect(history[1].actorName).toBe('admin-1');
    });
  });

  // ─── Test Isolation ─────────────────────────────────────────────────────────

  describe('test isolation', () => {
    it('does not share mock state between tests', async () => {
      paymentRepository.findOne.mockResolvedValue(makePayment());
      userRepository.findBy.mockResolvedValue([makeUser()]);

      await service.getRefundById('pay-1');

      expect(paymentRepository.findOne).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();

      expect(paymentRepository.findOne).not.toHaveBeenCalled();
    });

    it('handles concurrent getRefundById calls independently', async () => {
      const payment1 = makePayment({ id: 'pay-1' });
      const payment2 = makePayment({ id: 'pay-2' });

      paymentRepository.findOne
        .mockResolvedValueOnce(payment1)
        .mockResolvedValueOnce(payment2);
      userRepository.findBy.mockResolvedValue([makeUser()]);

      const [r1, r2] = await Promise.all([
        service.getRefundById('pay-1'),
        service.getRefundById('pay-2'),
      ]);

      expect(r1.id).toBe('pay-1');
      expect(r2.id).toBe('pay-2');
    });
  });
});
