import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import {
  parsePaymentWebhookDto,
  type PaymentWebhookPayload,
} from './dto/payment-webhook.dto';
import {
  parseRefundWebhookDto,
  type RefundWebhookPayload,
} from './dto/refund-webhook.dto';

@Injectable()
export class PaymentWebhookService {
  private readonly logger = new Logger(PaymentWebhookService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async handlePaymentGatewayWebhook(
    body: unknown,
    secretHeader?: string,
  ) {
    this.assertWebhookSecret(secretHeader);
    const dto = parsePaymentWebhookDto(body);
    return this.applyPaymentWebhook(dto);
  }

  async handleRefundWebhook(body: unknown, secretHeader?: string) {
    this.assertWebhookSecret(secretHeader);
    const dto = parseRefundWebhookDto(body);
    return this.applyRefundWebhook(dto);
  }

  private assertWebhookSecret(secretHeader?: string) {
    const configuredSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    const isProduction =
      process.env.NODE_ENV === 'production' ||
      process.env.NODE_ENV === 'staging';

    if (isProduction && !configuredSecret) {
      this.logger.error(
        'PAYMENT_WEBHOOK_SECRET is required in production/staging',
      );
      throw new InternalServerErrorException('Webhook secret not configured');
    }

    if (configuredSecret && secretHeader !== configuredSecret) {
      this.logger.warn('Invalid payment webhook secret provided');
      throw new UnauthorizedException('Invalid payment webhook secret');
    }

    if (!secretHeader && configuredSecret) {
      this.logger.warn('Webhook received without secret header');
      throw new UnauthorizedException('Webhook signature required');
    }
  }

  private async findPayment(
    paymentId?: string,
    referenceNumber?: string,
  ): Promise<Payment | null> {
    if (paymentId) {
      return this.paymentRepository.findOne({ where: { id: paymentId } });
    }
    if (referenceNumber) {
      return this.paymentRepository.findOne({
        where: { referenceNumber },
      });
    }
    return null;
  }

  private async applyPaymentWebhook(dto: PaymentWebhookPayload) {
    const payment = await this.findPayment(dto.paymentId, dto.referenceNumber);

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

  private async applyRefundWebhook(dto: RefundWebhookPayload) {
    const payment = await this.findPayment(dto.paymentId, dto.referenceNumber);

    if (!payment) {
      return {
        processed: false,
        reason: 'payment_not_found',
      };
    }

    const normalized = dto.status.toLowerCase();
    const completed =
      normalized === 'completed' ||
      normalized === 'successful' ||
      normalized === 'success' ||
      normalized === 'refunded';

    if (completed) {
      if (typeof dto.amount === 'number' && dto.amount > 0) {
        payment.refundAmount = Math.min(
          payment.amount,
          (payment.refundAmount ?? 0) + dto.amount,
        );
      } else {
        payment.refundAmount = payment.amount;
      }
      payment.refundStatus = 'completed';
      payment.refundReason = dto.reason ?? payment.refundReason;
      payment.status =
        payment.refundAmount >= payment.amount
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIAL_REFUND;
    } else if (
      normalized === 'failed' ||
      normalized === 'error' ||
      normalized === 'cancelled'
    ) {
      payment.refundStatus = 'failed';
    } else {
      payment.refundStatus = 'pending';
    }

    payment.metadata = {
      ...(payment.metadata ?? {}),
      webhookEventType: dto.eventType,
      refundId: dto.refundId ?? payment.metadata?.refundId,
      error: dto.error ?? payment.metadata?.error,
      reconciledAt: new Date().toISOString(),
    };

    const saved = await this.paymentRepository.save(payment);
    return {
      processed: true,
      payment: saved,
    };
  }

  private mapWebhookStatus(webhookStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      completed: PaymentStatus.COMPLETED,
      successful: PaymentStatus.COMPLETED,
      success: PaymentStatus.COMPLETED,
      pending: PaymentStatus.PENDING,
      processing: PaymentStatus.PENDING,
      failed: PaymentStatus.FAILED,
      error: PaymentStatus.FAILED,
      refunded: PaymentStatus.REFUNDED,
      cancelled: PaymentStatus.FAILED,
    };
    return statusMap[webhookStatus?.toLowerCase()] ?? PaymentStatus.PENDING;
  }
}
