import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum FeedbackType {
  BUG = 'bug',
  FEATURE = 'feature',
  SUPPORT = 'support',
  GENERAL = 'general',
}

@Entity('feedback')
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

  @CreateDateColumn()
  createdAt: Date;
}
