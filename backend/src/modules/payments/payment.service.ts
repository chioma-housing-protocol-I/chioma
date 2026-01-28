import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import {
  Payment,
  PaymentStatus,
  PaymentMetadata,
} from './entities/payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import {
  PaymentSchedule,
  PaymentInterval,
  PaymentScheduleStatus,
} from './entities/payment-schedule.entity';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { PaymentFiltersDto } from './dto/payment-filters.dto';
import { PaymentGatewayService } from './payment-gateway.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PaymentMethodFiltersDto } from './dto/payment-method-filters.dto';
import { CreatePaymentScheduleDto } from './dto/create-payment-schedule.dto';
import { PaymentScheduleFiltersDto } from './dto/payment-schedule-filters.dto';
import { UpdatePaymentScheduleDto } from './dto/update-payment-schedule.dto';
import {
  createCipheriv,
  randomBytes,
  createHash,
  createDecipheriv,
} from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(PaymentSchedule)
    private readonly paymentScheduleRepository: Repository<PaymentSchedule>,
    private readonly paymentGateway: PaymentGatewayService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  async recordPayment(dto: RecordPaymentDto, userId: string): Promise<Payment> {
    this.ensureUserId(userId);

    const idempotencyKey = this.getIdempotencyKey(dto);

    if (idempotencyKey) {
      const existingPayment = await this.paymentRepository.findOne({
        where: { userId, idempotencyKey },
      });
      if (existingPayment) {
        return existingPayment;
      }
    }

    // Validate payment method exists and belongs to user
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id: parseInt(dto.paymentMethodId), userId },
    });
    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    // Calculate fees (mock: 2% fee)
    const feeAmount = dto.amount * 0.02;
    const netAmount = dto.amount - feeAmount;

    const user = await this.usersService.findById(userId);
    const decryptedMetadata = this.decryptMetadata(
      paymentMethod.encryptedMetadata,
    );

    // Process payment through gateway
    const chargeResult = await Promise.resolve(
      this.paymentGateway.chargePayment({
        paymentMethod,
        amount: dto.amount,
        currency: 'NGN',
        userEmail: user.email,
        decryptedMetadata,
        idempotencyKey,
      }),
    );

    if (!chargeResult.success) {
      const failedPayment = this.paymentRepository.create({
        userId,
        agreementId: dto.agreementId ?? null,
        amount: dto.amount,
        feeAmount,
        netAmount,
        currency: 'NGN',
        status: PaymentStatus.FAILED,
        paymentMethodId: paymentMethod.id,
        referenceNumber: dto.referenceNumber,
        processedAt: new Date(),
        metadata: { error: chargeResult.error } as PaymentMetadata,
        notes: dto.notes,
        idempotencyKey,
      });
      await this.paymentRepository.save(failedPayment);
      await this.notificationsService.notify(
        userId,
        'Payment failed',
        `Your payment of ${dto.amount} NGN could not be processed.`,
        'PAYMENT_FAILED',
      );
      throw new BadRequestException('Payment processing failed');
    }

    // Create payment record
    const payment = this.paymentRepository.create({
      userId,
      agreementId: dto.agreementId ?? null,
      amount: dto.amount,
      feeAmount,
      netAmount,
      currency: 'NGN',
      status: PaymentStatus.COMPLETED,
      paymentMethodId: paymentMethod.id,
      referenceNumber: dto.referenceNumber || chargeResult.chargeId,
      processedAt: new Date(),
      metadata: { chargeId: chargeResult.chargeId },
      notes: dto.notes,
      idempotencyKey,
    });

    const savedPayment = await this.paymentRepository.save(payment);
    this.logger.log(`Payment recorded: ${savedPayment.id}`);

    await this.notificationsService.notify(
      userId,
      'Payment received',
      `Your payment of ${savedPayment.amount} ${savedPayment.currency} was recorded successfully.`,
      'PAYMENT_RECEIVED',
    );

    return savedPayment;
  }

  async processRefund(
    paymentId: string,
    dto: ProcessRefundDto,
    userId: string,
  ): Promise<Payment> {
    this.ensureUserId(userId);
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, userId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    if (dto.amount > payment.amount - payment.refundedAmount) {
      throw new BadRequestException('Refund amount exceeds available amount');
    }

    // Process refund through gateway
    const chargeId = payment.metadata?.chargeId;
    if (!chargeId) {
      throw new BadRequestException('No charge ID found for refund');
    }
    const refundResult = await Promise.resolve(
      this.paymentGateway.processRefund(chargeId, dto.amount),
    );

    if (!refundResult.success) {
      throw new BadRequestException('Refund processing failed');
    }

    // Update payment
    payment.refundedAmount += dto.amount;
    payment.refundReason = dto.reason;
    payment.status =
      payment.refundedAmount >= payment.amount
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIAL_REFUND;
    payment.metadata = {
      ...(payment.metadata ?? {}),
      refundId: refundResult.refundId,
    };

    const updatedPayment = await this.paymentRepository.save(payment);
    this.logger.log(`Refund processed for payment: ${paymentId}`);

    await this.notificationsService.notify(
      userId,
      'Refund processed',
      `Your refund of ${dto.amount} ${payment.currency} was processed successfully.`,
      'PAYMENT_REFUNDED',
    );

    return updatedPayment;
  }

  async generateReceipt(paymentId: string, userId: string): Promise<any> {
    this.ensureUserId(userId);
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, userId },
      relations: ['user', 'paymentMethod'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const receipt = {
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      processedAt: payment.processedAt,
      referenceNumber: payment.referenceNumber,
      user: {
        id: payment.user.id,
        email: payment.user.email,
      },
      paymentMethod: payment.paymentMethod
        ? {
            type: payment.paymentMethod.paymentType,
            lastFour: payment.paymentMethod.lastFour,
          }
        : null,
    };

    return {
      receipt,
      contentType: 'text/plain',
      fileName: `receipt-${payment.id}.txt`,
      data: Buffer.from(
        [
          'CHIOMA PAYMENT RECEIPT',
          `Payment ID: ${receipt.paymentId}`,
          `Amount: ${receipt.amount} ${receipt.currency}`,
          `Status: ${receipt.status}`,
          `Reference: ${receipt.referenceNumber ?? 'N/A'}`,
          `Processed At: ${receipt.processedAt?.toISOString() ?? 'N/A'}`,
          `User Email: ${receipt.user.email}`,
          receipt.paymentMethod
            ? `Payment Method: ${receipt.paymentMethod.type} (${receipt.paymentMethod.lastFour ?? 'N/A'})`
            : 'Payment Method: N/A',
        ].join('\n'),
        'utf8',
      ).toString('base64'),
    };
  }

  async listPayments(
    filters: PaymentFiltersDto,
    userId: string,
  ): Promise<Payment[]> {
    this.ensureUserId(userId);
    const query = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.user', 'user')
      .leftJoinAndSelect('payment.paymentMethod', 'paymentMethod');

    query.andWhere('payment.userId = :userId', { userId });

    if (filters.agreementId) {
      query.andWhere('payment.agreementId = :agreementId', {
        agreementId: filters.agreementId,
      });
    }

    if (filters.status) {
      query.andWhere('payment.status = :status', { status: filters.status });
    }

    if (filters.startDate) {
      query.andWhere('payment.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      query.andWhere('payment.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters.paymentMethodId) {
      query.andWhere('payment.paymentMethodId = :paymentMethodId', {
        paymentMethodId: parseInt(filters.paymentMethodId),
      });
    }

    query.orderBy('payment.createdAt', 'DESC');

    return query.getMany();
  }

  async getPaymentById(id: string, userId: string): Promise<Payment> {
    this.ensureUserId(userId);
    const payment = await this.paymentRepository.findOne({
      where: { id, userId },
      relations: ['user', 'paymentMethod'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async createPaymentMethod(
    dto: CreatePaymentMethodDto,
    userId: string,
  ): Promise<PaymentMethod> {
    this.ensureUserId(userId);

    if (dto.isDefault) {
      await this.paymentMethodRepository.update(
        { userId, isDefault: true },
        { isDefault: false },
      );
    }

    const encryptedMetadata = dto.sensitiveMetadata
      ? this.encryptMetadata(dto.sensitiveMetadata)
      : null;

    const paymentMethod = this.paymentMethodRepository.create({
      userId,
      paymentType: dto.paymentType,
      lastFour: dto.lastFour,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      isDefault: dto.isDefault ?? false,
      metadata: dto.metadata ?? null,
      encryptedMetadata,
    });

    return this.paymentMethodRepository.save(paymentMethod);
  }

  async updatePaymentMethod(
    id: number,
    dto: UpdatePaymentMethodDto,
    userId: string,
  ): Promise<PaymentMethod> {
    this.ensureUserId(userId);
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id, userId },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    if (dto.isDefault) {
      await this.paymentMethodRepository.update(
        { userId, isDefault: true },
        { isDefault: false },
      );
    }

    paymentMethod.lastFour = dto.lastFour ?? paymentMethod.lastFour;
    paymentMethod.expiryDate = dto.expiryDate
      ? new Date(dto.expiryDate)
      : paymentMethod.expiryDate;
    paymentMethod.isDefault = dto.isDefault ?? paymentMethod.isDefault;
    paymentMethod.metadata = dto.metadata ?? paymentMethod.metadata;

    return this.paymentMethodRepository.save(paymentMethod);
  }

  async listPaymentMethods(
    filters: PaymentMethodFiltersDto,
    userId: string,
  ): Promise<PaymentMethod[]> {
    this.ensureUserId(userId);
    const query = this.paymentMethodRepository.createQueryBuilder('method');

    query.andWhere('method.userId = :userId', { userId });

    if (typeof filters.isDefault === 'boolean') {
      query.andWhere('method.isDefault = :isDefault', {
        isDefault: filters.isDefault,
      });
    }

    return query.orderBy('method.createdAt', 'DESC').getMany();
  }

  async removePaymentMethod(id: number, userId: string): Promise<void> {
    this.ensureUserId(userId);
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id, userId },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    await this.paymentMethodRepository.remove(paymentMethod);
  }

  async createPaymentSchedule(
    dto: CreatePaymentScheduleDto,
    userId: string,
  ): Promise<PaymentSchedule> {
    this.ensureUserId(userId);

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
    this.ensureUserId(userId);
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

  async listPaymentSchedules(
    filters: PaymentScheduleFiltersDto,
    userId: string,
  ): Promise<PaymentSchedule[]> {
    this.ensureUserId(userId);
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

    return query.orderBy('schedule.nextRunAt', 'ASC').getMany();
  }

  async runPaymentSchedule(id: string, userId: string): Promise<Payment> {
    this.ensureUserId(userId);
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
      throw new BadRequestException('Payment method is missing');
    }

    const idempotencyKey = `${schedule.id}-${schedule.nextRunAt.getTime()}`;
    try {
      const payment = await this.recordPayment(
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
      schedule.nextRunAt = this.calculateNextRunAt(
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
        schedule.nextRunAt = this.addDays(schedule.nextRunAt, 1);
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

  private calculateNextRunAt(date: Date, interval: PaymentInterval): Date {
    const next = new Date(date.getTime());
    switch (interval) {
      case PaymentInterval.WEEKLY:
        return this.addDays(next, 7);
      case PaymentInterval.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        return next;
      case PaymentInterval.QUARTERLY:
        next.setMonth(next.getMonth() + 3);
        return next;
      case PaymentInterval.YEARLY:
        next.setFullYear(next.getFullYear() + 1);
        return next;
      default:
        return this.addDays(next, 30);
    }
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date.getTime());
    next.setDate(next.getDate() + days);
    return next;
  }

  private getIdempotencyKey(dto: RecordPaymentDto): string | null {
    const key = (dto as { idempotencyKey?: unknown }).idempotencyKey;
    return typeof key === 'string' ? key : null;
  }

  private ensureUserId(userId: string): void {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
  }

  private encryptMetadata(data: Record<string, unknown>): string {
    const secret = process.env.PAYMENT_METADATA_SECRET;
    if (!secret) {
      throw new BadRequestException(
        'PAYMENT_METADATA_SECRET is required to store sensitive metadata',
      );
    }

    const iv = randomBytes(12);
    const key = createHash('sha256').update(secret).digest();
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const payload = Buffer.from(JSON.stringify(data));
    const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decryptMetadata(
    payload: string | null,
  ): Record<string, unknown> | null {
    if (!payload) {
      return null;
    }

    const secret = process.env.PAYMENT_METADATA_SECRET;
    if (!secret) {
      return null;
    }

    const [ivHex, tagHex, dataHex] = payload.split(':');
    if (!ivHex || !tagHex || !dataHex) {
      return null;
    }

    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    const key = createHash('sha256').update(secret).digest();
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8')) as Record<string, unknown>;
  }
}
