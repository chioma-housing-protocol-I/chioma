import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { PaymentMethod } from './payment-method.entity';
import { User } from '../../users/entities/user.entity';

export enum PaymentInterval {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export enum PaymentScheduleStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELED = 'canceled',
  FAILED = 'failed',
}

@Entity('payment_schedules')
@Index('idx_payment_schedules_user_id', ['userId'])
@Index('idx_payment_schedules_next_run_at', ['nextRunAt'])
export class PaymentSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @Column({ nullable: true })
  agreementId: string | null;

  @ManyToOne(() => PaymentMethod, { onDelete: 'SET NULL', nullable: true })
  paymentMethod: PaymentMethod | null;

  @Column({ nullable: true })
  paymentMethodId: number | null;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'NGN' })
  currency: string;

  @Column({ type: 'varchar', length: 20 })
  interval: PaymentInterval;

  @Column({ type: 'timestamp' })
  nextRunAt: Date;

  @Column({
    type: 'varchar',
    length: 20,
    default: PaymentScheduleStatus.ACTIVE,
  })
  status: PaymentScheduleStatus;

  @Column({ default: 0 })
  retries: number;

  @Column({ default: 3 })
  maxRetries: number;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
