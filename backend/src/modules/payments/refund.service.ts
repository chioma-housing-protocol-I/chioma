import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { PaymentGatewayService } from './payment-gateway.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ensureUserId } from './payment.helpers';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private readonly paymentGateway: PaymentGatewayService,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  async processRefund(
    paymentId: string,
    dto: ProcessRefundDto,
    userId: string,
  ): Promise<Payment> {
    ensureUserId(userId);

    // Wrap in a transaction with a pessimistic write lock to prevent
    // concurrent refunds from double-spending the same payment. SQLite has
    // no row-level locking support (used by in-memory test databases), so
    // the lock is skipped there rather than failing the query outright.
    const supportsRowLocking = this.dataSource.options?.type !== 'sqlite';

    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: { id: paymentId, userId },
        ...(supportsRowLocking
          ? { lock: { mode: 'pessimistic_write' as const } }
          : {}),
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (payment.status !== PaymentStatus.COMPLETED) {
        throw new BadRequestException(
          'Only completed payments can be refunded',
        );
      }

      // Assert the gateway charge reference exists before any refund work.
      // Without it we cannot tell the gateway which charge to reverse, and
      // proceeding with an undefined chargeId risks crashing the gateway call
      // or refunding against the wrong charge.
      const chargeId = payment.metadata?.chargeId?.trim();
      if (!chargeId) {
        throw new BadRequestException(
          `Cannot process refund: payment ${paymentId} has no gateway charge ID recorded in its metadata`,
        );
      }

      if (dto.amount > payment.amount - payment.refundAmount) {
        throw new BadRequestException('Refund amount exceeds available amount');
      }

      const refundResult = await Promise.resolve(
        this.paymentGateway.processRefund(chargeId, dto.amount),
      );

      if (!refundResult.success) {
        throw new BadRequestException('Refund processing failed');
      }

      payment.refundAmount += dto.amount;
      payment.refundReason = dto.reason;
      payment.refundStatus = 'completed';
      payment.status =
        payment.refundAmount >= payment.amount
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIAL_REFUND;
      payment.metadata = {
        ...(payment.metadata ?? {}),
        refundId: refundResult.refundId,
      };

      const updatedPayment = await manager.save(Payment, payment);
      this.logger.log(`Refund processed for payment: ${paymentId}`);

      await this.notificationsService.notify(
        userId,
        'Refund processed',
        `Your refund of ${dto.amount} ${payment.currency} was processed successfully.`,
        'PAYMENT_REFUNDED',
      );

      return updatedPayment;
    });
  }
}
