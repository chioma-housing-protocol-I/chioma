import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { PaymentService } from './payment.service';
import { PaymentMethod } from './entities/payment-method.entity';
import {
  PaymentSchedule,
  PaymentScheduleStatus,
  PaymentInterval,
} from './entities/payment-schedule.entity';
import { Payment } from './entities/payment.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePaymentScheduleDto } from './dto/create-payment-schedule.dto';

const mockPaymentMethodRepository = () => ({
  findOne: jest.fn(),
});

const mockPaymentScheduleRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockNotificationsService = {
  notify: jest.fn(),
};

const mockPaymentService = {
  recordPayment: jest.fn(),
};

describe('ScheduleService', () => {
  let service: ScheduleService;
  let paymentMethodRepository: ReturnType<typeof mockPaymentMethodRepository>;
  let paymentScheduleRepository: ReturnType<
    typeof mockPaymentScheduleRepository
  >;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        {
          provide: getRepositoryToken(PaymentMethod),
          useFactory: mockPaymentMethodRepository,
        },
        {
          provide: getRepositoryToken(PaymentSchedule),
          useFactory: mockPaymentScheduleRepository,
        },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: PaymentService, useValue: mockPaymentService },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
    paymentMethodRepository = module.get(getRepositoryToken(PaymentMethod));
    paymentScheduleRepository = module.get(getRepositoryToken(PaymentSchedule));
  });

  afterEach(() => jest.clearAllMocks());

  describe('createPaymentSchedule', () => {
    it('creates payment schedule successfully', async () => {
      const dto: CreatePaymentScheduleDto = {
        agreementId: 'agreement_1',
        paymentMethodId: '1',
        amount: 100,
        interval: PaymentInterval.MONTHLY,
      };

      paymentMethodRepository.findOne.mockResolvedValue({
        id: 1,
        userId: 'user_1',
      });
      paymentScheduleRepository.create.mockImplementation(
        (data: Partial<PaymentSchedule>) => data as PaymentSchedule,
      );
      paymentScheduleRepository.save.mockResolvedValue({
        id: 'schedule_1',
        ...dto,
      });

      const result = await service.createPaymentSchedule(dto, 'user_1');

      expect(result.id).toBe('schedule_1');
      const [createdSchedule] = paymentScheduleRepository.create.mock
        .calls[0] as [Partial<PaymentSchedule>];
      expect(createdSchedule.status).toBe(PaymentScheduleStatus.ACTIVE);
    });

    it('throws when payment method is not found', async () => {
      paymentMethodRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createPaymentSchedule(
          {
            agreementId: 'agr-1',
            paymentMethodId: 'pm-missing',
            amount: 500,
            interval: PaymentInterval.MONTHLY,
          } as CreatePaymentScheduleDto,
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('runPaymentSchedule', () => {
    it('throws when schedule is not active', async () => {
      const schedule = {
        id: 'schedule_1',
        userId: 'user_1',
        status: PaymentScheduleStatus.PAUSED,
      } as PaymentSchedule;

      paymentScheduleRepository.findOne.mockResolvedValue(schedule);

      await expect(
        service.runPaymentSchedule('schedule_1', 'user_1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException when schedule does not exist', async () => {
      paymentScheduleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.runPaymentSchedule('missing', 'user_1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('fails schedule when payment method is missing', async () => {
      const schedule = {
        id: 'schedule_missing_method',
        userId: 'user_1',
        status: PaymentScheduleStatus.ACTIVE,
        paymentMethodId: null,
        retries: 0,
        maxRetries: 3,
        nextRunAt: new Date(),
      } as unknown as PaymentSchedule;
      paymentScheduleRepository.findOne.mockResolvedValue(schedule);
      paymentScheduleRepository.save.mockResolvedValue(schedule);

      await expect(
        service.runPaymentSchedule('schedule_missing_method', 'user_1'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(paymentScheduleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'schedule_missing_method',
          status: PaymentScheduleStatus.FAILED,
        }),
      );
      expect(mockNotificationsService.notify).toHaveBeenCalledWith(
        'user_1',
        'Recurring payment failed',
        expect.stringContaining('Payment method is missing'),
        'PAYMENT_FAILED',
      );
    });

    it('runs the schedule via PaymentService.recordPayment and advances nextRunAt', async () => {
      const schedule = {
        id: 'schedule_1',
        userId: 'user_1',
        agreementId: 'agreement_1',
        status: PaymentScheduleStatus.ACTIVE,
        paymentMethodId: 5,
        amount: 100,
        interval: PaymentInterval.MONTHLY,
        retries: 0,
        maxRetries: 3,
        nextRunAt: new Date('2026-01-01T00:00:00.000Z'),
      } as unknown as PaymentSchedule;
      paymentScheduleRepository.findOne.mockResolvedValue(schedule);
      paymentScheduleRepository.save.mockImplementation((s) =>
        Promise.resolve(s),
      );
      mockPaymentService.recordPayment.mockResolvedValue({
        id: 'pay_1',
        amount: 100,
        currency: 'NGN',
      } as Payment);

      const result = await service.runPaymentSchedule('schedule_1', 'user_1');

      expect(result.id).toBe('pay_1');
      expect(mockPaymentService.recordPayment).toHaveBeenCalledWith(
        expect.objectContaining({ paymentMethodId: '5', amount: 100 }),
        'user_1',
      );
      expect(mockNotificationsService.notify).toHaveBeenCalledWith(
        'user_1',
        'Recurring payment processed',
        expect.any(String),
        'PAYMENT_SCHEDULED',
      );
    });

    it('reschedules for retry when recordPayment fails and retries remain', async () => {
      const schedule = {
        id: 'schedule_1',
        userId: 'user_1',
        status: PaymentScheduleStatus.ACTIVE,
        paymentMethodId: 5,
        amount: 100,
        interval: PaymentInterval.MONTHLY,
        retries: 0,
        maxRetries: 3,
        nextRunAt: new Date('2026-01-01T00:00:00.000Z'),
      } as unknown as PaymentSchedule;
      paymentScheduleRepository.findOne.mockResolvedValue(schedule);
      paymentScheduleRepository.save.mockImplementation((s) =>
        Promise.resolve(s),
      );
      mockPaymentService.recordPayment.mockRejectedValue(
        new Error('gateway down'),
      );

      await expect(
        service.runPaymentSchedule('schedule_1', 'user_1'),
      ).rejects.toThrow('gateway down');

      expect(schedule.retries).toBe(1);
      expect(schedule.status).toBe(PaymentScheduleStatus.ACTIVE);
      expect(mockNotificationsService.notify).toHaveBeenCalledWith(
        'user_1',
        'Recurring payment failed',
        expect.any(String),
        'PAYMENT_FAILED',
      );
    });

    it('marks schedule FAILED once max retries are exhausted', async () => {
      const schedule = {
        id: 'schedule_1',
        userId: 'user_1',
        status: PaymentScheduleStatus.ACTIVE,
        paymentMethodId: 5,
        amount: 100,
        interval: PaymentInterval.MONTHLY,
        retries: 2,
        maxRetries: 3,
        nextRunAt: new Date('2026-01-01T00:00:00.000Z'),
      } as unknown as PaymentSchedule;
      paymentScheduleRepository.findOne.mockResolvedValue(schedule);
      paymentScheduleRepository.save.mockImplementation((s) =>
        Promise.resolve(s),
      );
      mockPaymentService.recordPayment.mockRejectedValue(
        new Error('gateway down'),
      );

      await expect(
        service.runPaymentSchedule('schedule_1', 'user_1'),
      ).rejects.toThrow('gateway down');

      expect(schedule.retries).toBe(3);
      expect(schedule.status).toBe(PaymentScheduleStatus.FAILED);
    });
  });

  describe('processDueSchedules', () => {
    it('processes each due schedule and returns the resulting payments', async () => {
      const schedule = {
        id: 'schedule_1',
        userId: 'user_1',
        status: PaymentScheduleStatus.ACTIVE,
        paymentMethodId: 5,
        amount: 100,
        interval: PaymentInterval.MONTHLY,
        retries: 0,
        maxRetries: 3,
        nextRunAt: new Date('2020-01-01T00:00:00.000Z'),
      } as unknown as PaymentSchedule;
      paymentScheduleRepository.find.mockResolvedValue([schedule]);
      paymentScheduleRepository.save.mockImplementation((s) =>
        Promise.resolve(s),
      );
      mockPaymentService.recordPayment.mockResolvedValue({
        id: 'pay_1',
        amount: 100,
        currency: 'NGN',
      } as Payment);

      const result = await service.processDueSchedules(10);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('pay_1');
    });
  });
});
