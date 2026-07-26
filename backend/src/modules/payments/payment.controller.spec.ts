import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import {
  PaymentController,
  PaymentMethodController,
  AgreementPaymentController,
  PaymentScheduleController,
  PaymentWebhookController,
} from './payment.controller';
import { PaymentService } from './payment.service';
import { RefundService } from './refund.service';
import { ScheduleService } from './schedule.service';
import { PaymentWebhookService } from './payment-webhook.service';
import { AuditService } from '../audit/audit.service';
import { CreatePaymentRecordDto } from './dto/record-payment.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { CreatePaymentScheduleDto } from './dto/create-payment-schedule.dto';
import { PaymentInterval } from './entities/payment-schedule.entity';
import {
  CreateEscrowGatewayDto,
  ProcessStellarRentGatewayDto,
} from './dto/payment-gateway.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { RefundWebhookDto } from './dto/refund-webhook.dto';
import { WebhookSignatureGuard } from '../webhooks/guards/webhook-signature.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';

const mockPaymentService = {
  recordPayment: jest.fn(),
  processStellarRentPayment: jest.fn(),
  createEscrowDeposit: jest.fn(),
  releaseEscrowDeposit: jest.fn(),
  refundEscrowDeposit: jest.fn(),
  reconcileStellarPayments: jest.fn(),
  retryFailedPayments: jest.fn(),
  getPaymentAnalytics: jest.fn(),
  listPayments: jest.fn(),
  getPaymentById: jest.fn(),
  generateReceipt: jest.fn(),
  createPaymentMethod: jest.fn(),
  listPaymentMethods: jest.fn(),
  updatePaymentMethod: jest.fn(),
  removePaymentMethod: jest.fn(),
};

const mockRefundService = {
  processRefund: jest.fn(),
};

const mockScheduleService = {
  createPaymentSchedule: jest.fn(),
  listPaymentSchedules: jest.fn(),
  updatePaymentSchedule: jest.fn(),
  runPaymentSchedule: jest.fn(),
  processDueSchedules: jest.fn(),
};

const mockPaymentWebhookService = {
  handlePaymentGatewayWebhook: jest.fn(),
  handleRefundWebhook: jest.fn(),
};

describe('Payment Controllers', () => {
  let paymentController: PaymentController;
  let paymentMethodController: PaymentMethodController;
  let agreementPaymentController: AgreementPaymentController;
  let paymentScheduleController: PaymentScheduleController;
  let paymentWebhookController: PaymentWebhookController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        PaymentController,
        PaymentMethodController,
        AgreementPaymentController,
        PaymentScheduleController,
        PaymentWebhookController,
      ],
      providers: [
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
        {
          provide: RefundService,
          useValue: mockRefundService,
        },
        {
          provide: ScheduleService,
          useValue: mockScheduleService,
        },
        {
          provide: PaymentWebhookService,
          useValue: mockPaymentWebhookService,
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(WebhookSignatureGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(AuditLogInterceptor)
      .useValue({
        intercept(_ctx: ExecutionContext, next: CallHandler) {
          return next.handle();
        },
      })
      .compile();

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
    paymentWebhookController = module.get<PaymentWebhookController>(
      PaymentWebhookController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('records payment with user id', async () => {
    const dto: CreatePaymentRecordDto = {
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
    expect(mockRefundService.processRefund).toHaveBeenCalledWith(
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
    expect(mockScheduleService.createPaymentSchedule).toHaveBeenCalledWith(
      dto,
      'user_1',
    );
  });

  it('runs payment schedule with user id', async () => {
    await paymentScheduleController.runSchedule('schedule_1', {
      user: { id: 'user_1' },
    });
    expect(mockScheduleService.runPaymentSchedule).toHaveBeenCalledWith(
      'schedule_1',
      'user_1',
    );
  });

  it('processes due schedules', async () => {
    await paymentScheduleController.processDueSchedules();
    expect(mockScheduleService.processDueSchedules).toHaveBeenCalled();
  });

  it('processes stellar rent payment with user id', async () => {
    const dto: ProcessStellarRentGatewayDto = {
      userAddress: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      userSecret: 'SSECRET',
      agreementId: 'agreement_1',
      amount: '12.5',
    };
    await paymentController.processStellarRent(dto, { user: { id: 'user_1' } });
    expect(mockPaymentService.processStellarRentPayment).toHaveBeenCalledWith(
      dto,
      'user_1',
    );
  });

  it('creates stellar escrow deposit with user id', async () => {
    const dto: CreateEscrowGatewayDto = {
      sourcePublicKey:
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      destinationPublicKey:
        'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      amount: '100',
      agreementId: 'agreement_2',
    };
    await paymentController.createEscrowDeposit(dto, {
      user: { id: 'user_1' },
    });
    expect(mockPaymentService.createEscrowDeposit).toHaveBeenCalledWith(
      dto,
      'user_1',
    );
  });

  it('handles payment gateway webhook', async () => {
    const dto: PaymentWebhookDto = {
      eventType: 'payment.completed',
      paymentId: 'pay_1',
      status: 'completed',
    };
    await paymentWebhookController.handleGatewayWebhook(dto, 'secret');
    expect(
      mockPaymentWebhookService.handlePaymentGatewayWebhook,
    ).toHaveBeenCalledWith(dto, 'secret');
  });

  it('handles refund webhook', async () => {
    const dto: RefundWebhookDto = {
      eventType: 'refund.completed',
      paymentId: 'pay_1',
      status: 'completed',
      amount: 50,
    };
    await paymentWebhookController.handleRefundWebhook(dto, 'secret');
    expect(mockPaymentWebhookService.handleRefundWebhook).toHaveBeenCalledWith(
      dto,
      'secret',
    );
  });
});
