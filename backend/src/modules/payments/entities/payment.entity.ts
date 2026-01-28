import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PaymentMethod } from './payment-method.entity';

export type PaymentMetadata = {
  chargeId?: string;
  refundId?: string;
} & Record<string, unknown>;

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIAL_REFUND = 'partial_refund',
}

@Entity('payments')
@Index('idx_payments_user_id', ['userId'])
@Index('idx_payments_processed_at', ['processedAt'])
@Index('uq_payments_user_id_idempotency_key', ['userId', 'idempotencyKey'], {
  unique: true,
})
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @Column({ nullable: true })
  agreementId: string | null; // Reference to agreement

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0.0 })
  feeAmount: number;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  netAmount: number; // Will be computed

  @Column({ length: 3, default: 'NGN' })
  currency: string;

  @Column({ default: PaymentStatus.PENDING })
  status: PaymentStatus; // pending, completed, failed, refunded, partial_refund

  @ManyToOne(() => PaymentMethod, { nullable: true })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true })
  paymentMethodId: number;

  @Column({ nullable: true })
  referenceNumber: string;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @Column({ length: 100, nullable: true })
  idempotencyKey: string | null;

  @Column('decimal', { precision: 12, scale: 2, default: 0.0 })
  refundedAmount: number;

  @Column({ type: 'text', nullable: true })
  refundReason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: PaymentMetadata | null;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
