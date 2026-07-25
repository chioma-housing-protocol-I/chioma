import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Payment,
  PaymentStatus,
  PaymentMetadata,
} from './entities/payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { CreatePaymentRecordDto } from './dto/record-payment.dto';
import { PaymentFiltersDto } from './dto/payment-filters.dto';
import { PaymentGatewayService } from './payment-gateway.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PaymentMethodFiltersDto } from './dto/payment-method-filters.dto';
import { NotificationsService } from '../notifications/notifications.service';
import {
  decryptMetadata,
  encryptMetadata,
  ensureUserId,
  getIdempotencyKey,
} from './payment.helpers';
import { runBatch, BatchResult } from '../../common/utils/batch.utils';
import { PaymentProcessingService } from '../stellar/services/payment-processing.service';
import { StellarService } from '../stellar/services/stellar.service';
import * as StellarSdk from '@stellar/stellar-sdk';
import { Locked, LockService } from '../../common/lock';
import {
  CreateEscrowGatewayDto,
  ProcessStellarRentGatewayDto,
} from './dto/payment-gateway.dto';
import { RefundEscrowDto, ReleaseEscrowDto } from '../stellar/dto/escrow.dto';
import { TransactionStatus } from '../stellar/entities/stellar-transaction.entity';
import { Idempotent, IdempotencyService } from '../../common/idempotency';
import { FraudHooksService } from '../fraud/fraud-hooks.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
    private readonly paymentGateway: PaymentGatewayService,
    private readonly notificationsService: NotificationsService,
    private readonly paymentProcessingService: PaymentProcessingService,
    private readonly stellarService: StellarService,
    private readonly lockService: LockService,
    private readonly idempotencyService: IdempotencyService,
    private readonly fraudHooksService: FraudHooksService,
  ) {}

  @Locked({
    key: (dto: CreatePaymentRecordDto) =>
      `payment:record:${dto.paymentMethodId ?? 'unknown'}`,
    ttlMs: 5000,
  })
  @Idempotent({
    ttlMs: 86_400_000,
    key: (dto: CreatePaymentRecordDto, userId: string) => {
      const requestKey = getIdempotencyKey(dto);
      return requestKey ? `payment:create:${userId}:${requestKey}` : null;
    },
    requireKey: false,
  })
  async recordPayment(
    dto: CreatePaymentRecordDto,
    userId: string,
  ): Promise<Payment> {
    ensureUserId(userId);

    // Validate payment amount with proper bounds checking
    if (!Number.isFinite(dto.amount) || Number.isNaN(dto.amount)) {
      throw new BadRequestException('Payment amount must be a valid number');
    }
    if (dto.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }
    if (dto.amount > 999999999.99) {
      throw new BadRequestException(
        'Payment amount cannot exceed 999,999,999.99',
      );
    }
    // Check for decimal precision (max 2 decimal places for currency)
    if (!Number.isInteger(dto.amount * 100)) {
      throw new BadRequestException(
        'Payment amount can have at most 2 decimal places',
      );
    }

    const idempotencyKey = getIdempotencyKey(dto);

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
    const transactionFee = dto.amount * 0.02;
    const netAmount = dto.amount - transactionFee;

    // Note: In production, fetch actual user email from UsersService.findById(userId)
    // For now, using userId as fallback since UsersService has unrelated type issues
    const userEmail = `user_${userId}@chioma.local`;

    const decryptedMetadata = decryptMetadata(paymentMethod.encryptedMetadata);

    // Process payment through gateway
    const chargeResult = await Promise.resolve(
      this.paymentGateway.chargePayment({
        paymentMethod,
        amount: dto.amount,
        currency: 'NGN',
        userEmail,
        decryptedMetadata,
        idempotencyKey,
      }),
    );

    if (!chargeResult.success) {
      const failedPayment = this.paymentRepository.create({
        userId,
        agreementId: dto.agreementId ?? null,
        amount: dto.amount,
        transactionFee,
        netAmount,
        currency: 'NGN',
        status: PaymentStatus.FAILED,
        paymentMethod: paymentMethod.paymentType,
        paymentMethodRelationId: paymentMethod.id,
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
      transactionFee,
      netAmount,
      currency: 'NGN',
      status: PaymentStatus.COMPLETED,
      paymentMethod: paymentMethod.paymentType,
      paymentMethodRelationId: paymentMethod.id,
      referenceNumber: dto.referenceNumber || chargeResult.chargeId,
      processedAt: new Date(),
      metadata: { chargeId: chargeResult.chargeId },
      notes: dto.notes,
      idempotencyKey,
    });

    const savedPayment = await this.paymentRepository.save(payment);
    this.logger.log(`Payment recorded: ${savedPayment.id}`);

    void this.fraudHooksService.onPaymentRecorded({
      userId,
      amount: Number(savedPayment.amount),
      currency: savedPayment.currency,
      paymentMethod: savedPayment.paymentMethod ?? undefined,
    });

    await this.notificationsService.notify(
      userId,
      'Payment received',
      `Your payment of ${savedPayment.amount} ${savedPayment.currency} was recorded successfully.`,
      'PAYMENT_RECEIVED',
    );

    return savedPayment;
  }

  async generateReceipt(paymentId: string, userId: string): Promise<any> {
    ensureUserId(userId);
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, userId },
      relations: ['user', 'paymentMethodRelation'],
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
      paymentMethod: payment.paymentMethodRelation
        ? {
            type: payment.paymentMethodRelation.paymentType,
            lastFour: payment.paymentMethodRelation.lastFour,
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
    ensureUserId(userId);
    const query = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.user', 'user')
      .leftJoinAndSelect('payment.paymentMethodRelation', 'paymentMethod');

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
    ensureUserId(userId);
    const payment = await this.paymentRepository.findOne({
      where: { id, userId },
      relations: ['user', 'paymentMethodRelation'],
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
    ensureUserId(userId);

    if (dto.isDefault) {
      await this.paymentMethodRepository.update(
        { userId, isDefault: true },
        { isDefault: false },
      );
    }

    const encryptedMetadata = dto.sensitiveMetadata
      ? encryptMetadata(dto.sensitiveMetadata)
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
    ensureUserId(userId);
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
    ensureUserId(userId);
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
    ensureUserId(userId);
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id, userId },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    await this.paymentMethodRepository.remove(paymentMethod);
  }

  @Locked({
    key: (dto: ProcessStellarRentGatewayDto) =>
      `payment:stellar:rent:${dto.agreementId}`,
    ttlMs: 5000,
  })
  @Idempotent({
    ttlMs: 86_400_000,
    key: (dto: ProcessStellarRentGatewayDto, userId: string) =>
      dto.idempotencyKey
        ? `payment:stellar:rent:${userId}:${dto.idempotencyKey}`
        : null,
    requireKey: false,
  })
  async processStellarRentPayment(
    dto: ProcessStellarRentGatewayDto,
    userId: string,
  ): Promise<Payment> {
    ensureUserId(userId);

    try {
      const callerKeypair = StellarSdk.Keypair.fromSecret(dto.userSecret);
      const transactionHash =
        await this.paymentProcessingService.processRentPayment(
          dto.userAddress,
          dto.agreementId,
          dto.amount,
          callerKeypair,
        );

      const payment = this.paymentRepository.create({
        userId,
        agreementId: dto.agreementId,
        amount: Number(dto.amount),
        transactionFee: 0,
        netAmount: Number(dto.amount),
        currency: 'XLM',
        status: PaymentStatus.COMPLETED,
        referenceNumber: transactionHash,
        processedAt: new Date(),
        metadata: {
          gateway: 'stellar',
          flow: 'rent',
          transactionHash,
          userAddress: dto.userAddress,
          reconciledAt: new Date().toISOString(),
        } as PaymentMetadata,
      });

      const saved = await this.paymentRepository.save(payment);
      void this.fraudHooksService.onPaymentRecorded({
        userId,
        amount: Number(saved.amount),
        currency: saved.currency,
        paymentMethod: saved.paymentMethod ?? undefined,
      });
      await this.notificationsService.notify(
        userId,
        'Stellar rent payment processed',
        `Your rent payment of ${dto.amount} XLM was submitted successfully.`,
        'PAYMENT_RECEIVED',
      );
      return saved;
    } catch (error) {
      const failedPayment = this.paymentRepository.create({
        userId,
        agreementId: dto.agreementId,
        amount: Number(dto.amount),
        transactionFee: 0,
        netAmount: Number(dto.amount),
        currency: 'XLM',
        status: PaymentStatus.FAILED,
        processedAt: new Date(),
        metadata: {
          gateway: 'stellar',
          flow: 'rent',
          userAddress: dto.userAddress,
          error: error instanceof Error ? error.message : 'Payment failed',
        } as PaymentMetadata,
      });
      await this.paymentRepository.save(failedPayment);
      throw error;
    }
  }

  @Locked({
    key: (dto: CreateEscrowGatewayDto, userId: string) =>
      `escrow:deposit:${dto.agreementId ?? userId}`,
    ttlMs: 5000,
  })
  @Idempotent({
    ttlMs: 86_400_000,
    key: (dto: CreateEscrowGatewayDto, userId: string) =>
      dto.idempotencyKey
        ? `escrow:create:${userId}:${dto.idempotencyKey}`
        : null,
    requireKey: false,
  })
  async createEscrowDeposit(
    dto: CreateEscrowGatewayDto,
    userId: string,
  ): Promise<Payment> {
    ensureUserId(userId);

    try {
      const escrow = await this.stellarService.createEscrow({
        sourcePublicKey: dto.sourcePublicKey,
        destinationPublicKey: dto.destinationPublicKey,
        amount: dto.amount,
        expirationDate: dto.expirationDate,
        rentAgreementId: dto.agreementId,
      });

      const payment = this.paymentRepository.create({
        userId,
        agreementId: dto.agreementId ?? null,
        amount: Number(dto.amount),
        transactionFee: 0,
        netAmount: Number(dto.amount),
        currency: 'XLM',
        status: PaymentStatus.PENDING,
        referenceNumber: `escrow:${escrow.id}`,
        processedAt: new Date(),
        metadata: {
          gateway: 'stellar',
          flow: 'escrow_deposit',
          escrowId: escrow.id,
          escrowStatus: escrow.status,
          transactionHash: escrow.blockchainEscrowId,
          sourcePublicKey: dto.sourcePublicKey,
          destinationPublicKey: dto.destinationPublicKey,
        } as PaymentMetadata,
      });

      const saved = await this.paymentRepository.save(payment);
      await this.notificationsService.notify(
        userId,
        'Escrow funded',
        `Your escrow deposit of ${dto.amount} XLM is now tracked under escrow ${escrow.id}.`,
        'PAYMENT_RECEIVED',
      );
      return saved;
    } catch (error) {
      const failedPayment = this.paymentRepository.create({
        userId,
        agreementId: dto.agreementId ?? null,
        amount: Number(dto.amount),
        transactionFee: 0,
        netAmount: Number(dto.amount),
        currency: 'XLM',
        status: PaymentStatus.FAILED,
        processedAt: new Date(),
        metadata: {
          gateway: 'stellar',
          flow: 'escrow_deposit',
          sourcePublicKey: dto.sourcePublicKey,
          destinationPublicKey: dto.destinationPublicKey,
          error:
            error instanceof Error ? error.message : 'Escrow creation failed',
        } as PaymentMetadata,
      });
      await this.paymentRepository.save(failedPayment);
      throw error;
    }
  }

  @Locked({
    key: (escrowId: number) => `escrow:release:${escrowId}`,
    ttlMs: 5000,
  })
  async releaseEscrowDeposit(
    escrowId: number,
    dto: ReleaseEscrowDto,
    userId: string,
  ): Promise<Payment | null> {
    ensureUserId(userId);
    const escrow = await this.stellarService.releaseEscrow({
      escrowId,
      memo: dto.memo,
    });
    return this.syncEscrowPaymentFromState(escrowId, escrow.status, userId, {
      releaseTransactionHash: escrow.releaseTransactionHash,
      reconciledAt: new Date().toISOString(),
    });
  }

  @Locked({
    key: (escrowId: number) => `escrow:refund:${escrowId}`,
    ttlMs: 5000,
  })
  async refundEscrowDeposit(
    escrowId: number,
    dto: RefundEscrowDto,
    userId: string,
  ): Promise<Payment | null> {
    ensureUserId(userId);
    const escrow = await this.stellarService.refundEscrow({
      escrowId,
      reason: dto.reason,
    });
    return this.syncEscrowPaymentFromState(escrowId, escrow.status, userId, {
      refundTransactionHash: escrow.refundTransactionHash,
      refundReason: dto.reason,
      reconciledAt: new Date().toISOString(),
    });
  }

  async reconcileStellarPayments(userId: string, limit = 50) {
    ensureUserId(userId);
    const candidates = await this.paymentRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      take: limit,
    });

    const stellarPayments = candidates.filter((payment) => {
      const metadata = payment.metadata ?? {};
      return (
        payment.currency === 'XLM' ||
        metadata.gateway === 'stellar' ||
        payment.referenceNumber?.startsWith('escrow:')
      );
    });

    let updated = 0;
    let failed = 0;

    for (const payment of stellarPayments) {
      try {
        const flow = String(payment.metadata?.flow ?? '');
        if (flow === 'escrow_deposit' && payment.referenceNumber) {
          const escrowId = this.parseEscrowReference(payment.referenceNumber);
          if (escrowId) {
            const escrow = await this.stellarService.getEscrowById(escrowId);
            const synced = await this.syncEscrowPaymentFromState(
              escrowId,
              escrow.status,
              userId,
              {
                releaseTransactionHash: escrow.releaseTransactionHash,
                refundTransactionHash: escrow.refundTransactionHash,
                reconciledAt: new Date().toISOString(),
              },
            );
            if (synced) updated += 1;
          }
          continue;
        }

        const transactionHash = String(payment.metadata?.transactionHash ?? '');
        if (!transactionHash) {
          continue;
        }

        const tx =
          await this.stellarService.getTransactionByHash(transactionHash);
        const nextStatus =
          tx.status === TransactionStatus.COMPLETED
            ? PaymentStatus.COMPLETED
            : tx.status === TransactionStatus.FAILED
              ? PaymentStatus.FAILED
              : PaymentStatus.PENDING;
        payment.status = nextStatus;
        payment.processedAt ??= new Date();
        payment.metadata = {
          ...(payment.metadata ?? {}),
          reconciledAt: new Date().toISOString(),
          stellarTransactionStatus: tx.status,
          error: tx.errorMessage ?? payment.metadata?.error,
        };
        await this.paymentRepository.save(payment);
        updated += 1;
      } catch (error) {
        failed += 1;
        this.logger.warn(
          `Payment reconciliation failed for ${payment.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }

    return {
      scanned: stellarPayments.length,
      updated,
      failed,
    };
  }

  async retryFailedPayments(userId: string, limit = 20) {
    ensureUserId(userId);
    const failedPayments = await this.paymentRepository.find({
      where: { userId, status: PaymentStatus.FAILED },
      order: { updatedAt: 'DESC' },
      take: limit,
    });

    let retried = 0;
    let skipped = 0;

    for (const payment of failedPayments) {
      if (!payment.paymentMethodRelationId) {
        skipped += 1;
        continue;
      }

      try {
        await this.recordPayment(
          {
            agreementId: payment.agreementId ?? undefined,
            amount: Number(payment.amount),
            paymentMethodId: String(payment.paymentMethodRelationId),
            notes: payment.notes ?? undefined,
            referenceNumber: payment.referenceNumber ?? undefined,
            idempotencyKey: `${payment.id}-retry-${Date.now()}`,
          },
          userId,
        );

        payment.metadata = {
          ...(payment.metadata ?? {}),
          retryAttempts: Number(payment.metadata?.retryAttempts ?? 0) + 1,
        };
        await this.paymentRepository.save(payment);
        retried += 1;
      } catch (error) {
        skipped += 1;
        this.logger.warn(
          `Retry failed for payment ${payment.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }

    return {
      scanned: failedPayments.length,
      retried,
      skipped,
    };
  }

  async handlePaymentGatewayWebhook(dto: PaymentGatewayWebhookDto) {
  async handlePaymentGatewayWebhook(
    dto: PaymentGatewayWebhookDto,
    secretHeader?: string,
  ) {
    const configuredSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
    
    // Require webhook secret in production/staging environments
    if (isProduction && !configuredSecret) {
      this.logger.error('PAYMENT_WEBHOOK_SECRET is required in production/staging');
      throw new InternalServerErrorException('Webhook secret not configured');
    }
    
    // Validate webhook secret if configured
    if (configuredSecret && secretHeader !== configuredSecret) {
      this.logger.warn('Invalid payment webhook secret provided');
      throw new UnauthorizedException('Invalid payment webhook secret');
    }
    
    // Log webhook validation failures for security monitoring
    if (!secretHeader && configuredSecret) {
      this.logger.warn('Webhook received without secret header');
      throw new UnauthorizedException('Webhook signature required');
    }

    const payment = dto.paymentId
      ? await this.paymentRepository.findOne({ where: { id: dto.paymentId } })
      : dto.referenceNumber
        ? await this.paymentRepository.findOne({
            where: { referenceNumber: dto.referenceNumber },
          })
        : null;

    if (!payment) {
      return {
        processed: false,
        reason: 'payment_not_found',
      };
    }

    payment.status = this.mapWebhookStatus(dto.status);
    payment.processedAt ??= new Date();
    payment.metadata = {
      ...(payment.metadata ?? {}),
      webhookEventType: dto.eventType,
      transactionHash:
        dto.transactionHash ?? String(payment.metadata?.transactionHash ?? ''),
      error: dto.error ?? payment.metadata?.error,
      reconciledAt: new Date().toISOString(),
    };
    if (dto.transactionHash) {
      payment.referenceNumber = dto.transactionHash;
    }

    const saved = await this.paymentRepository.save(payment);
    return {
      processed: true,
      payment: saved,
    };
  }

  async getPaymentAnalytics(userId: string) {
    ensureUserId(userId);
    const payments = await this.paymentRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const summary = {
      totalPayments: payments.length,
      totalVolume: 0,
      totalRefunded: 0,
      completedPayments: 0,
      failedPayments: 0,
      pendingPayments: 0,
      byCurrency: {} as Record<string, { count: number; volume: number }>,
      byFlow: {} as Record<string, number>,
    };

    for (const payment of payments) {
      const amount = Number(payment.amount ?? 0);
      const refundedAmount = Number(payment.refundAmount ?? 0);
      summary.totalVolume += amount;
      summary.totalRefunded += refundedAmount;

      if (payment.status === PaymentStatus.COMPLETED)
        summary.completedPayments += 1;
      if (payment.status === PaymentStatus.FAILED) summary.failedPayments += 1;
      if (payment.status === PaymentStatus.PENDING)
        summary.pendingPayments += 1;

      const currency = payment.currency || 'UNKNOWN';
      if (!summary.byCurrency[currency]) {
        summary.byCurrency[currency] = { count: 0, volume: 0 };
      }
      summary.byCurrency[currency].count += 1;
      summary.byCurrency[currency].volume += amount;

      const flow = String(payment.metadata?.flow ?? 'direct');
      summary.byFlow[flow] = (summary.byFlow[flow] ?? 0) + 1;
    }

    return summary;
  }

  private parseEscrowReference(referenceNumber: string): number | null {
    if (referenceNumber?.startsWith('escrow:')) {
      const escrowIdStr = referenceNumber.substring('escrow:'.length);
      const escrowId = parseInt(escrowIdStr, 10);
      return isNaN(escrowId) ? null : escrowId;
    }
    return null;
  }

  private async syncEscrowPaymentFromState(
    escrowId: number,
    status: string,
    userId: string,
    metadata: Record<string, unknown> = {},
  ): Promise<Payment | null> {
    const referenceNumber = `escrow:${escrowId}`;
    const payment = await this.paymentRepository.findOne({
      where: { referenceNumber, userId },
    });

    if (!payment) {
      return null;
    }

    const statusMap: Record<string, PaymentStatus> = {
      active: PaymentStatus.PENDING,
      released: PaymentStatus.COMPLETED,
      refunded: PaymentStatus.REFUNDED,
      failed: PaymentStatus.FAILED,
      expired: PaymentStatus.FAILED,
    };

    payment.status = statusMap[status] ?? PaymentStatus.PENDING;
    payment.metadata = {
      ...(payment.metadata ?? {}),
      ...metadata,
    };
    payment.processedAt ??= new Date();
    return this.paymentRepository.save(payment);
  }
}
