import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum FeedbackType {
  BUG = 'bug',
  FEATURE = 'feature',
  SUPPORT = 'support',
  GENERAL = 'general',
}

export enum FeedbackStatus {
  NEW = 'new',
  REVIEWED = 'reviewed',
  ACTIONED = 'actioned',
}

@Entity('feedback')
@Index('IDX_feedback_status_created_at', ['status', 'createdAt'])
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 50, default: FeedbackType.GENERAL })
  type: FeedbackType;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 20, default: FeedbackStatus.NEW })
  status: FeedbackStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
