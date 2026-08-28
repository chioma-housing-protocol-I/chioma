import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RentService } from './rent.service';
import { RentAgreement } from './entities/rent-contract.entity';
import { Payment } from './entities/payment.entity';
import { AgreementNotFoundError } from '../../common/errors/domain-errors';

describe('RentService', () => {
  let service: RentService;
  let agreementRepository: jest.Mocked<Repository<RentAgreement>>;
  let paymentRepository: jest.Mocked<Repository<Payment>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RentService,
        {
          provide: getRepositoryToken(RentAgreement),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: { find: jest.fn(), findAndCount: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<RentService>(RentService);
    agreementRepository = module.get(getRepositoryToken(RentAgreement));
    paymentRepository = module.get(getRepositoryToken(Payment));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateMonthlyRent', () => {
    it('returns the base rent when no tax or fees are given', () => {
      expect(service.calculateMonthlyRent(1000)).toBe(1000);
    });

    it('applies a tax rate on top of the base rent', () => {
      // 1000 + (1000 * 0.1) = 1100
      expect(service.calculateMonthlyRent(1000, 0.1)).toBe(1100);
    });

    it('adds flat fees on top of rent and tax', () => {
      // 1000 + (1000 * 0.1) + 50 = 1150
      expect(service.calculateMonthlyRent(1000, 0.1, 50)).toBe(1150);
    });

    it('rounds the result to two decimal places', () => {
      // 999.99 * 1.075 = 1074.98925 -> rounds to 1074.99
      expect(service.calculateMonthlyRent(999.99, 0.075)).toBe(1074.99);
    });

    it('handles a zero base rent', () => {
      expect(service.calculateMonthlyRent(0, 0.1, 10)).toBe(10);
    });
  });

  describe('calculateLateFee', () => {
    it('returns zero when the payment is within the default grace period', () => {
      expect(service.calculateLateFee(1500, 5)).toBe(0);
    });

    it('returns zero when the payment is exactly on the grace period boundary', () => {
      expect(service.calculateLateFee(1500, 3, 3)).toBe(0);
    });

    it('charges a fee for the first day past the grace period', () => {
      // grace=5, daysLate=6 -> 1 additional day
      // flatFee = 1500 * 0.05 = 75; dailyPenalty = 1500 * 0.001 * 1 = 1.5
      expect(service.calculateLateFee(1500, 6)).toBe(76.5);
    });

    it('uses the default 5-day grace period and 5% rate when not specified', () => {
      // daysLate=10 -> 5 additional days
      // flatFee = 1500 * 0.05 = 75; dailyPenalty = 1500 * 0.001 * 5 = 7.5
      expect(service.calculateLateFee(1500, 10)).toBe(82.5);
    });

    it('honors a custom grace period', () => {
      // grace=10, daysLate=10 -> within grace, no fee
      expect(service.calculateLateFee(1500, 10, 10)).toBe(0);
    });

    it('honors a custom late fee rate', () => {
      // grace=5, daysLate=6, rate=0.1 -> flatFee=150, dailyPenalty=1.5
      expect(service.calculateLateFee(1500, 6, 5, 0.1)).toBe(151.5);
    });

    it('rounds the computed fee to two decimal places', () => {
      const fee = service.calculateLateFee(999.99, 7);
      expect(fee).toBe(Math.round(fee * 100) / 100);
    });

    it('returns zero for zero days late', () => {
      expect(service.calculateLateFee(1500, 0)).toBe(0);
    });
  });

  describe('calculateProratedRent', () => {
    it('prorates rent for a move-in mid-month in a 31-day month', () => {
      // January has 31 days; moving in on the 15th leaves 17 remaining days
      // (31 - 15 + 1 = 17). dailyRate = 1500/31; prorated = dailyRate * 17
      const result = service.calculateProratedRent(1500, new Date(2026, 0, 15));
      const expected = Math.round((1500 / 31) * 17 * 100) / 100;
      expect(result).toBe(expected);
    });

    it('returns the full monthly rent when moving in on the 1st', () => {
      const result = service.calculateProratedRent(1500, new Date(2026, 0, 1));
      expect(result).toBe(1500);
    });

    it('handles February in a non-leap year (28 days)', () => {
      // 2026 is not a leap year
      const result = service.calculateProratedRent(2800, new Date(2026, 1, 28));
      // Last day of the month: remainingDays = 1
      const expected = Math.round((2800 / 28) * 1 * 100) / 100;
      expect(result).toBe(expected);
    });

    it('handles February in a leap year (29 days)', () => {
      // 2028 is a leap year
      const result = service.calculateProratedRent(2900, new Date(2028, 1, 29));
      const expected = Math.round((2900 / 29) * 1 * 100) / 100;
      expect(result).toBe(expected);
    });

    it('handles a move-in on the last day of a 30-day month', () => {
      // April has 30 days
      const result = service.calculateProratedRent(3000, new Date(2026, 3, 30));
      const expected = Math.round((3000 / 30) * 1 * 100) / 100;
      expect(result).toBe(expected);
    });
  });

  describe('generatePaymentSchedule', () => {
    it('generates a single entry when start and end date are the same month', () => {
      const start = new Date(2026, 0, 1);
      const end = new Date(2026, 0, 1);
      const schedule = service.generatePaymentSchedule(
        'agreement-1',
        1000,
        start,
        end,
      );

      expect(schedule).toHaveLength(1);
      expect(schedule[0]).toMatchObject({
        paymentNumber: 1,
        amount: 1000,
        agreementId: 'agreement-1',
      });
    });

    it('generates one entry per month across the date range, inclusive', () => {
      const start = new Date(2026, 0, 1);
      const end = new Date(2026, 2, 1); // Jan 1 -> Mar 1: 3 entries
      const schedule = service.generatePaymentSchedule(
        'agreement-1',
        1000,
        start,
        end,
      );

      expect(schedule).toHaveLength(3);
      expect(schedule.map((s) => s.paymentNumber)).toEqual([1, 2, 3]);
    });

    it('carries the agreement id and amount on every entry', () => {
      const start = new Date(2026, 0, 1);
      const end = new Date(2026, 1, 1);
      const schedule = service.generatePaymentSchedule(
        'agreement-xyz',
        2500,
        start,
        end,
      );

      for (const entry of schedule) {
        expect(entry.agreementId).toBe('agreement-xyz');
        expect(entry.amount).toBe(2500);
      }
    });

    it('rolls over year boundaries correctly (Dec -> Jan)', () => {
      const start = new Date(2026, 11, 1); // Dec 1, 2026
      const end = new Date(2027, 0, 1); // Jan 1, 2027
      const schedule = service.generatePaymentSchedule(
        'agreement-1',
        1000,
        start,
        end,
      );

      expect(schedule).toHaveLength(2);
      expect(schedule[0].dueDate.getFullYear()).toBe(2026);
      expect(schedule[1].dueDate.getFullYear()).toBe(2027);
    });

    it('returns an empty schedule when start date is after end date', () => {
      const start = new Date(2026, 5, 1);
      const end = new Date(2026, 0, 1);
      const schedule = service.generatePaymentSchedule(
        'agreement-1',
        1000,
        start,
        end,
      );

      expect(schedule).toHaveLength(0);
    });
  });

  describe('getRentHistory', () => {
    it('throws AgreementNotFoundError when the agreement does not exist', async () => {
      agreementRepository.findOne.mockResolvedValue(null);

      await expect(service.getRentHistory('missing-id')).rejects.toThrow(
        AgreementNotFoundError,
      );
      expect(paymentRepository.find).not.toHaveBeenCalled();
    });

    it('returns payments ordered by payment date descending', async () => {
      const agreement = { id: 'agreement-1' } as RentAgreement;
      const payments = [
        { id: 'p1', paymentDate: new Date(2026, 1, 1) },
        { id: 'p2', paymentDate: new Date(2026, 0, 1) },
      ] as unknown as Payment[];

      agreementRepository.findOne.mockResolvedValue(agreement);
      paymentRepository.findAndCount.mockResolvedValue([
        payments,
        payments.length,
      ]);

      const result = await service.getRentHistory('agreement-1');

      expect(agreementRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'agreement-1' },
      });
      expect(paymentRepository.findAndCount).toHaveBeenCalledWith({
        where: { agreementId: 'agreement-1' },
        order: { paymentDate: 'DESC' },
        skip: 0,
        take: 20,
      });
      expect(result.data).toEqual(payments);
    });

    it('returns an empty array when the agreement has no payments', async () => {
      agreementRepository.findOne.mockResolvedValue({
        id: 'agreement-1',
      } as RentAgreement);
      paymentRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getRentHistory('agreement-1');

      expect(result.data).toEqual([]);
    });
  });
});
