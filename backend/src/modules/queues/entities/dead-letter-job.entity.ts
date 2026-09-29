import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DeadLetterJobStatus } from '../dead-letter.types';

@Entity('dead_letter_jobs')
@Index(['queueName', 'status'])
export class DeadLetterJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'queue_name' })
  queueName: string;

  @Column({ name: 'job_name', default: '__default__' })
  jobName: string;

  @Column({ name: 'original_job_id', nullable: true })
  originalJobId: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  options: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ type: 'text', nullable: true })
  stacktrace: string;

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount: number;

  @Column({ name: 'recovery_attempts', type: 'int', default: 0 })
  recoveryAttempts: number;

  @Column({
    type: 'enum',
    enum: DeadLetterJobStatus,
    default: DeadLetterJobStatus.PENDING,
  })
  status: DeadLetterJobStatus;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
