import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AnchorTransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
}

export enum AnchorTransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('anchor_transactions')
@Index(['walletAddress', 'status'])
@Index(['anchorTransactionId'])
export class AnchorTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'anchor_transaction_id', nullable: true })
  anchorTransactionId: string;

  @Column({
    type: 'enum',
    enum: AnchorTransactionType,
  })
  type: AnchorTransactionType;

  @Column({
    type: 'enum',
    enum: AnchorTransactionStatus,
    default: AnchorTransactionStatus.PENDING,
  })
  status: AnchorTransactionStatus;

  @Column({ type: 'decimal', precision: 20, scale: 7 })
  amount: number;

  @Column({ length: 10 })
  currency: string;

  @Column({ name: 'wallet_address' })
  walletAddress: string;

  @Column({ name: 'payment_method', nullable: true })
  paymentMethod?: string;

  @Column({ type: 'text', nullable: true })
  destination?: string;

  @Column({ name: 'stellar_transaction_id', nullable: true })
  stellarTransactionId?: string;

  @Column({ type: 'text', nullable: true })
  memo?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
