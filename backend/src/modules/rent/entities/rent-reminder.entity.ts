import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ReminderType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum ReminderStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('rent_reminders')
@Index(['agreementId', 'dueDate'])
@Index(['tenantId', 'status'])
export class RentReminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agreement_id' })
  agreementId: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'tenant_email', nullable: true })
  tenantEmail: string;

  @Column({ name: 'due_date', type: 'timestamp' })
  dueDate: Date;

  @Column({ name: 'days_before', type: 'integer' })
  daysBefore: number;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 20, default: ReminderType.EMAIL })
  type: ReminderType;

  @Column({ type: 'boolean', default: false })
  sent: boolean;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'varchar', length: 20, default: ReminderStatus.PENDING })
  status: ReminderStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
