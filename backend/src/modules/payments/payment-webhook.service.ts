import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { PaymentGatewayWebhookDto } from './dto/payment-gateway.dto';

@Injectable()
export class PaymentWebhookService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async handlePaymentGatewayWebhook(
    dto: PaymentGatewayWebhookDto,
    secretHeader?: string,
  ) {
    const configuredSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (configuredSecret && secretHeader !== configuredSecret) {
      throw new UnauthorizedException('Invalid payment webhook secret');
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
