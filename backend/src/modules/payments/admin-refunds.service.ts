import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { User } from '../users/entities/user.entity';
import { AdminRefundDecisionDto } from './dto/admin-refund-decision.dto';

export type AdminRefundStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED';

export interface AdminRefundHistoryEntry {
  id: string;
  action: string;
  message: string;
  actorName: string;
  actorRole: string;
  createdAt: string;
}

export interface AdminRefundRow {
  id: string;
  refundId: string;
  originalPaymentId: string;
  amount: number;
  currency: string;
  status: AdminRefundStatus;
  requesterName: string;
  requesterEmail: string;
  reasonSummary: string;
  requestedAt: string;
  updatedAt: string;
}

export interface AdminRefundDetail extends AdminRefundRow {
  reasonDetail: string;
  paymentMethod: string;
  propertyName?: string;
  agreementReference?: string;
  history: AdminRefundHistoryEntry[];
}

type PaymentMetadataRecord = Record<string, unknown>;

@Injectable()
export class AdminRefundsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async listRefunds(): Promise<AdminRefundRow[]> {
    const payments = await this.paymentRepository
      .createQueryBuilder('payment')
      .where(
        'payment.refund_status != :none OR payment.refund_amount > 0 OR payment.status IN (:...statuses)',
        {
          none: 'none',
          statuses: [PaymentStatus.REFUNDED, PaymentStatus.PARTIAL_REFUND],
        },
      )
      .orderBy('payment.updatedAt', 'DESC')
      .getMany();

    const userById = await this.loadUsersMap(payments.map((p) => p.userId));
    return payments.map((payment) => this.toRow(payment, userById));
  }

  async getRefundById(id: string): Promise<AdminRefundDetail> {
    const payment = await this.paymentRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Refund request not found');
    }

    const userById = await this.loadUsersMap([payment.userId]);
    return this.toDetail(payment, userById);
  }

  async applyDecision(
    paymentId: string,
    dto: AdminRefundDecisionDto,
    adminUserId: string,
  ): Promise<AdminRefundDetail> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Refund request not found');
    }

    const currentStatus = this.toAdminStatus(payment);
    if (currentStatus === 'COMPLETED' || currentStatus === 'REJECTED') {
      throw new BadRequestException('Refund already finalized');
    }

    const metadata = (payment.metadata ?? {}) as PaymentMetadataRecord;
    const now = new Date().toISOString();
    const history = this.getHistory(metadata);

    history.push({
      id: `h-${Date.now()}`,
      action: dto.action === 'approve' ? 'approved' : 'rejected',
      message: dto.notes,
      actorName: adminUserId,
      actorRole: 'admin',
      createdAt: now,
    });

    if (dto.action === 'approve') {
      payment.refundStatus = 'approved';
      payment.status =
        payment.refundAmount > 0
          ? payment.status
          : PaymentStatus.PARTIAL_REFUND;
    } else {
      payment.refundStatus = 'rejected';
    }

    payment.metadata = {
      ...metadata,
      refundHistory: history,
      adminRefundDecision: dto.action,
      adminRefundNotes: dto.notes,
      adminRefundDecidedAt: now,
    };

    await this.paymentRepository.save(payment);

    const userById = await this.loadUsersMap([payment.userId]);
    return this.toDetail(payment, userById);
  }

  private toRow(
    payment: Payment,
    userById: Record<string, User>,
  ): AdminRefundRow {
    const user = userById[payment.userId];
    const status = this.toAdminStatus(payment);
    const refundId = this.getRefundId(payment);
    const reason = payment.refundReason || 'Refund request submitted';

    return {
      id: payment.id,
      refundId,
      originalPaymentId: payment.referenceNumber || payment.id,
      amount: Number(payment.refundAmount || payment.amount || 0),
      currency: payment.currency,
      status,
      requesterName: this.getUserName(user),
      requesterEmail: user?.email || 'unknown@chioma.local',
      reasonSummary: reason.slice(0, 120),
      requestedAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };
  }

  private toDetail(
    payment: Payment,
    userById: Record<string, User>,
  ): AdminRefundDetail {
    const row = this.toRow(payment, userById);
    const metadata = (payment.metadata ?? {}) as PaymentMetadataRecord;
    const history = this.getHistory(metadata);

    return {
      ...row,
      reasonDetail: payment.refundReason || row.reasonSummary,
      paymentMethod: payment.paymentMethod || 'unknown',
      propertyName: this.getMetadataString(metadata, 'propertyName'),
      agreementReference:
        payment.agreementId || this.getMetadataString(metadata, 'agreementId'),
      history,
    };
  }

  private toAdminStatus(payment: Payment): AdminRefundStatus {
    const normalized = (payment.refundStatus || 'none').toLowerCase();
    if (normalized === 'rejected') return 'REJECTED';
    if (normalized === 'approved') return 'APPROVED';
    if (normalized === 'processing') return 'PROCESSING';
    if (
      payment.status === PaymentStatus.REFUNDED ||
      normalized === 'completed' ||
      normalized === 'refunded'
    ) {
      return 'COMPLETED';
    }

    return 'PENDING';
  }

  private getRefundId(payment: Payment): string {
    const metadata = (payment.metadata ?? {}) as PaymentMetadataRecord;
    const metaRefundId = this.getMetadataString(metadata, 'refundId');
    if (metaRefundId) return metaRefundId;
    return `RFD-${payment.id.slice(0, 8).toUpperCase()}`;
  }

  private getHistory(
    metadata: PaymentMetadataRecord,
  ): AdminRefundHistoryEntry[] {
    const raw = metadata.refundHistory;
    if (!Array.isArray(raw)) return [];

    return raw
      .filter((entry) => typeof entry === 'object' && entry !== null)
      .map((entry) => {
        const e = entry as Record<string, unknown>;
        return {
          id: this.readAsString(e.id, `h-${Date.now()}`),
          action: this.readAsString(e.action, 'updated'),
          message: this.readAsString(e.message, ''),
          actorName: this.readAsString(e.actorName, 'system'),
          actorRole: this.readAsString(e.actorRole, 'system'),
          createdAt: this.readAsString(e.createdAt, new Date().toISOString()),
        };
      });
  }

  private async loadUsersMap(userIds: string[]): Promise<Record<string, User>> {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueUserIds.length === 0) return {};

    const users = await this.userRepository.findBy({ id: In(uniqueUserIds) });
    return users.reduce<Record<string, User>>((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});
  }

  private getMetadataString(
    metadata: PaymentMetadataRecord,
    key: string,
  ): string | undefined {
    const value = metadata[key];
    return typeof value === 'string' ? value : undefined;
  }

  private getUserName(user?: User): string {
    if (!user) return 'Unknown User';
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return fullName || user.email || 'Unknown User';
  }

  private readAsString(value: unknown, fallback: string): string {
    return typeof value === 'string' ? value : fallback;
  }
}
