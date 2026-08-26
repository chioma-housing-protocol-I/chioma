import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import {
  PaymentSchedule,
  PaymentScheduleStatus,
} from './entities/payment-schedule.entity';
import { CreatePaymentScheduleDto } from './dto/create-payment-schedule.dto';
import { PaymentScheduleFiltersDto } from './dto/payment-schedule-filters.dto';
import { UpdatePaymentScheduleDto } from './dto/update-payment-schedule.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { addDays, calculateNextRunAt, ensureUserId } from './payment.helpers';
import { PaymentService } from './payment.service';
import { PaginationUtils } from '../../common/utils';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(PaymentSchedule)
    private readonly paymentScheduleRepository: Repository<PaymentSchedule>,
    private readonly notificationsService: NotificationsService,
    private readonly paymentService: PaymentService,
  ) {}

  async createPaymentSchedule(
    dto: CreatePaymentScheduleDto,
    userId: string,
  ): Promise<PaymentSchedule> {
    ensureUserId(userId);

    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id: parseInt(dto.paymentMethodId), userId },
    });
    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    const nextRunAt = dto.startDate ? new Date(dto.startDate) : new Date();

    const schedule = this.paymentScheduleRepository.create({
      userId,
      agreementId: dto.agreementId ?? null,
      paymentMethodId: paymentMethod.id,
      amount: dto.amount,
      currency: dto.currency ?? 'NGN',
      interval: dto.interval,
      nextRunAt,
      maxRetries: dto.maxRetries ?? 3,
      status: PaymentScheduleStatus.ACTIVE,
    });

    return this.paymentScheduleRepository.save(schedule);
  }

  async updatePaymentSchedule(
    id: string,
    dto: UpdatePaymentScheduleDto,
    userId: string,
  ): Promise<PaymentSchedule> {
    ensureUserId(userId);
    const schedule = await this.paymentScheduleRepository.findOne({
      where: { id, userId },
    });

    if (!schedule) {
      throw new NotFoundException('Payment schedule not found');
    }

    if (dto.status) {
      schedule.status = dto.status;
    }
    if (dto.nextRunAt) {
      schedule.nextRunAt = new Date(dto.nextRunAt);
    }
    if (typeof dto.maxRetries === 'number') {
      schedule.maxRetries = dto.maxRetries;
    }

    return this.paymentScheduleRepository.save(schedule);
  }

  async listPaymentSchedules(filters: PaymentScheduleFiltersDto, userId: string) {
    ensureUserId(userId);
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    PaginationUtils.validatePagination(page, limit);

    const query = this.paymentScheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.paymentMethod', 'paymentMethod');

    query.andWhere('schedule.userId = :userId', { userId });
    if (filters.agreementId) {
      query.andWhere('schedule.agreementId = :agreementId', {
        agreementId: filters.agreementId,
      });
    }
    if (filters.status) {
      query.andWhere('schedule.status = :status', { status: filters.status });
    }

    const [data, total] = await query
      .orderBy('schedule.nextRunAt', 'ASC')
      .skip(PaginationUtils.calculateOffset(page, limit))
      .take(limit)
      .getManyAndCount();

    return PaginationUtils.buildPaginationResponse(data, total, page, limit);
  }

  async runPaymentSchedule(id: string, userId: string): Promise<Payment> {
    ensureUserId(userId);
    const schedule = await this.paymentScheduleRepository.findOne({
      where: { id, userId },
    });

    if (!schedule) {
      throw new NotFoundException('Payment schedule not found');
    }

    if (schedule.status !== PaymentScheduleStatus.ACTIVE) {
      throw new BadRequestException('Payment schedule is not active');
    }

    return this.processSchedulePayment(schedule);
  }

  async processDueSchedules(limit = 50): Promise<Payment[]> {
    const now = new Date();
    const dueSchedules = await this.paymentScheduleRepository.find({
      where: {
        status: PaymentScheduleStatus.ACTIVE,
        nextRunAt: LessThanOrEqual(now),
      },
      order: { nextRunAt: 'ASC' },
      take: limit,
    });
    const results: Payment[] = [];

    for (const schedule of dueSchedules) {
      results.push(await this.processSchedulePayment(schedule));
    }

    return results;
  }

  private async processSchedulePayment(
    schedule: PaymentSchedule,
  ): Promise<Payment> {
    if (!schedule.paymentMethodId) {
      schedule.status = PaymentScheduleStatus.FAILED;
      schedule.lastError = 'Payment method is missing';
      await this.paymentScheduleRepository.save(schedule);
      await this.notificationsService.notify(
        schedule.userId,
        'Recurring payment failed',
        `We could not process your scheduled payment. ${schedule.lastError}`.trim(),
        'PAYMENT_FAILED',
      );
      throw new BadRequestException('Payment method is missing');
    }

    const idempotencyKey = `${schedule.id}-${schedule.nextRunAt.getTime()}`;
    try {
      const payment = await this.paymentService.recordPayment(
        {
          agreementId: schedule.agreementId ?? undefined,
          amount: Number(schedule.amount),
          paymentMethodId: String(schedule.paymentMethodId),
          idempotencyKey,
          notes: 'Recurring payment',
        },
        schedule.userId,
      );

      schedule.retries = 0;
      schedule.lastError = null;
      schedule.nextRunAt = calculateNextRunAt(
        schedule.nextRunAt,
        schedule.interval,
      );
      await this.paymentScheduleRepository.save(schedule);

      await this.notificationsService.notify(
        schedule.userId,
        'Recurring payment processed',
        `Your scheduled payment of ${payment.amount} ${payment.currency} was processed successfully.`,
        'PAYMENT_SCHEDULED',
      );
      return payment;
    } catch (error) {
      schedule.retries += 1;
      schedule.lastError = error instanceof Error ? error.message : 'Failed';

      if (schedule.retries >= schedule.maxRetries) {
        schedule.status = PaymentScheduleStatus.FAILED;
      } else {
        schedule.nextRunAt = addDays(schedule.nextRunAt, 1);
      }

      await this.paymentScheduleRepository.save(schedule);

      await this.notificationsService.notify(
        schedule.userId,
        'Recurring payment failed',
        `We could not process your scheduled payment. ${schedule.lastError ?? ''}`.trim(),
        'PAYMENT_FAILED',
      );
      throw error;
    }
  }
}
