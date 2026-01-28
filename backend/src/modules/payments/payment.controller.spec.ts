import { Test, TestingModule } from '@nestjs/testing';
import {
  PaymentController,
  PaymentMethodController,
  AgreementPaymentController,
  PaymentScheduleController,
} from './payment.controller';
import { PaymentService } from './payment.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { CreatePaymentScheduleDto } from './dto/create-payment-schedule.dto';
import { PaymentInterval } from './entities/payment-schedule.entity';

const mockPaymentService = {
  recordPayment: jest.fn(),
  listPayments: jest.fn(),
  getPaymentById: jest.fn(),
  processRefund: jest.fn(),
  generateReceipt: jest.fn(),
  createPaymentMethod: jest.fn(),
  listPaymentMethods: jest.fn(),
  updatePaymentMethod: jest.fn(),
  removePaymentMethod: jest.fn(),
  createPaymentSchedule: jest.fn(),
  listPaymentSchedules: jest.fn(),
  updatePaymentSchedule: jest.fn(),
  runPaymentSchedule: jest.fn(),
  processDueSchedules: jest.fn(),
};

describe('Payment Controllers', () => {
  let paymentController: PaymentController;
  let paymentMethodController: PaymentMethodController;
  let agreementPaymentController: AgreementPaymentController;
  let paymentScheduleController: PaymentScheduleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        PaymentController,
        PaymentMethodController,
        AgreementPaymentController,
        PaymentScheduleController,
      ],
      providers: [
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
      ],
    }).compile();

    paymentController = module.get<PaymentController>(PaymentController);
    paymentMethodController = module.get<PaymentMethodController>(
      PaymentMethodController,
    );
    agreementPaymentController = module.get<AgreementPaymentController>(
      AgreementPaymentController,
    );
    paymentScheduleController = module.get<PaymentScheduleController>(
      PaymentScheduleController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('records payment with user id', async () => {
    const dto: RecordPaymentDto = {
      agreementId: 'agreement_1',
      amount: 100,
      paymentMethodId: '1',
    };
    await paymentController.recordPayment(dto, { user: { id: 'user_1' } });
    expect(mockPaymentService.recordPayment).toHaveBeenCalledWith(
      dto,
      'user_1',
    );
  });

  it('processes refund with user id', async () => {
    const dto: ProcessRefundDto = { amount: 50, reason: 'test' };
    await paymentController.processRefund('pay_1', dto, {
      user: { id: 'user_1' },
    });
    expect(mockPaymentService.processRefund).toHaveBeenCalledWith(
      'pay_1',
      dto,
      'user_1',
    );
  });

  it('creates payment method with user id', async () => {
    const dto: CreatePaymentMethodDto = {
      paymentType: 'CREDIT_CARD',
      lastFour: '1234',
    };
    await paymentMethodController.createPaymentMethod(dto, {
      user: { id: 'user_1' },
    });
    expect(mockPaymentService.createPaymentMethod).toHaveBeenCalledWith(
      dto,
      'user_1',
    );
  });

  it('updates payment method with user id', async () => {
    const dto: UpdatePaymentMethodDto = { lastFour: '9876' };
    await paymentMethodController.updatePaymentMethod('1', dto, {
      user: { id: 'user_1' },
    });
    expect(mockPaymentService.updatePaymentMethod).toHaveBeenCalledWith(
      1,
      dto,
      'user_1',
    );
  });

  it('lists agreement payments with user id', async () => {
    await agreementPaymentController.getPaymentsForAgreement('agreement_1', {
      user: { id: 'user_1' },
    });
    expect(mockPaymentService.listPayments).toHaveBeenCalledWith(
      { agreementId: 'agreement_1' },
      'user_1',
    );
  });

  it('creates payment schedule with user id', async () => {
    const dto: CreatePaymentScheduleDto = {
      agreementId: 'agreement_1',
      paymentMethodId: '1',
      amount: 200,
      interval: PaymentInterval.MONTHLY,
    };
    await paymentScheduleController.createSchedule(dto, {
      user: { id: 'user_1' },
    });
    expect(mockPaymentService.createPaymentSchedule).toHaveBeenCalledWith(
      dto,
      'user_1',
    );
  });

  it('runs payment schedule with user id', async () => {
    await paymentScheduleController.runSchedule('schedule_1', {
      user: { id: 'user_1' },
    });
    expect(mockPaymentService.runPaymentSchedule).toHaveBeenCalledWith(
      'schedule_1',
      'user_1',
    );
  });

  it('processes due schedules', async () => {
    await paymentScheduleController.processDueSchedules();
    expect(mockPaymentService.processDueSchedules).toHaveBeenCalled();
  });
});
