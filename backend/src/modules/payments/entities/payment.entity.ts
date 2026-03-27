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
  gateway?: string;
  flow?: string;
  transactionHash?: string;
  escrowId?: number;
  escrowStatus?: string;
  reconciledAt?: string;
  retryAttempts?: number;
  webhookEventType?: string;
  error?: string;
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

  @Column({ nullable: true, type: 'varchar' })
  agreementId: string | null; // Reference to agreement (no FK constraint)

  @Column('decimal', { name: 'amount', precision: 12, scale: 2 })
  amount: number;

  @Column('decimal', {
    name: 'transaction_fee',
    precision: 18,
    scale: 2,
    default: 0.0,
  })
  transactionFee: number;

  @Column('decimal', {
    name: 'net_amount',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  netAmount: number;

  @Column({ length: 3, default: 'NGN' })
  currency: string;

  @Column({ default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({
    name: 'payment_method',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  paymentMethod: string;

  @ManyToOne(() => PaymentMethod, { nullable: true })
  paymentMethodRelation: PaymentMethod;

  @Column({ nullable: true })
  paymentMethodRelationId: number;

  @Column({ name: 'receipt_url', type: 'varchar', length: 255, nullable: true })
  receiptUrl: string;

  @Column({ nullable: true, type: 'varchar' })
  referenceNumber: string;

  @Column({
    type: process.env.DB_TYPE === 'sqlite' ? 'datetime' : 'timestamp',
    nullable: true,
  })
  processedAt: Date;

  @Column({ length: 100, nullable: true, type: 'varchar' })
  idempotencyKey: string | null;

  @Column({
    name: 'refund_status',
    type: 'varchar',
    length: 20,
    default: 'none',
  })
  refundStatus: string;

  @Column('decimal', {
    name: 'refund_amount',
    precision: 18,
    scale: 2,
    default: 0.0,
  })
  refundAmount: number;

  @Column({ name: 'refund_reason', type: 'text', nullable: true })
  refundReason: string;

  @Column({
    type: process.env.DB_TYPE === 'sqlite' ? 'text' : 'jsonb',
    nullable: true,
  })
  metadata: PaymentMetadata | null;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
